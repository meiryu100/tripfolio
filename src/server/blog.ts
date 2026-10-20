import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Last real update (optional `updated:` in the header), YYYY-MM-DD; defaults to `date`. */
  updated: string;
  /** Markdown body, without the header. */
  body: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const SLUG = /^[a-z0-9-]+$/;

/** Splits the `key: value` header between the two `---` lines from the Markdown body. */
function parsePost(slug: string, raw: string): BlogPost | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!meta.title || !meta.description || !meta.date) return null;
  return { slug, title: meta.title, description: meta.description, date: meta.date, updated: meta.updated || meta.date, body: match[2].trim() };
}

/** "2026-10-19" → "October 19, 2026". */
export function formatPostDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!SLUG.test(slug)) return null;
  try {
    return parsePost(slug, await readFile(path.join(BLOG_DIR, `${slug}.md`), "utf8"));
  } catch {
    return null;
  }
}

/** All posts, newest first. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const files = await readdir(BLOG_DIR).catch(() => []);
  const posts = await Promise.all(
    files.filter((f) => f.endsWith(".md")).map((f) => getPost(f.slice(0, -3))),
  );
  return posts
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
