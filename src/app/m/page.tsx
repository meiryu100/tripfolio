import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button-class";
import { Logo } from "@/components/logo";
import { SaveMapLink } from "@/features/share/save-map-link";
import { PublicMap } from "@/features/share/public-map";
import { computeStats } from "@/features/stats/compute";
import { encodeSharedMap, parseSharedMap } from "@/lib/map-share";
import { shareSummary } from "@/server/share/profile-share";

/**
 * A travel map someone made on the try-it page and shared without an account. The map lives in the
 * URL (`?v=…&w=…`, see src/lib/map-share.ts); nothing is stored. Personal and endless, so not indexed.
 */

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function load(searchParams: Props["searchParams"]) {
  const q = await searchParams;
  const map = parseSharedMap(first(q.v), first(q.w));
  return { ...map, stats: computeStats(map.statuses) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { statuses, regionStatuses, stats } = await load(searchParams);
  const { v, w } = encodeSharedMap(statuses, regionStatuses);
  const q = new URLSearchParams();
  if (v) q.set("v", v);
  if (w) q.set("w", w);
  const image = `/api/map-card?${q}`;
  const description = `${shareSummary(stats)}. Color your own travel map on Tripfolio — it's free.`;
  return {
    title: "A travel map · Tripfolio",
    description,
    robots: { index: false, follow: true },
    openGraph: { type: "website", title: "My travel map", description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "My travel map", description, images: [image] },
  };
}

export default async function SharedMapPage({ searchParams }: Props) {
  const { statuses, regionStatuses, stats } = await load(searchParams);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "md")}>
            Sign in
          </Link>
          <Link href="/register" className={buttonClass("primary", "md")}>
            Join free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <section className="flex flex-col items-center pt-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">A travel map</h1>
          <p className="mt-3 font-semibold text-brand">{shareSummary(stats)}</p>
        </section>

        <div className="mt-8">
          <PublicMap statuses={statuses} regionStatuses={regionStatuses} />
        </div>

        <section className="bg-aurora mt-12 rounded-3xl p-8 text-center text-white shadow-glow sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Map your own world</h2>
          <p className="mx-auto mt-2 max-w-lg text-white/90">Tap the countries you&apos;ve been to and see how much of the world you&apos;ve covered. It takes a minute, and it&apos;s free.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link href="/countries-visited-map" className={buttonClass("secondary", "lg", "min-w-48")}>
              Make your own map — free
            </Link>
            <SaveMapLink statuses={statuses} regionStatuses={regionStatuses} className={buttonClass("ghost", "lg", "text-white hover:text-white")}>
              Save this map
            </SaveMapLink>
          </div>
        </section>
      </main>
    </div>
  );
}
