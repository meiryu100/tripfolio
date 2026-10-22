import { Car, Flag, Plane } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog-shell";
import { buttonClass } from "@/components/button-class";
import { UsStatesDemo } from "@/features/landing/us-states-demo";
import { breadcrumbs, jsonLd, ORGANIZATION_ID, shareImage } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

/**
 * Tool page for "us states visited map" / "50 states map": the people searching for it want a
 * map to color in, not an article, so the map comes first and the text follows.
 */

const TITLE = "US States Visited Map: Color the States You've Been To";
const DESCRIPTION = "Free US states visited map: tap the states you've been to and see how many of the 50 you've visited. No sign-up needed. Share it or save it.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | Tripfolio` },
  description: DESCRIPTION,
  alternates: { canonical: "/us-states-visited-map" },
  openGraph: { type: "website", url: "/us-states-visited-map", title: TITLE, description: DESCRIPTION, images: [shareImage] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [shareImage] },
};

const FAQ = [
  {
    q: "How many US states have I visited?",
    a: "Tap each state you've been to on the map above, or tick it in the list. The counter adds them up out of 50 and shows the percentage. Washington, D.C. can be marked too, but it isn't a state, so it doesn't count toward the 50.",
  },
  {
    q: "Does driving through a state count?",
    a: "It's your map, so it's your rule. A common one is that you need to have stopped, for fuel, food or a night's sleep. Passing through without stopping is a gray area, and a layover where you never left the airport usually doesn't count.",
  },
  {
    q: "Is Washington, D.C. a state?",
    a: "No. Washington, D.C. is a federal district, not one of the 50 states. You can mark it on the map, but the x / 50 counter leaves it out.",
  },
  {
    q: "Do I need an account?",
    a: "No. The map works without signing up, and you can share it as an image. Create a free account to save it, keep your trips and photos, and add the countries you've visited around the world.",
  },
];

const RULES = [
  { icon: Plane, title: "Layovers", body: "Never left the airport? Most travelers don't count it. Left the terminal and had a meal in town? That usually counts." },
  { icon: Car, title: "Driving through", body: "A common rule: you stopped for fuel, food or sleep. Cruising through at 70 mph is a gray area, so pick a rule and stick to it." },
  { icon: Flag, title: "D.C. and territories", body: "Washington, D.C., Puerto Rico and Guam aren't states, so they don't count toward the 50." },
];

const app = {
  "@type": "WebApplication",
  "@id": `${siteUrl}/us-states-visited-map#app`,
  name: "US states visited map",
  url: `${siteUrl}/us-states-visited-map`,
  description: DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": ORGANIZATION_ID },
};

const faqJsonLd = {
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

export default function UsStatesVisitedMapPage() {
  return (
    <BlogShell wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(app, faqJsonLd, breadcrumbs(["US states visited map", "/us-states-visited-map"])) }} />
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
          Your <span className="text-gradient">US states visited</span> map
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
          Color in the states you&apos;ve been to and see how many of the 50 you&apos;ve visited. No sign-up needed to start.
        </p>
      </div>

      <div className="mt-10">
        <UsStatesDemo />
      </div>

      <div className="mx-auto max-w-3xl">
        <section className="mt-16" aria-labelledby="how-many">
          <h2 id="how-many" className="text-3xl font-bold tracking-tight">
            How many states have I visited?
          </h2>
          <div className="mt-4 grid gap-4 text-[17px] leading-relaxed text-muted">
            <p className="text-fg">
              Go through the map or the A to Z list and mark every state you&apos;ve been to. The counter adds them up out of 50 and
              shows your percentage. Start with the states you&apos;ve lived in, then family trips, then road trips. Your camera roll is
              the best memory aid you have.
            </p>
            <p>
              The full guide, with tips on remembering old trips and settling arguments about what counts, is in{" "}
              <Link href="/blog/us-states-visited-map" className="font-medium text-brand hover:underline">
                How many US states have you visited?
              </Link>
            </p>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="rules">
          <h2 id="rules" className="text-3xl font-bold tracking-tight">
            What counts as visiting a state?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {RULES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-border bg-surface/85 p-5 shadow-card">
                <span className="bg-aurora flex size-10 items-center justify-center rounded-2xl text-white shadow-glow" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="faq">
          <h2 id="faq" className="text-3xl font-bold tracking-tight">
            Questions
          </h2>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/85 shadow-card">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 open:bg-surface">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold">
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

        <section className="aurora-border mt-16 rounded-3xl bg-surface/85 px-6 py-10 text-center shadow-card">
          <h2 className="text-2xl font-bold tracking-tight">The whole world, too</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Your Tripfolio map holds the 50 states and the 195 countries, plus your trips and photos. Free, no app to install.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              Create my map
            </Link>
            <Link href="/countries-visited-map" className={buttonClass("secondary", "lg")}>
              Countries visited map
            </Link>
          </div>
        </section>
      </div>
    </BlogShell>
  );
}
