import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { COUNTRIES, countrySlug } from "@/lib/countries";
import { getAllPosts } from "@/server/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/countries-visited-map", "/blog", "/countries", "/register", "/login", "/privacy", "/terms"].map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  }));
  const posts = (await getAllPosts()).map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));
  const countries = COUNTRIES.map((c) => ({ url: `${siteUrl}/countries/${countrySlug(c)}` }));
  return [...pages, ...posts, ...countries];
}
