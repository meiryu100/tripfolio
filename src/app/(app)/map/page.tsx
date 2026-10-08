"use client";

import { useMemo } from "react";
import { CountrySearch } from "@/components/country-search";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { MapPanel, MapViewTabs, StatePicker } from "@/features/map/map-panel";
import { useUserRegions } from "@/features/map/regions-api";
import { computeStats } from "@/features/stats/compute";
import { openCountry, useUI } from "@/lib/ui";

/** Full-bleed map: on phones the map takes the whole screen between the bars. */
export default function MapPage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const view = useUI((s) => s.mapView);
  const stats = useMemo(() => computeStats(map.data?.statuses ?? {}), [map.data]);
  const regions = useUserRegions(view === "US" ? me.username : undefined);
  // In USA mode the card summarises states instead of countries.
  const summary = useMemo(() => {
    if (view !== "US") return { visited: stats.visited, wishlist: stats.wishlist, caption: `${stats.explored.toFixed(1)}% of the world` };
    const entries = Object.entries(regions.data?.statuses ?? {}).filter(([code]) => code !== "US-DC");
    const visited = entries.filter(([, s]) => s === "visited").length;
    return { visited, wishlist: entries.filter(([, s]) => s === "wishlist").length, caption: `${visited} of 50 US states` };
  }, [view, stats, regions.data]);
  const fill = "h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-1.5rem)] w-full rounded-none md:rounded-3xl border-0 md:border";

  return (
    <main className="relative md:p-3">
      <h1 className="sr-only">Your world map</h1>
      <MapPanel username={me.username} tabs={false} className={fill} />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2 md:inset-x-6 md:top-6">
        <div className="pointer-events-auto flex flex-col gap-2">
        <MapViewTabs username={me.username} />
        <div className="glass rounded-2xl border border-border px-4 py-2.5 shadow-card">
          <p className="font-heading text-lg leading-tight font-bold">
            <span className="text-visited">{summary.visited}</span> visited · <span className="text-wishlist">{summary.wishlist}</span> to go
          </p>
          <p className="text-xs text-muted">{summary.caption}</p>
        </div>
        </div>
{view === "US" ? (
          <StatePicker username={me.username} className="pointer-events-auto w-full sm:w-72" />
        ) : (
                  <CountrySearch
            className="pointer-events-auto w-full sm:w-72"
            statuses={map.data?.statuses}
            onPick={(c) => openCountry(c.code, me.username)}
            placeholder="Find a country…"
          />
        )}
      </div>
    </main>
  );
}
