import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDummyHash, hashPassword, verifyPassword } from "../auth/password";
import { revokeAllSessions, sha256 } from "../auth/session";
import { db, schema } from "../db";
import { env } from "../env";
import { HttpError } from "../http/errors";
import { mailHtml, sendMail } from "./mailer";
import { follow } from "./social";
import { createUser, findByUsername, generateUsername } from "./users";
import { ATTRIBUTION_COOKIE, decodeAttribution } from "@/lib/attribution";

const RESET_TTL_MS = 60 * 60 * 1000;

/** Where this new user first came from (set by src/proxy.ts); the cookie has done its job after sign-up. */
async function takeAttribution() {
  const jar = await cookies();
  const attribution = decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value);
  jar.delete(ATTRIBUTION_COOKIE);
  return attribution;
}

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email.toLowerCase()}` });
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError("UNAUTHENTICATED", "Incorrect email or password.");
  return user;
}

/**
 * Sign up. With `ref` (an invite link's username), the new user is linked to whoever
 * invited them and follows them right away — a request if that profile is private.
 */
/** Invite links (/register?ref=<username>): the new user is credited to and follows the inviter. */
async function followInviter(userId: string, inviter: { username: string } | null | undefined) {
  if (inviter) await follow(userId, inviter.username).catch((err) => console.error("Invite follow failed:", err));
}

export async function register(input: { email: string; password: string; ref?: string }) {
  const { ref, email, password } = input;
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
  });
  await followInviter(user.id, inviter);
  return user;
}

/** Always succeeds from the caller's point of view (no account enumeration). */
export async function requestPasswordReset(email: string) {
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email.toLowerCase()}` });
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
    await tx.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, row.userId));
  });
  // Anyone holding an old session is signed out.
  await revokeAllSessions(row.userId);
  return row.userId;
}

/** Find or create the user for a verified Google identity. */
export async function upsertGoogleUser(
  profile: { sub: string; email: string; emailVerified: boolean; givenName: string; familyName: string },
  ref?: string,
) {
  const byGoogle = await db.query.users.findFirst({ where: eq(schema.users.googleId, profile.sub) });
  if (byGoogle) return { user: byGoogle, created: false };

  if (!profile.emailVerified) throw new HttpError("FORBIDDEN", "Your Google email isn't verified.");
  const byEmail = await db.query.users.findFirst({
    where: sql`lower(${schema.users.email}) = ${profile.email.toLowerCase()}`,
  });
  if (byEmail) {
    // Link Google to the existing account with the same verified email. Sign-up doesn't verify
    // emails, so whoever created this account may not own the address: drop the password and
    // every session it has, so only the Google owner is left in (they can set a password again).
    const [user] = await db
      .update(schema.users)
      .set({ googleId: profile.sub, passwordHash: null })
      .where(eq(schema.users.id, byEmail.id))
      .returning();
    await revokeAllSessions(byEmail.id);
    return { user, created: false };
  }

  const inviter = ref ? await findByUsername(ref) : undefined;
  const user = await createUser({
    firstName: profile.givenName || "Traveler",
    lastName: profile.familyName || "",
    username: await generateUsername(profile.email),
    email: profile.email.toLowerCase(),
    googleId: profile.sub,
    invitedBy: inviter?.id,
    attribution: await takeAttribution(),
  });
  await followInviter(user.id, inviter);
  return { user, created: true };
}

/** Find or create the user for a Facebook identity. Facebook only returns confirmed emails. */
export async function upsertFacebookUser(
  profile: { id: string; email: string | null; firstName: string; lastName: string },
  ref?: string,
) {
  const byFacebook = await db.query.users.findFirst({ where: eq(schema.users.facebookId, profile.id) });
  if (byFacebook) return { user: byFacebook, created: false };

  // Phone-only Facebook accounts have no email, and every account here needs one.
  if (!profile.email) throw new HttpError("VALIDATION", "Your Facebook account has no email address.", "email");
  const byEmail = await db.query.users.findFirst({
    where: sql`lower(${schema.users.email}) = ${profile.email.toLowerCase()}`,
  });
  if (byEmail) {
    // Same as Google: whoever created this account may not own the address, so drop the
    // password and every session it has, leaving only the Facebook owner signed in.
    const [user] = await db
      .update(schema.users)
      .set({ facebookId: profile.id, passwordHash: null })
      .where(eq(schema.users.id, byEmail.id))
      .returning();
    await revokeAllSessions(byEmail.id);
    return { user, created: false };
  }

  const inviter = ref ? await findByUsername(ref) : undefined;
  const user = await createUser({
    firstName: profile.firstName || "Traveler",
    lastName: profile.lastName || "",
    username: await generateUsername(profile.email),
    email: profile.email.toLowerCase(),
    facebookId: profile.id,
    invitedBy: inviter?.id,
    attribution: await takeAttribution(),
  });
  await followInviter(user.id, inviter);
  return { user, created: true };
}
