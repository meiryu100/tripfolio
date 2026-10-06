"use client";

import { useMemo } from "react";
import { CountrySearch } from "@/components/country-search";
import { ErrorState } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { MapSkeleton, WorldMap } from "@/features/map/world-map";
import { computeStats } from "@/features/stats/compute";
import { openCountry, useUI } from "@/lib/ui";

/** Full-bleed map: on phones the map takes the whole screen between the bars. */
export default function MapPage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const selected = useUI((s) => (s.countrySheet?.username === me.username ? s.countrySheet.code : null));
  const stats = useMemo(() => computeStats(map.data?.statuses ?? {}), [map.data]);
  const fill = "h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-1.5rem)] w-full rounded-none md:rounded-3xl border-0 md:border";

  return (
    <main className="relative md:p-3">
      <h1 className="sr-only">Your world map</h1>
      {map.isPending ? (
        <MapSkeleton className={fill} />
      ) : map.isError ? (
        <div className="p-6">
          <ErrorState body="We couldn't load your map." onRetry={() => map.refetch()} />
        </div>
      ) : (
        <WorldMap
          statuses={map.data.statuses}
          photoCountries={map.data.photoCountries}
          selected={selected}
          onSelect={(code) => openCountry(code, me.username)}
          className={fill}
        />
      )}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2 md:inset-x-6 md:top-6">
        <div className="glass pointer-events-auto rounded-2xl border border-border px-4 py-2.5 shadow-card">
          <p className="font-heading text-lg leading-tight font-bold">
            <span className="text-visited">{stats.visited}</span> visited · <span className="text-wishlist">{stats.wishlist}</span> to go
          </p>
          <p className="text-xs text-muted">{stats.explored.toFixed(1)}% of the world</p>
        </div>
        <CountrySearch
          className="pointer-events-auto w-full sm:w-72"
          statuses={map.data?.statuses}
          onPick={(c) => openCountry(c.code, me.username)}
          placeholder="Find a country…"
        />
      </div>
    </main>
  );
}
