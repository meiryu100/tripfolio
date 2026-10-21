import type { Metadata } from "next";
import { homeFaqJsonLd } from "@/features/landing/home-faq";
import { LandingPage } from "@/features/landing/landing-page";
import { siteUrl } from "@/lib/site-url";
import { founder, jsonLd, ORGANIZATION_ID, organization, website } from "@/lib/seo";

const TITLE = "Tripfolio: Free Travel Map App to Track Countries You've Visited";
const DESCRIPTION =
  "Tripfolio is a free travel map app: color the countries and US states you've visited, keep every trip with photos, and follow friends' maps. No download needed.";

export const metadata: Metadata = {
  // The brand is already in the title, so skip the " | Tripfolio" other pages add.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "/", siteName: "Tripfolio", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const app = {
  "@type": "WebApplication",
  "@id": `${siteUrl}/#app`,
  name: "Tripfolio",
  url: siteUrl,
  description: DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web browser)",
  browserRequirements: "Requires JavaScript",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORGANIZATION_ID },
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization, founder, website, app, homeFaqJsonLd) }} />
      <LandingPage />
    </>
  );
}
