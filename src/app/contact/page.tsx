import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog-shell";
import { CONTACT_EMAIL } from "@/components/legal";
import { breadcrumbs, jsonLd, ORGANIZATION_ID, shareImage } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

const TITLE = "Contact Tripfolio";
const DESCRIPTION = "How to reach Tripfolio (trip-folio.com): questions, bug reports, privacy requests and press.";

export const metadata: Metadata = {
  title: `${TITLE} | trip-folio.com`,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: { type: "website", url: "/contact", title: TITLE, description: DESCRIPTION, images: [shareImage] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [shareImage] },
};

const contactPage = {
  "@type": "ContactPage",
  "@id": `${siteUrl}/contact`,
  url: `${siteUrl}/contact`,
  name: TITLE,
  description: DESCRIPTION,
  about: { "@id": ORGANIZATION_ID },
};

export default function ContactPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(contactPage, breadcrumbs(["Contact", "/contact"])) }} />
      <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">Contact Tripfolio</h1>
      <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_strong]:text-fg">
        <p>
          The best way to reach Tripfolio is by email: {mail}. Messages go straight to Meir Yoshvayev, who makes Tripfolio.
        </p>
        <ul className="grid list-disc gap-1.5 pl-6">
          <li>
            <strong>Questions and ideas:</strong> what you&apos;d like the map to do next.
          </li>
          <li>
            <strong>Bugs:</strong> what you did, what happened, and the device and browser you used.
          </li>
          <li>
            <strong>Your account and data:</strong> write from the email address on your account. You can also delete your account
            yourself in Settings. See the <Link href="/privacy">privacy policy</Link> for what we keep and why.
          </li>
          <li>
            <strong>Can&apos;t sign in?</strong> Use <Link href="/forgot-password">Forgot password</Link> to set a new password by
            email, or write to us.
          </li>
        </ul>
        <p>
          Want to know more about who&apos;s behind Tripfolio? Read the <Link href="/about">about page</Link>.
        </p>
      </div>
    </BlogShell>
  );
}
