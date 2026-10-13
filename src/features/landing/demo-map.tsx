"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/button-class";
import { WorldMap } from "@/features/map/world-map";
import { computeStats } from "@/features/stats/compute";
import { getCountry } from "@/lib/countries";
import type { CountryStatus } from "@/lib/types";
import { saveDemoPicks } from "./demo-picks";

const NEXT: Record<string, CountryStatus | undefined> = { none: "visited", visited: "wishlist", wishlist: undefined };

/**
 * "Try it" map for the SEO landing page: tap a country to cycle visited → want to go → clear.
 * The picks are kept in this browser so onboarding can offer them after sign-up.
 */
export function DemoMap() {
  const [statuses, setStatuses] = useState<Record<string, CountryStatus>>({});
  const [last, setLast] = useState<string | null>(null);
  const stats = computeStats(statuses);

  const toggle = (code: string) => {
    setStatuses((s) => {
      const next = NEXT[s[code] ?? "none"];
      const copy = { ...s };
      if (next) copy[code] = next;
      else delete copy[code];
      return copy;
    });
    setLast(code);
  };

  const lastCountry = last ? getCountry(last) : null;
  const lastStatus = last ? statuses[last] : undefined;

  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-3 shadow-card backdrop-blur sm:p-4">
      <WorldMap statuses={statuses} onSelect={toggle} className="aspect-[4/3] w-full sm:aspect-[16/9]" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="min-h-6 text-sm text-muted" aria-live="polite">
          {lastCountry
            ? `${lastCountry.flag} ${lastCountry.name}: ${lastStatus === "visited" ? "visited" : lastStatus === "wishlist" ? "want to go" : "cleared"}`
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
          onClick={() => saveDemoPicks(statuses)}
          className={buttonClass("primary", "lg", "min-w-56 text-base")}
        >
          {stats.visited + stats.wishlist > 0 ? "Save my map — it's free" : "Make my map — it's free"}
        </Link>
        {Object.keys(statuses).length > 0 && (
          <button onClick={() => (setStatuses({}), setLast(null))} className={buttonClass("ghost", "lg", "text-muted")}>
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
