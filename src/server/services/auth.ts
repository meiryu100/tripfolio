import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDummyHash, hashPassword, verifyPassword } from "../auth/password";
import { revokeAllSessions, sha256 } from "../auth/session";
import { db, schema } from "../db";
import type { UserRow } from "../db/schema";
import { env } from "../env";
import { HttpError } from "../http/errors";
import { ACCOUNT_LIMITS, rateLimit } from "../http/rate-limit";
import { mailHtml, sendMail } from "./mailer";
import { follow } from "./social";
import { createUser, findByUsername, generateUsername, sendSecurityNotice } from "./users";
import { sendVerification } from "./verification";
import { ATTRIBUTION_COOKIE, decodeAttribution } from "@/lib/attribution";
import { deviceFromUserAgent } from "@/lib/device";

const RESET_TTL_MS = 60 * 60 * 1000;

const findByEmail = (email: string) =>
  db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email.toLowerCase()}` });

/**
 * Caps emails sent to one address, whoever asks for them, with a separate count per kind so
 * requests of one kind can't use up another's (sign-up spam shouldn't block a password reset).
 * Over the cap it returns false and the caller skips the send but answers as usual: an error
 * would only tell a stranger they had found the limit, and the owner would be left with it.
 */
async function mayEmail(kind: "signup" | "verify" | "reset", email: string) {
  try {
    await rateLimit(`email:${kind}:${email.toLowerCase()}`, ACCOUNT_LIMITS.email);
    return true;
  } catch (err) {
    if (err instanceof HttpError && err.code === "RATE_LIMITED") return false;
    throw err;
  }
}

/** Phone, tablet or computer: the browser the sign-up request came from. */
async function signupDevice() {
  return deviceFromUserAgent((await headers()).get("user-agent"));
}

/** Where this new user first came from (set by src/proxy.ts); the cookie has done its job after sign-up. */
async function takeAttribution() {
  const jar = await cookies();
  const attribution = decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value);
  jar.delete(ATTRIBUTION_COOKIE);
  return attribution;
}

export async function login(email: string, password: string) {
  // Per account as well as per IP, so guesses spread over many IPs still hit a wall.
  await rateLimit(`login:${email.toLowerCase()}`, ACCOUNT_LIMITS.login);
  const user = await findByEmail(email);
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError("UNAUTHENTICATED", "Incorrect email or password.");
  // Only after the right password, so this doesn't reveal which emails have accounts.
  if (!user.emailVerifiedAt)
    throw new HttpError("EMAIL_UNVERIFIED", "Please confirm your email first — we sent you a link.", "email");
  return user;
}

/** Invite links (/register?ref=<username>): the new user is credited to and follows the inviter. */
async function followInviter(userId: string, inviter: { username: string } | null | undefined) {
  if (inviter) await follow(userId, inviter.username).catch((err) => console.error("Invite follow failed:", err));
}

/**
 * Sign up. Nobody is signed in here: we email a link, and the account opens once it's clicked
 * (`verifyEmail`). The caller answers the same way whether or not the email already has an
 * account, so sign-up can't be used to check who uses Tripfolio — an existing owner gets an
 * email instead. With `ref` (an invite link's username), the new user is linked to whoever
 * invited them and follows them right away — a request if that profile is private.
 */
export async function register(input: { email: string; password: string; ref?: string }) {
  const { ref, email, password } = input;
  if (!(await mayEmail("signup", email))) return;
  const existing = await findByEmail(email);

  if (existing?.emailVerifiedAt) {
    await hashPassword(password); // same work as a real sign-up, so timing doesn't tell either
    await sendAlreadyRegistered(existing);
    return;
  }
  if (existing) {
    // An unconfirmed sign-up for this address: whoever confirms it now uses this password.
    // Older links stop working, so only the newest email opens the account.
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(schema.users.id, existing.id));
    await sendVerification(existing, existing.email);
    return;
  }

  const inviter = ref ? await findByUsername(ref) : undefined;
  // Name and username are asked for in onboarding; until then use placeholders, like Google sign-up.
  const user = await createUser({
    firstName: "Traveler",
    lastName: "",
    username: await generateUsername(email),
    email,
    password,
    invitedBy: inviter?.id,
    attribution: await takeAttribution(),
    device: await signupDevice(),
  });
  await followInviter(user.id, inviter);
  await sendVerification(user, user.email);
}

async function sendAlreadyRegistered(user: { email: string; firstName: string }) {
  const url = `${env.appUrl}/login`;
  await sendMail({
    to: user.email,
    subject: "You already have a Tripfolio account",
    text: `Hi ${user.firstName},\n\nSomeone (hopefully you) tried to sign up to Tripfolio with this email, but you already have an account. Log in here:\n${url}\n\nForgot your password? Use "Forgot password?" on that page. If it wasn't you, you can ignore this email.`,
    html: mailHtml({
      greeting: `Hi ${user.firstName},`,
      lines: [
        "Someone (hopefully you) tried to sign up to Tripfolio with this email, but you already have an account.",
        'Forgot your password? Use "Forgot password?" on the login page.',
      ],
      button: { label: "Log in", url },
      footer: "If it wasn't you, you can ignore this email — nothing has changed.",
    }),
  });
}

/** "Send the link again". Always succeeds from the caller's point of view (no account enumeration). */
export async function resendVerification(email: string) {
  if (!(await mayEmail("verify", email))) return;
  const user = await findByEmail(email);
  if (user && !user.emailVerifiedAt) await sendVerification(user, user.email);
}

