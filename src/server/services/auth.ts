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
import { createUser, findByUsername } from "./users";
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
export async function register(input: Omit<Parameters<typeof createUser>[0], "invitedBy" | "attribution"> & { ref?: string }) {
  const { ref, ...fields } = input;
  const inviter = ref ? await findByUsername(ref) : undefined;
  const user = await createUser({ ...fields, invitedBy: inviter?.id, attribution: await takeAttribution() });
  if (inviter) await follow(user.id, inviter.username).catch((err) => console.error("Invite follow failed:", err));
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
  await db.transaction(async (tx) => {
    await tx.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.tokenHash, row.tokenHash));
    await tx
      .update(schema.users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(schema.users.id, row.userId));
  });
  // Anyone holding an old session is signed out.
  await revokeAllSessions(row.userId);
  return row.userId;
}

/** Find or create the user for a verified Google identity. */
export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
}) {
  const byGoogle = await db.query.users.findFirst({ where: eq(schema.users.googleId, profile.sub) });
  if (byGoogle) return { user: byGoogle, created: false };

  if (!profile.emailVerified) throw new HttpError("FORBIDDEN", "Your Google email isn't verified.");
  const byEmail = await db.query.users.findFirst({
    where: sql`lower(${schema.users.email}) = ${profile.email.toLowerCase()}`,
  });
  if (byEmail) {
    // Link Google to the existing account with the same verified email.
    const [user] = await db
      .update(schema.users)
      .set({ googleId: profile.sub })
      .where(eq(schema.users.id, byEmail.id))
      .returning();
    return { user, created: false };
  }

  const base = (profile.email.split("@")[0] || "traveler")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 14)
    .padEnd(3, "0");
  let username = base;
  for (let i = 0; i < 20; i++) {
    const taken = await db.query.users.findFirst({
      columns: { id: true },
      where: sql`lower(${schema.users.username}) = ${username}`,
    });
    if (!taken) break;
    username = `${base}${randomBytes(2).toString("hex")}`;
  }
  const user = await createUser({
    firstName: profile.givenName || "Traveler",
    lastName: profile.familyName || "",
    username,
    email: profile.email.toLowerCase(),
    googleId: profile.sub,
    attribution: await takeAttribution(),
  });
  return { user, created: true };
}
