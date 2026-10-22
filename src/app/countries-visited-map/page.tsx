import { Camera, Flag, Globe2, Lock, Medal, Share2, Trophy, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-class";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { DemoMap } from "@/features/landing/demo-map";
import { PromoVideo } from "@/features/landing/promo-video";
import { breadcrumbs, jsonLd, ORGANIZATION_ID } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * SEO landing page for "countries visited map" / "how many countries have I been to".
 * Server-rendered text (what search engines read) around a try-it-now map.
 */

const TITLE = "Countries Visited Map — Color Every Country You've Been To";
const DESCRIPTION =
  "Free countries visited map: tap the countries you've been to and see how many you've visited and what % of the world. Track US states, trips and photos too.";

export const metadata: Metadata = {
  title: `${TITLE} | Tripfolio`,
  description: DESCRIPTION,
  alternates: { canonical: "/countries-visited-map" },
  openGraph: { type: "website", url: "/countries-visited-map", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FEATURES = [
  { icon: Globe2, title: "How much of the world", body: "A live count of countries visited, the % of the world's 195 countries, and every continent you've reached." },
  { icon: Flag, title: "All 50 US states", body: "The USA splits into its states on the world map, with a separate states map and an x / 50 counter." },
  { icon: Camera, title: "Trips, not just pins", body: "Add each trip with dates, cities, a story and photos. Location data is removed from every photo." },
  { icon: Medal, title: "Milestones", body: "Your first country, then 10, 25, 50 and 100 — and how far you are from the next one." },
  { icon: Users, title: "Friends' maps", body: "Follow other travelers, compare maps and find your next trip in the places they loved." },
  { icon: Lock, title: "Private if you want", body: "Make your profile private, or hide your visited list, wishlist, trips or photos separately." },
];

const FAQ = [
  {
    q: "How many countries are there in the world?",
    a: "Tripfolio counts 195: the 193 member states of the United Nations plus the two observer states, the Vatican and Palestine. That's the number behind your \"% of the world\". You can also mark 55 territories and regions, like Greenland, Puerto Rico or Hong Kong — they show on your map but don't change the percentage.",
  },
  {
    q: "What counts as visiting a country?",
    a: "It's your map, so it's your rule. Most travelers count a country once they've left the airport and spent some time there; a layover where you never passed immigration usually doesn't count. Whatever you choose, keep it consistent.",
  },
  {
    q: "Is Tripfolio free?",
    a: "Yes. Making your map, adding trips and photos, and following friends is free.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. Tripfolio runs in your browser and works on phones, tablets and computers.",
  },
  {
    q: "Can I track US states too?",
    a: "Yes. The USA is split into its 50 states on the map, and there's a USA-only view with a states counter.",
  },
  {
    q: "Can I share my travel map?",
    a: "Yes. Your profile has a public link and a share card — an image of your map with your country count — that you can post or send to friends. Private profiles stay private.",
  },
];

const faqJsonLd = {
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

const app = {
  "@type": "WebApplication",
  "@id": `${siteUrl}/countries-visited-map#app`,
  name: "Countries visited map",
  url: `${siteUrl}/countries-visited-map`,
  description: DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORGANIZATION_ID },
};

export default function CountriesVisitedMapPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(app, faqJsonLd, breadcrumbs(["Countries visited map", "/countries-visited-map"])) }} />
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1">
            <Link href="/login" className={buttonClass("ghost", "md")}>
              Log In
            </Link>
            <Link href="/register" className={buttonClass("primary", "md", "hidden sm:inline-flex")}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
          <div className="animate-rise-soft mx-auto max-w-3xl text-center">
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
              Your <span className="text-gradient">countries visited</span> map
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
              Color in every country you&apos;ve been to and see how much of the world you&apos;ve explored. Try it right here — no
              sign-up needed to start.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-5xl">
            <DemoMap />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="how-many">
          <h2 id="how-many" className="text-3xl font-bold tracking-tight">
            How many countries have I been to?
          </h2>
          <div className="mt-4 grid gap-4 text-[17px] leading-relaxed text-muted">
            <p className="text-fg">
              To find out how many countries you&apos;ve been to, tap each one on the map above. The counter adds them up out of
              195 countries (the 193 UN members plus the Vatican and Palestine) and shows your share of the world and how many of
              the 7 continents you&apos;ve reached. Most people count a country once they&apos;ve left the airport.
            </p>
            <p>
              It&apos;s a surprisingly hard question to answer from memory. A map makes it easy: go continent by continent, tap each
              country you&apos;ve visited, and the count, the share of the world and the continents add up as you go.
            </p>
            <p>
              On Tripfolio, visited countries turn green and the places you dream about turn orange, so your map shows both where
              you&apos;ve been and where you&apos;re going next. Add a trip to a country and it stays marked as visited.
            </p>
            <p>
              Prefer a checklist? Go through{" "}
              <Link href="/countries" className="font-medium text-brand hover:underline">
                every country A to Z
              </Link>
              . Counting the USA too? Try the{" "}
              <Link href="/us-states-visited-map" className="font-medium text-brand hover:underline">
                US states visited map
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6" aria-labelledby="in-action">
          <h2 id="in-action" className="text-center text-3xl font-bold tracking-tight">
            See it in action
          </h2>
          <div className="mt-8">
            <PromoVideo />
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Trip photos: Basile Morin (CC BY-SA 4.0), Stjepko Krehula (CC BY 4.0), Martin Falbisoner (CC BY-SA 4.0), via Wikimedia Commons.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="features">
          <h2 id="features" className="text-center text-3xl font-bold tracking-tight">
            More than a scratch map
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-border bg-surface/85 p-6 shadow-card backdrop-blur">
                <span className="bg-aurora flex size-11 items-center justify-center rounded-2xl text-white shadow-glow" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="faq">
          <h2 id="faq" className="text-3xl font-bold tracking-tight">
            Questions
          </h2>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/85 shadow-card backdrop-blur">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 open:bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="aurora-border rounded-3xl bg-surface/85 px-6 py-12 text-center shadow-card backdrop-blur">
            <Trophy className="mx-auto size-10 text-sun" aria-hidden />
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Start your map in a minute</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">Free, private if you want, and yours to share.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/register" className={buttonClass("primary", "lg", "min-w-48 text-base")}>
                Create my map
              </Link>
              <Link href="/about" className={buttonClass("secondary", "lg", "min-w-48 text-base")}>
                <Share2 className="size-4" aria-hidden /> About Tripfolio
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
