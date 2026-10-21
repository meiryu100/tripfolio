import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog-shell";
import { buttonClass } from "@/components/button-class";
import { Markdown } from "@/components/markdown";
import { extractFaq, readingMinutes, wordCount } from "@/lib/blog-text";
import { breadcrumbs, FOUNDER_ID, founder, jsonLd, ORGANIZATION_ID, organization } from "@/lib/seo";
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
    // Long titles get cut off in search results, so only short ones get the brand suffix.
    title: { absolute: post.title.length > 50 ? post.title : `${post.title} | Tripfolio` },
    description: post.description,
    alternates: { canonical: url, types: { "application/rss+xml": "/blog/rss.xml" } },
    openGraph: { type: "article", url, title: post.title, description: post.description, publishedTime: post.date, modifiedTime: post.updated },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const related = (await getAllPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);

  const url = `${siteUrl}/blog/${post.slug}`;
  const faq = extractFaq(post.body);
  // One graph: the article (written by Meir, published by Tripfolio), where it sits on the site,
  // and its FAQ (if it has one).
  const graph = [
    {
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: `${url}/opengraph-image`,
      datePublished: post.date,
      dateModified: post.updated,
      wordCount: wordCount(post.body),
      inLanguage: "en",
      mainEntityOfPage: url,
      author: { "@id": FOUNDER_ID },
      publisher: { "@id": ORGANIZATION_ID },
    },
    founder,
    organization,
    breadcrumbs(["Blog", "/blog"], [post.title, `/blog/${post.slug}`]),
    ...(faq.length
      ? [{ "@type": "FAQPage", mainEntity: faq.map((qa) => ({ "@type": "Question", name: qa.question, acceptedAnswer: { "@type": "Answer", text: qa.answer } })) }]
      : []),
  ];

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(...graph) }} />
      <nav aria-label="Breadcrumb" className="text-sm font-medium">
        <Link href="/blog" className="text-brand hover:underline">
          ← All articles
        </Link>
      </nav>
      <article>
        <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted">
          By{" "}
          <Link href="/about" className="font-medium text-fg hover:underline">
            Meir Yoshvayev
          </Link>{" "}
          · <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          {post.updated !== post.date && (
            <>
              {" "}
              · Updated <time dateTime={post.updated}>{formatPostDate(post.updated)}</time>
            </>
          )}{" "}
          · {readingMinutes(post.body)} min read
        </p>
        <div className="mt-8 grid gap-4 text-[17px] leading-relaxed text-muted [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_li]:pl-1 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-1.5 [&_ol]:pl-6 [&_strong]:text-fg [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-6">
          <Markdown source={post.body} />
        </div>
      </article>

      <aside className="aurora-border mt-12 rounded-3xl bg-surface/85 px-6 py-8 text-center shadow-card">
        <h2 className="text-2xl font-bold tracking-tight">See your own map</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">Tap the countries you&apos;ve been to and watch your % of the world add up. Free, no app to install.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/countries-visited-map" className={buttonClass("primary")}>
            Try the map
          </Link>
          <Link href="/register" className={buttonClass("secondary")}>
            Create my map
          </Link>
        </div>
      </aside>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="more-articles">
          <h2 id="more-articles" className="text-2xl font-bold tracking-tight">
            More from the blog
          </h2>
          <ul className="mt-4 grid gap-3">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="block rounded-2xl border border-border bg-surface/85 p-4 shadow-card transition hover:shadow-soft">
                  <p className="font-semibold [overflow-wrap:anywhere]">{p.title}</p>
                  <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{p.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </BlogShell>
  );
}
