import "server-only";
import { sql } from "drizzle-orm";
import { botKind, type BotKind } from "@/lib/bots";
import { db } from "../db";
import { getAllPosts } from "../blog";

/** Crawler numbers for the admin SEO page, from bot_visits (filled by src/proxy.ts). */

/** The crawlers that matter most get their own column in the blog table; the rest add up under "other". */
export const KEY_BOTS = ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot"] as const;

export interface SeoStats {
  hits30d: number;
  byDay: { day: string; hits: number }[];
  byBot: { bot: string; kind: BotKind | undefined; hits: number; pages: number; lastSeen: string }[];
  blog: {
    path: string;
    title: string;
    hits: Record<string, number>;
    other: number;
    total: number;
    lastGoogle: string | null;
    lastAny: string | null;
  }[];
  files: { path: string; hits: number; lastSeen: string | null; bots: string[] }[];
  topPages: { path: string; hits: number; bots: number; lastSeen: string }[];
}

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

export async function getSeoStats(): Promise<SeoStats> {
  const [byDay, byBot, blogRows, fileRows, topPages, posts] = await Promise.all([
    db.execute<{ day: string; hits: number }>(sql`
      select to_char(d, 'YYYY-MM-DD') as day,
             coalesce((select sum(hits)::int from bot_visits where day = d::date), 0) as hits
      from generate_series(current_date - 29, current_date, interval '1 day') d
      order by d`),
    db.execute<{ bot: string; hits: number; pages: number; last_seen: Date }>(sql`
      select bot, sum(hits)::int as hits, count(distinct path)::int as pages, max(last_seen_at) as last_seen
      from bot_visits where day > current_date - 30
      group by bot order by hits desc, bot`),
    db.execute<{ path: string; bot: string; hits: number; last_seen: Date }>(sql`
      select path, bot, sum(hits)::int as hits, max(last_seen_at) as last_seen
      from bot_visits where day > current_date - 30 and (path = '/blog' or path like '/blog/%')
      group by path, bot`),
    db.execute<{ path: string; hits: number; last_seen: Date; bots: string[] }>(sql`
      select path, sum(hits)::int as hits, max(last_seen_at) as last_seen, array_agg(distinct bot order by bot) as bots
      from bot_visits where day > current_date - 30 and path in ('/robots.txt', '/sitemap.xml', '/llms.txt', '/blog/rss.xml')
      group by path`),
    db.execute<{ path: string; hits: number; bots: number; last_seen: Date }>(sql`
      select path, sum(hits)::int as hits, count(distinct bot)::int as bots, max(last_seen_at) as last_seen
      from bot_visits where day > current_date - 30
      group by path order by hits desc, path limit 15`),
    getAllPosts(),
  ]);

  // Every blog page gets a row, also the ones no crawler has visited yet.
  const blogPaths = [{ path: "/blog", title: "הבלוג (עמוד ראשי)" }, ...posts.map((p) => ({ path: `/blog/${p.slug}`, title: p.title }))];
  const blog = blogPaths.map(({ path, title }) => {
    const rows = blogRows.rows.filter((r) => r.path === path);
    const hits = Object.fromEntries(KEY_BOTS.map((b) => [b, rows.find((r) => r.bot === b)?.hits ?? 0]));
    const other = rows.filter((r) => !(KEY_BOTS as readonly string[]).includes(r.bot)).reduce((s, r) => s + r.hits, 0);
    const google = rows.find((r) => r.bot === "Googlebot");
    const latest = rows.map((r) => new Date(r.last_seen).getTime()).sort((a, b) => b - a)[0];
    return {
      path,
      title,
      hits,
      other,
      total: rows.reduce((s, r) => s + r.hits, 0),
      lastGoogle: iso(google?.last_seen ?? null),
      lastAny: latest ? new Date(latest).toISOString() : null,
    };
  });

  const files = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/blog/rss.xml"].map((path) => {
    const r = fileRows.rows.find((f) => f.path === path);
    return { path, hits: r?.hits ?? 0, lastSeen: iso(r?.last_seen ?? null), bots: r?.bots ?? [] };
  });

  return {
    hits30d: byBot.rows.reduce((s, r) => s + r.hits, 0),
    byDay: byDay.rows,
    byBot: byBot.rows.map((r) => ({ bot: r.bot, kind: botKind(r.bot), hits: r.hits, pages: r.pages, lastSeen: iso(r.last_seen)! })),
    blog,
    files,
    topPages: topPages.rows.map((r) => ({ path: r.path, hits: r.hits, bots: r.bots, lastSeen: iso(r.last_seen)! })),
  };
}
