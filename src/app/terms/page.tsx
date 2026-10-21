import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal";
import { shareImage } from "@/lib/seo";

const TITLE = "Terms of Service";
const DESCRIPTION = "The rules for using Tripfolio: your account, your content, acceptable use and how to end your account.";

export const metadata: Metadata = {
  title: `${TITLE} | Tripfolio`,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { type: "website", url: "/terms", title: TITLE, description: DESCRIPTION, images: [shareImage] },
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: "who-can-use",
    title: "Who can use Tripfolio",
    body: <p>You must be at least 16 years old to use Tripfolio. By creating an account or using the service, you agree to these terms.</p>,
  },
  {
    id: "your-account",
    title: "Your account",
    body: (
      <>
        <p>
          Give us accurate information and keep your password safe. You are responsible for what happens under your account, so tell us
          right away at {mail} if you think someone else is using it. One person, one account, please.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          What you add — your map, trips, stories, photos, bio and messages — stays yours. To run Tripfolio, you give us a limited,
          non-exclusive license to store, process and show that content, only as needed to provide the service and only as your privacy
          settings allow. The license ends when you delete the content or your account, apart from short-lived backups.
        </p>
        <p>
          Only upload things you have the right to share. Please don&apos;t upload photos that show other people in a way that could
          embarrass or endanger them.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Please don&apos;t:</p>
        <ul>
          <li>harass, threaten or bully anyone, or post hateful content;</li>
          <li>send spam or unwanted promotions, or create accounts in bulk;</li>
          <li>post illegal content, or content that sexualizes or endangers minors;</li>
          <li>impersonate another person or pretend to be Tripfolio;</li>
          <li>scrape or copy data from Tripfolio automatically, or overload the service;</li>
          <li>try to break, probe or get around our security, or access other people&apos;s accounts;</li>
          <li>use Tripfolio in a way that breaks the law.</li>
        </ul>
        <p>To report a problem, use the report option in chats, or email {mail}.</p>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Removing content and suspending accounts",
    body: (
      <p>
        We may remove content or suspend or close accounts that break these rules or put others at risk. When we reasonably can, we&apos;ll
        tell you why.
      </p>
    ),
  },
  {
    id: "as-is",
    title: "The service is provided “as is”",
    body: (
      <p>
        Tripfolio is free, and we do our best to keep it running and useful, but we provide it &quot;as is&quot; and &quot;as
        available&quot;, without promises that it will always be available, error-free or fit for a particular purpose. Features may
        change or be removed. Please keep your own copies of photos and anything else you can&apos;t lose.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the extent the law allows, Tripfolio and the person who runs it are not liable for indirect or consequential losses, or for
        lost data, arising from your use of the service. Our total liability for any claim is limited to the amount you paid us for the
        service, which, while Tripfolio is free, is zero. Nothing here limits rights you have by law that can&apos;t be limited.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending your account",
    body: (
      <p>
        You can delete your account at any time in <Link href="/settings#account">Settings</Link>. What is removed is described in our{" "}
        <Link href="/privacy#delete-your-data">Privacy Policy</Link>. We may also end or suspend your account as described above.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. When we make an important change, we&apos;ll tell you in the app or by email. If you keep using
        Tripfolio after a change takes effect, you accept the new terms. The date at the top shows when they were last updated.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the State of Israel, and the courts of Israel have exclusive jurisdiction, without
        affecting any mandatory consumer rights you have where you live.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Tripfolio, run by Meir Yoshvayev, Israel. Email: {mail}. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title={TITLE}
      intro={<p>These are the simple rules for using Tripfolio. Please read them before you create an account.</p>}
      sections={SECTIONS}
    />
  );
}
