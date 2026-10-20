import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { getAllPosts } from "@/server/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["/", "/countries-visited-map", "/blog", "/register", "/login", "/privacy", "/terms"].map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  }));
  const posts = (await getAllPosts()).map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));
  return [...pages, ...posts];
}
