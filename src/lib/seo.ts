import { siteUrl } from "./site-url";

/**
 * Shared structured data (schema.org JSON-LD). Every page points at the same Organization and
 * WebSite nodes by `@id`, so search engines see one Tripfolio, run by one person, not a new
 * entity per page. "trip-folio.com" in the names keeps us apart from other products called Tripfolio.
 */

export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;
export const FOUNDER_ID = `${siteUrl}/#founder`;

export const founder = {
  "@type": "Person",
  "@id": FOUNDER_ID,
  name: "Meir Yoshvayev",
  url: `${siteUrl}/about`,
  jobTitle: "Founder of Tripfolio",
};

export const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Tripfolio",
  alternateName: ["trip-folio.com", "Trip-folio"],
  url: siteUrl,
  logo: { "@type": "ImageObject", url: `${siteUrl}/brand/tripfolio-mark.png`, width: 512, height: 414 },
  email: "meir@trip-folio.com",
  founder: { "@id": FOUNDER_ID },
};

export const website = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: siteUrl,
  name: "Tripfolio",
  alternateName: "trip-folio.com",
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION_ID },
};

/** A BreadcrumbList from [name, path] pairs, starting at the home page. */
export function breadcrumbs(...trail: [name: string, path: string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [["Tripfolio", ""] as const, ...trail].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${siteUrl}${path}`,
    })),
  };
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so text can't close the tag. */
export function jsonLd(...graph: object[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

/**
 * The site-wide link preview (src/app/opengraph-image.tsx). A page that sets its own `openGraph`
 * or `twitter` replaces the inherited image too, so pages without their own image add this.
 */
export const shareImage = { url: "/opengraph-image", width: 1200, height: 630, alt: "Tripfolio, the free travel map app" };

/** A public profile goes into the sitemap and search results only with at least this many visited countries. */
export const MIN_INDEXED_COUNTRIES = 3;

/** `visited` is the profile's visited-country count as anonymous visitors see it (null when hidden). */
export function isIndexableProfile(visited: number | null) {
  return visited !== null && visited >= MIN_INDEXED_COUNTRIES;
}
