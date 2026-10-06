import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDummyHash, hashPassword, verifyPassword } from "../auth/password";
import { revokeAllSessions, sha256 } from "../auth/session";
import { db, schema } from "../db";
import { env } from "../env";
import { HttpError } from "../http/errors";
import { sendMail } from "./mailer";
import { createUser } from "./users";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email.toLowerCase()}` });
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError("UNAUTHENTICATED", "Incorrect email or password.");
  return user;
}

export { createUser as register };

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
  await sendMail({
    to: user.email,
    subject: "Reset your Travora password",
    text: `Hi ${user.firstName},\n\nReset your password here (valid for 1 hour):\n${env.appUrl}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
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
  });
  return { user, created: true };
}
