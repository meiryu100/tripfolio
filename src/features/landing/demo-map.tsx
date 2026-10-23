"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { trackClick } from "@/components/analytics";
import { useState } from "react";
import { buttonClass } from "@/components/button-class";
import { WorldMap } from "@/features/map/world-map";
import { ShareDemoMapButton } from "@/features/share/share";
import { computeStats } from "@/features/stats/compute";
import { getCountry } from "@/lib/countries";
import { getRegion, REGION_COUNTRIES, withRegionCountries } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { saveDemoPicks } from "./demo-picks";

const NEXT: Record<string, CountryStatus | undefined> = { none: "visited", visited: "wishlist", wishlist: undefined };

/**
 * "Try it" map for the SEO landing page: tap a country to cycle visited → want to go → clear.
 * The picks are kept in this browser so onboarding can offer them after sign-up.
 */
export function DemoMap() {
  const [countries, setCountries] = useState<Record<string, CountryStatus>>({});
  const [regions, setRegions] = useState<Record<string, CountryStatus>>({});
  const [last, setLast] = useState<string | null>(null);
  // A country follows its regions (US states, Canadian provinces, ...), like the server does:
  // any visited region → visited, else any wished region → want to go.
  const statuses = withRegionCountries(countries, regions);
  const stats = computeStats(statuses);

  const cycle = (code: string) => (s: Record<string, CountryStatus>) => {
    const next = NEXT[s[code] ?? "none"];
    const copy = { ...s };
    if (next) copy[code] = next;
    else delete copy[code];
    return copy;
  };
  const toggle = (code: string) => {
    setCountries(cycle(code));
    setLast(code);
  };
  const toggleRegion = (code: string) => {
    setRegions(cycle(code));
    setLast(code);
  };

  const lastRegion = last ? getRegion(last) : null;
  const lastCountry = last && !lastRegion ? getCountry(last) : null;
  const lastStatus = last ? (lastRegion ? regions[last] : countries[last]) : undefined;
  const lastLabel = lastRegion ? `${REGION_COUNTRIES[lastRegion.country].flag} ${lastRegion.name}` : lastCountry ? `${lastCountry.flag} ${lastCountry.name}` : null;

  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-3 shadow-card backdrop-blur sm:p-4">
      <WorldMap
        statuses={statuses}
        onSelect={toggle}
        regionStatuses={regions}
        onSelectRegion={toggleRegion}
        className="aspect-[4/3] w-full sm:aspect-[16/9]"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="min-h-6 text-sm text-muted" aria-live="polite">
          {lastLabel
            ? `${lastLabel}: ${lastStatus === "visited" ? "visited" : lastStatus === "wishlist" ? "want to go" : "cleared"}`
            : "Tap a country: once for visited, twice for want to go, three times to clear."}
        </p>
        <dl className="flex gap-4 text-sm">
          <Stat label={stats.visited === 1 ? "country" : "countries"} value={stats.visited} />
          <Stat label="of the world" value={`${Math.round(stats.explored)}%`} />
          <Stat label="continents" value={`${stats.continentsVisited}/7`} />
        </dl>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
        <Link
          href="/register"
          onClick={() => {
            saveDemoPicks({ ...statuses, ...regions });
            trackClick("save_map", { countries: stats.visited + stats.wishlist });
          }}
          className={buttonClass("primary", "lg", "min-w-56 text-base")}
        >
          {stats.visited + stats.wishlist > 0 ? "Save my map — it's free" : "Make my map — it's free"}
        </Link>
        {Object.keys(statuses).length > 0 && <ShareDemoMapButton statuses={statuses} regionStatuses={regions} />}
        {Object.keys(statuses).length > 0 && (
          <button
            onClick={() => {
              setCountries({});
              setRegions({});
              setLast(null);
              trackClick("start_over");
            }}
            className={buttonClass("ghost", "lg", "text-muted")}
          >
            <RotateCcw className="size-4" aria-hidden /> Start over
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dd className="font-heading text-lg font-bold text-fg tabular-nums">{value}</dd>
      <dt className="text-muted">{label}</dt>
    </div>
  );
}
