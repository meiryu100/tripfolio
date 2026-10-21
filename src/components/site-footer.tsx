import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-consent";

const LINKS = [
  { href: "/countries-visited-map", label: "Countries visited map" },
  { href: "/countries", label: "Countries" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// Each link is at least 44px tall, so it's easy to tap on a phone.
const linkClass = "inline-flex min-h-11 items-center px-2 hover:text-fg hover:underline";

/** Footer for the public pages (home, landing pages, blog, countries, about). */
export function SiteFooter() {
  return (
    <footer className="px-4 pb-10 text-center text-sm text-muted">
      <p>Tripfolio (trip-folio.com) · Made for people who collect places.</p>
      <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
        <CookieSettingsButton className={linkClass} />
      </nav>
    </footer>
  );
}
