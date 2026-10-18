import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { sha256 } from "../auth/session";
import { db, schema } from "../db";
import { env } from "../env";
import { mailHtml, sendMail } from "./mailer";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const COPY = {
  signup: {
    subject: "Confirm your email for Tripfolio",
    line: "Confirm your email to open your Tripfolio account",
    footer: "If you didn't sign up, you can ignore this email — no account will be opened.",
  },
  change: {
    subject: "Confirm your new email for Tripfolio",
    line: "Confirm this address to make it the email you log in to Tripfolio with",
    footer: "If you didn't ask for this, you can ignore this email — your account keeps its current email.",
  },
};

/**
 * Email a one-time link that confirms `email` for this user; earlier links stop working.
 * `change`: the address is a new one from Settings → Change Email, not the sign-up address.
 */
export async function sendVerification(user: { id: string; firstName: string }, email: string, kind: keyof typeof COPY = "signup") {
  const copy = COPY[kind];
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
    subject: copy.subject,
    text: `Hi ${name},\n\n${copy.line} (the link is valid for 24 hours):\n${url}\n\n${copy.footer}`,
    html: mailHtml({
      greeting: `Hi ${name},`,
      lines: [`${copy.line}. The link is valid for 24 hours.`],
      button: { label: "Confirm my email", url },
      footer: copy.footer,
    }),
  });
}
