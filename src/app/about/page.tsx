import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog-shell";
import { CONTACT_EMAIL } from "@/components/legal";
import { breadcrumbs, founder, jsonLd, ORGANIZATION_ID, organization, shareImage } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

const TITLE = "About Tripfolio";
const DESCRIPTION =
  "Tripfolio (trip-folio.com) is a free travel map app made by Meir Yoshvayev in Israel. What it does, how it counts countries, and how it treats your data.";

export const metadata: Metadata = {
  title: `${TITLE} | trip-folio.com`,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: "/about", title: TITLE, description: DESCRIPTION, images: [shareImage] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [shareImage] },
};

const aboutPage = {
  "@type": "AboutPage",
  "@id": `${siteUrl}/about`,
  url: `${siteUrl}/about`,
  name: TITLE,
  description: DESCRIPTION,
  about: { "@id": ORGANIZATION_ID },
  mainEntity: { "@id": ORGANIZATION_ID },
};

export default function AboutPage() {
  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(aboutPage, organization, founder, breadcrumbs(["About", "/about"])) }} />
      <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">About Tripfolio</h1>
      <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-brand [&_a:hover]:underline [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-fg">
        <p>
          Tripfolio, at <strong className="text-fg">trip-folio.com</strong>, is a free travel map app. You color the countries
          you&apos;ve visited, keep the trips behind them with dates, cities, a story and photos, and follow friends to see their
          maps. It runs in the browser, so it works on phones and computers with nothing to install. It isn&apos;t related to other
          apps or companies that use the name Tripfolio.
        </p>

        <h2>Who makes it</h2>
        <p>
          Tripfolio is made and run by <strong className="text-fg">Meir Yoshvayev</strong>, an independent developer in Israel. It&apos;s
          built to answer a question that&apos;s hard to answer from memory (&ldquo;how many countries have I been to?&rdquo;) and
          to keep the trips and photos that go with the answer.
        </p>

        <h2>How Tripfolio counts countries</h2>
        <p>
          Your &ldquo;% of the world&rdquo; is based on 195 countries: the 193 member states of the United Nations plus the two
          observer states, the Vatican and Palestine. You can also mark 55 territories and places with limited recognition, like
          Greenland, Puerto Rico, Taiwan or Kosovo. They show on your map but don&apos;t change the count. The full list is on the{" "}
          <Link href="/countries">countries page</Link>, and the reasoning is in{" "}
          <Link href="/blog/how-many-countries-are-there-in-the-world">How many countries are there in the world?</Link>
        </p>

        <h2>Your data</h2>
        <p>
          Tripfolio is free and shows no ads. Location data is removed from every photo you upload, and you can make your profile
          private or hide parts of it at any time. The details are in the <Link href="/privacy">privacy policy</Link> and the{" "}
          <Link href="/terms">terms</Link>.
        </p>

        <h2>Get in touch</h2>
        <p>
          Ideas, bugs or questions are welcome at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or see the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </BlogShell>
  );
}
