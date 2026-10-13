import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Signed-in app pages (keep in sync with PROTECTED in src/proxy.ts; /u stays public).
const APP_PAGES = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/messages", "/profile", "/settings", "/onboarding"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/u/"], disallow: ["/api/", ...APP_PAGES.map((p) => `${p}/`), ...APP_PAGES] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
