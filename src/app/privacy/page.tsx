import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal";
import { COOKIE_DETAILS } from "@/lib/consent";

const TITLE = "Privacy Policy";
const DESCRIPTION = "What Tripfolio collects, why, who sees it, how long we keep it, and how to delete your account and data.";

export const metadata: Metadata = {
  title: `${TITLE} | Tripfolio`,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", url: "/privacy", title: TITLE, description: DESCRIPTION },
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          Tripfolio (www.trip-folio.com) is a free travel map app run by Meir Yoshvayev, from Israel. In this policy, &quot;we&quot; and
          &quot;us&quot; mean Tripfolio, and we are the controller of the personal data described here.
        </p>
        <p>Questions about your data? Write to {mail}.</p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect and why",
    body: (
      <>
        <p>We collect only what the app needs to work:</p>
        <ul>
          <li>
            <strong>Your account:</strong> email address, first and last name, username, gender, and (if you add them) a bio, location,
            website and profile picture. We use these to run your account and show your profile.
          </li>
          <li>
            <strong>Your password:</strong> stored only as a one-way hash, never in plain text. If you sign in with Google or Facebook
            you may have no password at all.
          </li>
          <li>
            <strong>Google and Facebook sign-in:</strong> if you choose it, we receive your email, name and that service&apos;s account
            ID, and store the ID so we can recognise you next time. We don&apos;t post anything on your behalf.
          </li>
          <li>
            <strong>Your travel data:</strong> the countries and US states you mark as visited or want to visit, and your trips (country,
            title, dates, cities and story).
          </li>
          <li>
            <strong>Your photos:</strong> trip photos and photos you send in chats. Before we store a photo we re-encode it and remove
            its location data (EXIF/GPS). Photos are kept in private storage and shown only through short-lived links, to people
            who are allowed to see them.
          </li>
          <li>
            <strong>Social activity:</strong> who you follow and who follows you (including pending follow requests), blocks, a feed of
            your activity (countries marked, trips added) and your notifications.
          </li>
          <li>
            <strong>Messages:</strong> direct messages and message requests between users. We don&apos;t read them; they are visible only
            to the people in the chat. If someone reports a message, we keep a copy of it so we can review the report.
          </li>
          <li>
            <strong>Sessions:</strong> when you sign in we store a hashed session token, your device and browser description (user
            agent), your IP address and when it was last used, so you can see and end your active sessions in Settings.
          </li>
          <li>
            <strong>Sign-up source:</strong> if you accept all cookies, we remember the link or website that brought you to Tripfolio
            (for example campaign tags such as utm_source, or the referring site) and save it on your account when you sign up. We use it
            to learn which channels bring people in. If you chose &quot;Essential only&quot;, we don&apos;t record it. If you joined from
            a friend&apos;s invite link, we remember who invited you.
          </li>
          <li>
            <strong>Technical data for security:</strong> short-lived counters keyed by IP address or email address that limit repeated
            sign-in and sign-up attempts. They are deleted automatically when their time window ends.
          </li>
          <li>
            <strong>Emails we send you:</strong> confirming your email address, resetting your password, security notices (such as a
            changed email or password), and, only if you turn them on in Settings, notification emails.
          </li>
        </ul>
        <p>
          We count page visits with Vercel Web Analytics, which uses no cookies and stores nothing in your browser: it records the page
          (without its query, except campaign tags), the referring site, and your country and device type, and it doesn&apos;t identify
          you. We do not use advertising or tracking tools, and we don&apos;t run analytics cookies.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <p>This is everything Tripfolio stores in your browser:</p>
        <ul>
          {COOKIE_DETAILS.map((c) => (
            <li key={c.name}>
              <strong className="font-mono text-base">{c.name}</strong> ({c.necessary ? "essential" : "optional, only with your OK"},{" "}
              {c.duration.toLowerCase()}): {c.why}
            </li>
          ))}
        </ul>
        <p>You can change your choice at any time with &quot;Cookie settings&quot; in the footer of the home page or in Settings.</p>
      </>
    ),
  },
  {
    id: "who-sees-what",
    title: "Who sees what",
    body: (
      <>
        <p>You are in control of your profile:</p>
        <ul>
          <li>
            <strong>Public profile:</strong> anyone with the link, including people who aren&apos;t signed in, can see your map, stats,
            trips and photos, except the parts you hide.
          </li>
          <li>
            <strong>Private profile:</strong> only people you approve as followers see your map and trips. Everyone else sees just your
            name, username and picture.
          </li>
          <li>
            <strong>Separate switches</strong> in Settings let you hide your visited countries, wishlist, trips or photos on their own.
          </li>
          <li>
            <strong>Never shown to others:</strong> your email address, password, IP address, sessions and messages.
          </li>
        </ul>
        <p>
          Your name, username, picture and activity can show up in other people&apos;s search results, follower lists and feeds, as your
          settings allow.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "Service providers",
    body: (
      <>
        <p>We use a few companies to run Tripfolio. They process data only on our behalf:</p>
        <ul>
          <li>
            <strong>Vercel:</strong> hosting of the website and app.
          </li>
          <li>
            <strong>Neon:</strong> the database that holds your account and travel data.
          </li>
          <li>
            <strong>Cloudflare R2:</strong> private storage for photos.
          </li>
          <li>
            <strong>Resend:</strong> sending our emails.
          </li>
          <li>
            <strong>Google and Facebook (Meta):</strong> only if you sign in with them.
          </li>
        </ul>
        <p>
          These providers may process data outside Israel and the EU, including in the United States. We <strong>don&apos;t sell your
          data</strong>, we don&apos;t share it with advertisers, and we don&apos;t show ads. We may disclose data if the law requires it.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep your data",
    body: (
      <>
        <ul>
          <li>Your account and content stay until you delete them or delete your account.</li>
          <li>Sessions expire after 30 days without use, and you can end them earlier in Settings.</li>
          <li>Password-reset and email-confirmation links expire and can be used once.</li>
          <li>Attempt counters for security are deleted when their time window ends.</li>
          <li>Backups kept by our database provider may hold deleted data for a short time before they are overwritten.</li>
        </ul>
      </>
    ),
  },
  {
    id: "delete-your-data",
    title: "How to delete your account and data",
    body: (
      <>
        <p>
          You can delete your account yourself at any time: sign in, open <Link href="/settings#account">Settings</Link>, choose{" "}
          <strong>Delete Account</strong>, then confirm with your password (if you have one) and your username.
        </p>
        <p>Deleting your account permanently removes:</p>
        <ul>
          <li>your profile, email, name and sign-in details (including linked Google or Facebook IDs);</li>
          <li>your visited countries, wishlist, US states and trips;</li>
          <li>your photos and profile picture, from our storage as well as the database;</li>
          <li>your follows, followers, blocks, notifications, feed activity and sessions;</li>
          <li>your conversations and chat photos (for both sides of each chat).</li>
        </ul>
        <p>This can&apos;t be undone.</p>
        <p>
          If you can&apos;t sign in, or you signed up with Facebook and want your data removed, email {mail} from the address on your
          account, and we will delete it for you.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Under Israeli privacy law, and under the GDPR if you are in the European Union or the UK, you can ask us to give you access to
          your data, correct it, delete it, restrict or object to how we use it, and send you a copy (export). You can edit most of your
          data yourself in the app. For anything else, or for an export, email {mail} and we&apos;ll reply within 30 days.
        </p>
        <p>
          If you are in the EU or UK and think we handled your data wrongly, you can also complain to your local data protection
          authority. In Israel, that is the Privacy Protection Authority.
        </p>
      </>
    ),
  },
  {
    id: "age",
    title: "Minimum age",
    body: <p>Tripfolio is for people aged 16 and over. If you think a child under 16 has an account, tell us and we will delete it.</p>,
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect your data with encrypted connections (HTTPS), hashed passwords, private photo storage with short-lived links, session
        controls, and limits on repeated sign-in attempts. No online service is perfectly secure, so please use a strong, unique password.
        If you find a security problem, please tell us at {mail}.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as Tripfolio grows. When we make an important change, we&apos;ll tell you in the app or by email. The
        date at the top shows when it was last updated.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Tripfolio, run by Meir Yoshvayev, Israel. Email: {mail}. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title={TITLE}
      intro={
        <p>
          Tripfolio is a place to map where you&apos;ve been and where you want to go. This policy explains, in plain words, what data
          we handle to make that work, who can see it, and the choices you have.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
