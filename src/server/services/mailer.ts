import "server-only";
import { env } from "../env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body; the text body is always sent too. */
  html?: string;
}

// Reserved domains (RFC 2606) — seeded test accounts use these and can't receive mail.
const UNDELIVERABLE = /@(.+\.)?(example\.(com|org|net)|[^@]+\.test)$/i;

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise prints the email
 * to the server console (local development). Never throws: a failed send is
 * logged, so callers like "forgot password" respond the same either way.
 */
export async function sendMail(mail: Mail) {
  if (!env.mail.resendApiKey || UNDELIVERABLE.test(mail.to)) {
    console.info(`\n📧  Email to ${mail.to}\n    ${mail.subject}\n\n${mail.text.replace(/^/gm, "    ")}\n`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.mail.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.mail.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`Resend rejected email "${mail.subject}": ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`Resend send failed for "${mail.subject}":`, err);
  }
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A simple branded email: greeting, paragraphs, one button. */
export function mailHtml({ greeting, lines, button, footer }: { greeting: string; lines: string[]; button: { label: string; url: string }; footer: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:22px;font-weight:700;padding-bottom:20px"><span style="color:#003180">Trip</span><span style="color:#06a6f2">folio</span></td></tr>
<tr><td style="font-size:16px;line-height:1.6">
<p style="margin:0 0 12px">${escape(greeting)}</p>
${lines.map((l) => `<p style="margin:0 0 12px">${escape(l)}</p>`).join("")}
<p style="margin:24px 0"><a href="${escape(button.url)}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escape(button.label)}</a></p>
<p style="margin:0;font-size:13px;color:#64748b">${escape(footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
}
