import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/countries-visited-map", "/register", "/login", "/privacy", "/terms"].map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  }));
}
