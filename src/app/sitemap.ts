import { sql } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { COUNTRIES, countrySlug, UNINHABITED } from "@/lib/countries";
import { MIN_INDEXED_COUNTRIES } from "@/lib/seo";
import { getAllPosts } from "@/server/blog";
import { db } from "@/server/db";

/**
 * Public, indexable pages only (no login or sign-up). `lastModified` is left out where we don't
 * know a real date: a build timestamp on every page tells search engines nothing.
 *
 * Public profiles (/u/<username>) are listed when their map is public and has at least
 * MIN_INDEXED_COUNTRIES visited countries; emptier ones are noindex, so they'd only be thin pages.
 */

// Rebuilt hourly so new public profiles show up without a deploy.
export const revalidate = 3600;
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
    { url: `${siteUrl}/us-states-visited-map` },
    { url: `${siteUrl}/blog`, ...(latestPost && { lastModified: new Date(latestPost) }) },
    { url: `${siteUrl}/countries` },
    { url: `${siteUrl}/about` },
    { url: `${siteUrl}/contact` },
    { url: `${siteUrl}/privacy` },
    { url: `${siteUrl}/terms` },
  ];
  const countries = COUNTRIES.filter((c) => !UNINHABITED.has(c.code)).map((c) => ({ url: `${siteUrl}/countries/${countrySlug(c)}` }));
  return [...pages, ...posts, ...countries, ...(await publicProfiles())];
}

async function publicProfiles(): Promise<MetadataRoute.Sitemap> {
  try {
    const { rows } = await db.execute<{ username: string; updated_at: Date }>(sql`
      select u.username, greatest(u.updated_at, max(uc.updated_at)) as updated_at
      from users u join user_countries uc on uc.user_id = u.id and uc.status = 'VISITED'
      where not u.is_test_user and u.onboarded and not u.is_private and u.show_visited
      group by u.id having count(*) >= ${MIN_INDEXED_COUNTRIES}
      order by u.username`);
    return rows.map((r) => ({ url: `${siteUrl}/u/${r.username}`, lastModified: new Date(r.updated_at) }));
  } catch (err) {
    // The sitemap must never fail because of the database (e.g. a build without one).
    console.error("Sitemap: public profiles skipped:", err);
    return [];
  }
}
