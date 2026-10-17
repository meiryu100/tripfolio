import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { sha256 } from "../auth/session";
import { db, schema } from "../db";
import { env } from "../env";
import { mailHtml, sendMail } from "./mailer";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Email a one-time link that confirms `email` for this user; earlier links stop working. */
export async function sendVerification(user: { id: string; firstName: string }, email: string) {
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.emailVerifications)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.emailVerifications.userId, user.id), isNull(schema.emailVerifications.usedAt)));
    await tx.insert(schema.emailVerifications).values({
      tokenHash: sha256(token),
      userId: user.id,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    });
  });
  const url = `${env.appUrl}/verify-email?token=${token}`;
  const name = user.firstName === "Traveler" ? "there" : user.firstName;
  await sendMail({
    to: email,
    subject: "Confirm your email for Tripfolio",
    text: `Hi ${name},\n\nConfirm your email to open your Tripfolio account (the link is valid for 24 hours):\n${url}\n\nIf you didn't sign up, you can ignore this email.`,
    html: mailHtml({
      greeting: `Hi ${name},`,
      lines: ["Confirm your email to open your Tripfolio account. The link is valid for 24 hours."],
      button: { label: "Confirm my email", url },
      footer: "If you didn't sign up, you can ignore this email — no account will be opened.",
    }),
  });
}
