import { siteUrl } from "@/lib/site-url";
import { getAllPosts } from "@/server/blog";

/** RSS 2.0 feed of the blog, for feed readers and crawlers that follow feeds. */

export const dynamic = "force-static";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getAllPosts();
  const items = posts
    .map((p) => {
      const url = `${siteUrl}/blog/${p.slug}`;
      return `<item><title>${escape(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escape(p.description)}</description><pubDate>${new Date(`${p.date}T08:00:00Z`).toUTCString()}</pubDate></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Tripfolio Blog</title><link>${siteUrl}/blog</link><atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>Guides for travelers: count the countries and states you've visited, map them and remember the trips.</description><language>en</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
