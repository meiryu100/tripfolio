"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClass } from "@/components/button-class";
import { WorldMap } from "@/features/map/world-map";
import { computeStats } from "@/features/stats/compute";
import { getCountry } from "@/lib/countries";
import { getRegion } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { saveDemoPicks } from "./demo-picks";

const NEXT: Record<string, CountryStatus | undefined> = { none: "visited", visited: "wishlist", wishlist: undefined };

/**
 * "Try it" map for the SEO landing page: tap a country or US state to cycle visited → want to go → clear.
 * The picks are kept in this browser so onboarding can offer them after sign-up.
 */
export function DemoMap() {
  const [countries, setCountries] = useState<Record<string, CountryStatus>>({});
  const [states, setStates] = useState<Record<string, CountryStatus>>({});
  const [last, setLast] = useState<string | null>(null);
  // Like the server: any visited state makes the USA visited, else any wished state puts it on the wishlist.
  const statuses = useMemo<Record<string, CountryStatus>>(() => {
    const values = Object.values(states);
    const us: CountryStatus | undefined = values.includes("visited") ? "visited" : values.includes("wishlist") ? "wishlist" : undefined;
    return us ? { ...countries, US: us } : countries;
  }, [countries, states]);
  const stats = computeStats(statuses);

  const cycle = (code: string) => (s: Record<string, CountryStatus>) => {
    const next = NEXT[s[code] ?? "none"];
    const copy = { ...s };
    if (next) copy[code] = next;
    else delete copy[code];
    return copy;
  };
  const toggle = (code: string) => {
    // The USA is colored through its states.
    if (code === "US") return;
    setCountries(cycle(code));
    setLast(code);
  };
  const toggleState = (code: string) => {
    setStates(cycle(code));
    setLast(code);
  };

  const lastRegion = last ? getRegion(last) : undefined;
  const lastCountry = last && !lastRegion ? getCountry(last) : null;
  const lastLabel = lastRegion ? `🇺🇸 ${lastRegion.name}` : lastCountry ? `${lastCountry.flag} ${lastCountry.name}` : null;
  const lastStatus = last ? (lastRegion ? states[last] : countries[last]) : undefined;

  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-3 shadow-card backdrop-blur sm:p-4">
      <WorldMap
        statuses={statuses}
        onSelect={toggle}
        regionStatuses={states}
        onSelectRegion={toggleState}
        className="aspect-[4/3] w-full sm:aspect-[16/9]"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="min-h-6 text-sm text-muted" aria-live="polite">
          {lastLabel
            ? `${lastLabel}: ${lastStatus === "visited" ? "visited" : lastStatus === "wishlist" ? "want to go" : "cleared"}`
            : "Tap a country or state: once for visited, twice for want to go, three times to clear."}
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
          onClick={() => saveDemoPicks({ ...statuses, ...states })}
          className={buttonClass("primary", "lg", "min-w-56 text-base")}
        >
          {stats.visited + stats.wishlist > 0 ? "Save my map — it's free" : "Make my map — it's free"}
        </Link>
        {Object.keys(statuses).length + Object.keys(states).length > 0 && (
          <button onClick={() => (setCountries({}), setStates({}), setLast(null))} className={buttonClass("ghost", "lg", "text-muted")}>
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
