"use client";

import { Globe2 } from "lucide-react";
import { ErrorState } from "@/components/ui";
import { countVisitedRegions, REGION_COUNTRIES, REGION_COUNTRY_CODES, type RegionCountry, regionsOf } from "@/lib/regions";
import { openCountry, openRegion, setMapView, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useUserMap } from "./api";
import { useUserRegions } from "./regions-api";
import { MapSkeleton, RegionMap, WorldMap } from "./world-map";

/** World ↔ USA / Canada / Australia switch. Can sit on the map (default) or anywhere else on the page. */
export function MapViewTabs({ username, className }: { username: string; className?: string }) {
  const view = useUI((s) => s.mapView);
  const regions = useUserRegions(username);
  const tabs = [
    { id: "world" as const, label: "World", icon: <Globe2 className="size-4" aria-hidden />, meta: undefined },
    ...REGION_COUNTRY_CODES.map((c) => ({
      id: c,
      label: REGION_COUNTRIES[c].label,
      icon: (
        <span aria-hidden className="text-base leading-none">
          {REGION_COUNTRIES[c].flag}
        </span>
      ),
      meta: regions.data ? `${countVisitedRegions(regions.data.statuses, c)}/${REGION_COUNTRIES[c].total}` : undefined,
    })),
  ];
  return (
    <div role="tablist" aria-label="Map" className={cn("glass inline-flex gap-1 rounded-2xl border border-border p-1 shadow-card", className)}>
      {tabs.map((t) => {
        const active = view === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            aria-label={t.meta ? `${t.label}, ${t.meta} visited` : t.label}
            onClick={() => setMapView(t.id)}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-all duration-300",
              active ? "bg-gradient-to-r from-brand to-brand-2 text-brand-fg shadow-soft" : "text-muted hover:text-fg",
            )}
          >
            {t.icon}
            {/* On phones only the open tab spells out its name and count, so four tabs fit. */}
            <span className={cn(!active && "sr-only sm:not-sr-only")}>{t.label}</span>
            {t.meta && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-white/20" : "hidden bg-surface-2 sm:inline",
                )}
              >
                {t.meta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A user's map with the World / USA / Canada / Australia switch. In a country's mode it shows
 * its regions; marking a region visited also marks its country visited on the world map.
 */
export function MapPanel({
  username,
  className,
  tabs = true,
  phoneZoom,
}: {
  username: string;
  className?: string;
  /** Open the world map zoomed in this much on phones. */
  phoneZoom?: number;
  /** Render the World/country switch on the map (set false to place <MapViewTabs> elsewhere). */
  tabs?: boolean;
}) {
  const view = useUI((s) => s.mapView);
  const map = useUserMap(username);
  // Regions are shown in every view: inside the world map too.
  const regions = useUserRegions(username);
  const selectedCountry = useUI((s) => (s.countrySheet?.username === username ? s.countrySheet.code : null));
  const selectedRegion = useUI((s) => (s.regionSheet?.username === username ? s.regionSheet.code : null));

  const loading = view === "world" ? map.isPending : regions.isPending;
  const selected = selectedRegion ?? selectedCountry;
  const error = view === "world" ? map.isError : regions.isError;

  return (
    <div className="relative">
      {loading ? (
        <MapSkeleton className={className} />
      ) : error ? (
        <ErrorState body="We couldn't load this map." onRetry={() => (view === "world" ? map.refetch() : regions.refetch())} />
      ) : view === "world" ? (
        <WorldMap
          statuses={map.data!.statuses}
          photoCountries={map.data!.photoCountries}
          selected={selected}
          onSelect={(code) => openCountry(code, username)}
          regionStatuses={regions.data?.statuses ?? {}}
          onSelectRegion={(code) => openRegion(code, username)}
          phoneZoom={phoneZoom}
          className={className}
        />
      ) : (
        <RegionMap
          key={view}
          country={view}
          statuses={regions.data!.statuses}
          selected={selectedRegion}
          onSelect={(code) => openRegion(code, username)}
          className={className}
        />
      )}
      {tabs && (
        <div className="pointer-events-none absolute top-3 left-3 z-10">
          <MapViewTabs username={username} className="pointer-events-auto" />
        </div>
      )}
    </div>
  );
}


/** Jump straight to a region (keyboard-friendly way into a country's regions map). */
export function RegionPicker({ country, username, className }: { country: RegionCountry; username: string; className?: string }) {
  const { shortNoun: noun } = REGION_COUNTRIES[country];
  return (
    <select
      key={country}
      aria-label={`Jump to a ${noun}`}
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) openRegion(e.target.value, username);
        e.target.value = "";
      }}
      className={cn(
        "h-12 rounded-2xl border border-border bg-surface px-4 text-base shadow-soft outline-none focus:border-ai/60 focus:ring-4 focus:ring-ai/15",
        className,
      )}
    >
      <option value="">Jump to a {noun}…</option>
      {regionsOf(country).map((s) => (
        <option key={s.code} value={s.code}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
