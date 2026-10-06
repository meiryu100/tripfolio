import "server-only";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Development mailer: prints emails to the server console. Replace the body
 * with a provider (Resend, SES, Postmark…) for production — the call sites
 * don't change.
 */
export async function sendMail(mail: Mail) {
  console.info(`\n📧  Email to ${mail.to}\n    ${mail.subject}\n\n${mail.text.replace(/^/gm, "    ")}\n`);
}
