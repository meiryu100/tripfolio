import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog-shell";
import { formatPostDate, getAllPosts } from "@/server/blog";

const TITLE = "Tripfolio Blog";
const DESCRIPTION = "Guides for travelers: how to count the countries and US states you've visited, map them and remember the trips.";

export const metadata: Metadata = {
  title: `${TITLE} | Tripfolio`,
  description: DESCRIPTION,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/rss.xml" } },
  openGraph: { type: "website", url: "/blog", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  return (
    <BlogShell>
      <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">Blog</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">{DESCRIPTION}</p>

      <ul className="mt-10 grid gap-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-3xl border border-border bg-surface/85 p-5 shadow-card transition hover:shadow-soft sm:p-6"
            >
              <p className="text-sm text-muted">{formatPostDate(post.date)}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight [overflow-wrap:anywhere]">{post.title}</h2>
              <p className="mt-2 text-muted [overflow-wrap:anywhere]">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </BlogShell>
  );
}
