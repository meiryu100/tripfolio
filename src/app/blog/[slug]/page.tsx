import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog-shell";
import { Markdown } from "@/components/markdown";
import { siteUrl } from "@/lib/site-url";
import { formatPostDate, getAllPosts, getPost } from "@/server/blog";

export async function generateStaticParams() {
  return (await getAllPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: `${post.title} | Tripfolio`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: post.title, description: post.description, publishedTime: post.date },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "Tripfolio" },
    publisher: { "@type": "Organization", name: "Tripfolio" },
  };

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/blog" className="text-sm font-medium text-brand hover:underline">
        ← All articles
      </Link>
      <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{post.title}</h1>
      <p className="mt-3 text-sm text-muted">{formatPostDate(post.date)}</p>
      <article className="mt-8 grid gap-4 text-[17px] leading-relaxed text-muted [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_li]:pl-1 [&_strong]:text-fg [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-6">
        <Markdown source={post.body} />
      </article>
    </BlogShell>
  );
}