/** The user clicked the link in their email: confirm the address and return them, to sign in. */
export async function verifyEmail(token: string) {
  const invalid = () => new HttpError("VALIDATION", "This link is invalid or has expired.", "token");
  const t = schema.emailVerifications;
  // Claim the link atomically, so the same link can't be used twice at once.
  const [row] = await db
    .update(t)
    .set({ usedAt: new Date() })
    .where(and(eq(t.tokenHash, sha256(token)), isNull(t.usedAt), gt(t.expiresAt, new Date())))
    .returning();
  if (!row) throw invalid();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
  if (!user) throw invalid();

  // Confirming a change of email (Settings → Change Email): the new address becomes the login.
  if (user.pendingEmail?.toLowerCase() === row.email) {
    const taken = await findByEmail(row.email);
    if (taken && taken.id !== user.id)
      throw new HttpError("CONFLICT", "Another account is using this email now. Change your email again in Settings.", "token");
    const [changed] = await db
      .update(schema.users)
      .set({ email: user.pendingEmail, pendingEmail: null, emailVerifiedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    await sendSecurityNotice(user, "email address"); // to the old address
    return changed;
  }

  // Confirming the sign-up address. A link to any other address (e.g. a change that was replaced since) proves nothing.
  if (user.email.toLowerCase() !== row.email) throw invalid();
  if (user.emailVerifiedAt) return user;
  const [verified] = await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.id, user.id))
    .returning();
  return verified;
}

/** Always succeeds from the caller's point of view (no account enumeration). */
export async function requestPasswordReset(email: string) {
  if (!(await mayEmail("reset", email))) return;
  const user = await findByEmail(email);
  if (!user) return;
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResets).values({
    tokenHash: sha256(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  const url = `${env.appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Tripfolio password",
    text: `Hi ${user.firstName},\n\nReset your password here (valid for 1 hour):\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: mailHtml({
      greeting: `Hi ${user.firstName},`,
      lines: ["We got a request to reset your Tripfolio password. The link is valid for 1 hour."],
      button: { label: "Reset password", url },
      footer: "If you didn't ask for this, you can ignore this email — your password won't change.",
    }),
  });
}

export async function resetPassword(token: string, password: string) {
  const row = await db.query.passwordResets.findFirst({
    where: and(
      eq(schema.passwordResets.tokenHash, sha256(token)),
      isNull(schema.passwordResets.usedAt),
      gt(schema.passwordResets.expiresAt, new Date()),
    ),
  });
  if (!row) throw new HttpError("VALIDATION", "This reset link is invalid or has expired.", "token");
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    // Claim the link atomically, so the same link can't be used twice at once.
    const [claimed] = await tx
      .update(schema.passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.tokenHash, row.tokenHash), isNull(schema.passwordResets.usedAt)))
      .returning({ userId: schema.passwordResets.userId });
    if (!claimed) throw new HttpError("VALIDATION", "This reset link is invalid or has expired.", "token");
    // Any other reset links sent to this user stop working too.
    await tx
      .update(schema.passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.userId, row.userId), isNull(schema.passwordResets.usedAt)));
    // The reset link reached their inbox, so it also confirms the email.
    await tx
      .update(schema.users)
      .set({ passwordHash, emailVerifiedAt: sql`coalesce(${schema.users.emailVerifiedAt}, now())` })
      .where(eq(schema.users.id, row.userId));
  });
  // Anyone holding an old session is signed out.
  await revokeAllSessions(row.userId);
  return row.userId;
}

/**
 * Google proved this person owns the email of an existing account: link them to it.
 * If that account never confirmed its email, whoever created it may not own the address, so its
 * password and every session go, leaving only the provider's owner signed in (they can set a
 * password again). A confirmed account is the same person, so it keeps its password.
 */
async function linkProvider(user: UserRow, ids: { googleId: string }) {
  const confirmed = Boolean(user.emailVerifiedAt);
  const [linked] = await db
    .update(schema.users)
    .set({ ...ids, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), ...(confirmed ? {} : { passwordHash: null }) })
    .where(eq(schema.users.id, user.id))
    .returning();
  if (!confirmed) await revokeAllSessions(user.id);
  return linked;
}

/** Find or create the user for a verified Google identity. */
export async function upsertGoogleUser(
  profile: { sub: string; email: string; emailVerified: boolean; givenName: string; familyName: string },
  ref?: string,
) {
  const byGoogle = await db.query.users.findFirst({ where: eq(schema.users.googleId, profile.sub) });
  if (byGoogle) return { user: byGoogle, created: false };

  if (!profile.emailVerified) throw new HttpError("FORBIDDEN", "Your Google email isn't verified.");
  const byEmail = await findByEmail(profile.email);
  if (byEmail) return { user: await linkProvider(byEmail, { googleId: profile.sub }), created: false };

  const inviter = ref ? await findByUsername(ref) : undefined;
  const user = await createUser({
    firstName: profile.givenName || "Traveler",
    lastName: profile.familyName || "",
    username: await generateUsername(profile.email),
    email: profile.email.toLowerCase(),
    googleId: profile.sub,
    emailVerified: true,
    invitedBy: inviter?.id,
    attribution: await takeAttribution(),
    device: await signupDevice(),
  });
  await followInviter(user.id, inviter);
  return { user, created: true };
}
