import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { COUNTRIES, countrySlug } from "@/lib/countries";
import { getAllPosts } from "@/server/blog";

/**
 * Public, indexable pages only (no login or sign-up). `lastModified` is left out where we don't
 * know a real date: a build timestamp on every page tells search engines nothing.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPosts = await getAllPosts();
  const posts = allPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated),
  }));
  const latestPost = allPosts.map((p) => p.updated).sort().at(-1);
  const pages = [
    { url: siteUrl },
    { url: `${siteUrl}/countries-visited-map` },
    { url: `${siteUrl}/blog`, ...(latestPost && { lastModified: new Date(latestPost) }) },
    { url: `${siteUrl}/countries` },
    { url: `${siteUrl}/about` },
    { url: `${siteUrl}/contact` },
    { url: `${siteUrl}/privacy` },
    { url: `${siteUrl}/terms` },
  ];
  const countries = COUNTRIES.map((c) => ({ url: `${siteUrl}/countries/${countrySlug(c)}` }));
  return [...pages, ...posts, ...countries];
}
