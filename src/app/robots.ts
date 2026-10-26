import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Signed-in app pages (keep in sync with PROTECTED in src/proxy.ts; /u stays public).
// "/home" also covers "/home/...": robots rules match by prefix.
const APP_PAGES = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/messages", "/profile", "/settings", "/onboarding", "/year"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/u/"], disallow: ["/api/", ...APP_PAGES] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
