"use client";

import { Camera, Globe2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CountrySearch } from "@/components/country-search";
import { useMe } from "@/features/auth/api";
import { ImportSheet } from "@/features/import/import-sheet";
import { useUserMap } from "@/features/map/api";
import { MapPanel, MapViewTabs, RegionPicker } from "@/features/map/map-panel";
import { useUserRegions } from "@/features/map/regions-api";
import { computeStats } from "@/features/stats/compute";
import { countVisitedRegions, getRegion, REGION_COUNTRIES } from "@/lib/regions";
import { openCountry, setMapView, useUI } from "@/lib/ui";

/**
 * Full-bleed map. On phones it's just the map, filling the screen between the top bar and the tab
 * bar and opening zoomed in; the switch, counter and search live on larger screens only. Phones
 * reach a country through the top bar's search (it opens the country's sheet here) and the
 * USA / Canada / Australia maps through that country's sheet.
 */
export default function MapPage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const view = useUI((s) => s.mapView);
  const [importing, setImporting] = useState(false);
  const stats = computeStats(map.data?.statuses ?? {});
  const regions = useUserRegions(view !== "world" ? me.username : undefined);
  // In a country's mode the card summarises its regions instead of countries.
  const summary = useMemo(() => {
    if (view === "world") return { visited: stats.visited, wishlist: stats.wishlist, caption: `${stats.explored.toFixed(1)}% of the world` };
    const statuses = regions.data?.statuses ?? {};
    const visited = countVisitedRegions(statuses, view);
    const wishlist = Object.entries(statuses).filter(([code, s]) => s === "wishlist" && getRegion(code)?.country === view && getRegion(code)?.counts).length;
    const { total, unit } = REGION_COUNTRIES[view];
    return { visited, wishlist, caption: `${visited} of ${total} ${unit}` };
  }, [view, stats, regions.data]);
  // Phones: the screen minus the top bar (3.5rem) and the tab bar (3.5rem, its 1px border and the safe area).
  const fill = "h-[calc(100dvh-7rem-1px-env(safe-area-inset-bottom))] md:h-[calc(100dvh-1.5rem)] w-full rounded-none md:rounded-3xl border-0 md:border";

  return (
    // Fixed under the top bar on phones, so the page never scrolls and the map meets the tab bar.
    <main className="max-md:fixed max-md:inset-x-0 max-md:top-14 relative md:p-3">
      <h1 className="sr-only">Your world map</h1>
      <MapPanel username={me.username} tabs={false} phoneZoom={4} className={fill} />
      {view !== "world" && (
        <button
          onClick={() => setMapView("world")}
          className="glass absolute top-3 left-3 flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold shadow-card md:hidden"
        >
          <Globe2 className="size-4" aria-hidden /> World
        </button>
      )}
      <button
        onClick={() => setImporting(true)}
        aria-label="Import from photos"
        className="glass absolute top-3 right-3 flex size-11 items-center justify-center rounded-xl border border-border shadow-card md:hidden"
      >
        <Camera className="size-5" aria-hidden />
      </button>
      <ImportSheet open={importing} onClose={() => setImporting(false)} username={me.username} />
      <div className="pointer-events-none absolute inset-x-3 top-3 hidden flex-wrap items-start justify-between gap-2 md:inset-x-6 md:top-6 md:flex">
        <div className="pointer-events-auto flex flex-col gap-2">
        <MapViewTabs username={me.username} />
        <div className="glass rounded-2xl border border-border px-4 py-2.5 shadow-card">
          <p className="font-heading text-lg leading-tight font-bold">
            <span className="text-visited">{summary.visited}</span> visited · <span className="text-wishlist">{summary.wishlist}</span> to go
          </p>
          <p className="text-xs text-muted">{summary.caption}</p>
        </div>
        </div>
        <div className="pointer-events-auto flex w-full items-center gap-2 sm:w-auto">
          {view !== "world" ? (
            <RegionPicker country={view} username={me.username} className="w-full sm:w-72" />
          ) : (
            <CountrySearch
              className="w-full sm:w-72"
              statuses={map.data?.statuses}
              onPick={(c) => openCountry(c.code, me.username)}
              placeholder="Find a country…"
            />
          )}
          <button
            onClick={() => setImporting(true)}
            className="glass flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold shadow-card hover:text-brand"
          >
            <Camera className="size-4" aria-hidden /> Import
          </button>
        </div>
      </div>
    </main>
  );
}
