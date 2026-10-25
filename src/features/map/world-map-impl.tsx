"use client";

import { geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { memo, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldRegions from "@/data/regions-world.json";
import usStates from "@/data/us-states-world.json";
import world from "@/data/world-110m.json";
import { countryName, getCountry } from "@/lib/countries";
import { worldProjection } from "@/lib/map-projection";
import { getRegion, isRegionCountry } from "@/lib/regions";
import { useUI } from "@/lib/ui";
import type { CountryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapLegend } from "./legend";
import { useMapZoom, ZoomControls } from "./zoom";

const W = 960;
const H = 500;

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
const projection = worldProjection().fitExtent([[4, 4], [W - 4, H - 4]], fc);
const pathGen = geoPath(projection);
// Countries with a regions map (USA, Canada, Australia) are drawn as their regions instead of one shape, in the same projection.
const SHAPES = fc.features.filter((f) => !isRegionCountry(String(f.id))).map((f) => ({ code: String(f.id), d: pathGen(f) ?? "" }));
const usTopo = usStates as unknown as Topology<{ states: GeometryCollection }>;
const regionsTopo = worldRegions as unknown as Topology<{ regions: GeometryCollection }>;
const REGION_SHAPES = [
  ...(feature(usTopo, usTopo.objects.states) as FeatureCollection<Geometry>).features,
  ...(feature(regionsTopo, regionsTopo.objects.regions) as FeatureCollection<Geometry>).features,
].map((f) => ({ code: String(f.id), country: String(f.id).slice(0, 2), d: pathGen(f) ?? "" }));

const isRegion = (code: string) => code.includes("-");

const FILL: Record<CountryStatus | "none", string> = {
  visited: "var(--visited-fill)",
  wishlist: "var(--wishlist-fill)",
  none: "var(--land)",
};

/** A region with no status of its own, inside a country that's marked: a lighter tint of the country's color. */
const TINT: Record<CountryStatus, string> = {
  visited: "color-mix(in oklab, var(--visited-fill) 45%, var(--land))",
  wishlist: "color-mix(in oklab, var(--wishlist-fill) 45%, var(--land))",
};

const hoverClass =
  "cursor-pointer hover:brightness-95 hover:[filter:drop-shadow(0_0_4px_color-mix(in_oklab,var(--brand-bright)_40%,transparent))] dark:hover:brightness-125";

const Shapes = memo(function Shapes({
  statuses,
  selected,
  interactive,
  photos,
  pulse,
  regionStatuses,
}: {
  statuses: Record<string, CountryStatus>;
  selected?: string | null;
  interactive: boolean;
  photos: Set<string> | null;
  pulse: { code: string; at: number } | null;
  /** Region statuses; when given, regions (US states, ...) are individually clickable. */
  regionStatuses?: Record<string, CountryStatus>;
}) {
  return (
    <>
      {SHAPES.map(({ code, d }, i) => {
        const hasPhotos = photos?.has(code);
        return (
          <path
            // Re-key on pulse so the highlight animation replays.
            key={code + i + (pulse?.code === code ? pulse.at : "")}
            d={d}
            data-code={code}
            className={cn(
              "country-path",
              pulse?.code === code && "country-pulse",
              interactive && hoverClass,
            )}
            style={{ fill: FILL[statuses[code] ?? "none"] }}
            stroke={selected === code ? "var(--fg)" : hasPhotos ? "var(--photo-stroke)" : "var(--surface)"}
            strokeWidth={selected === code ? 1.5 : hasPhotos ? 1.4 : 0.5}
          />
        );
      })}
      {REGION_SHAPES.map(({ code, country, d }) => {
        const own = regionStatuses?.[code];
        const countryStatus = statuses[country];
        // Without region data (e.g. onboarding), every region just stands for its country.
        const dataCode = regionStatuses ? code : country;
        const fill = own ? FILL[own] : regionStatuses && countryStatus ? TINT[countryStatus] : FILL[countryStatus ?? "none"];
        const isSelected = selected === code || selected === country;
        const pulsing = pulse?.code === code || pulse?.code === country;
        return (
          <path
            key={code + (pulsing ? pulse!.at : "")}
            d={d}
            data-code={dataCode}
            className={cn("country-path", pulsing && "country-pulse", interactive && hoverClass)}
            style={{ fill }}
            stroke={isSelected ? "var(--fg)" : photos?.has(country) ? "var(--photo-stroke)" : "var(--surface)"}
            strokeWidth={isSelected ? 1.2 : 0.35}
          />
        );
      })}
    </>
  );
});

export function WorldMap({
  statuses,
  onSelect,
  selected,
  zoomable = true,
  legend = true,
  photoCountries,
  regionStatuses,
  onSelectRegion,
  phoneZoom,
  className,
}: {
  statuses: Record<string, CountryStatus>;
  onSelect?: (code: string) => void;
  /** Region statuses (US states, Canadian provinces, ...). With `onSelectRegion`, clicking a region opens it instead of its country. */
  regionStatuses?: Record<string, CountryStatus>;
  onSelectRegion?: (code: string) => void;
  selected?: string | null;
  zoomable?: boolean;
  legend?: boolean;
  /** Countries with photos; enables the "With photos" legend toggle. */
  photoCountries?: string[];
  /** Open zoomed in this much on phones (the full-screen /map page). */
  phoneZoom?: number;
  className?: string;
}) {
  const pulse = useUI((s) => s.pulse);
  const [showPhotos, setShowPhotos] = useState(false);
  const photoSet = useMemo(
    () => (showPhotos && photoCountries ? new Set(photoCountries) : null),
    [showPhotos, photoCountries],
  );
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const g = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const { zoomed, zoomBy, reset } = useMapZoom(svg, g, { width: W, height: H }, zoomable, undefined, phoneZoom);

  const codeFrom = (target: EventTarget) => (target as Element).getAttribute?.("data-code");

  return (
    <div ref={wrap} className={cn("relative overflow-hidden rounded-2xl bg-ocean bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--brand-bright)_6%,transparent),transparent_70%)]", className)}>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className={cn("block h-full w-full touch-pan-y", zoomable && zoomed && "touch-none")}
        role="img"
        aria-label="World map"
        onClick={(e) => {
          const code = codeFrom(e.target);
          if (!code) return;
          if (isRegion(code) && onSelectRegion) onSelectRegion(code);
          else if (onSelect) onSelect(isRegion(code) ? code.slice(0, 2) : code);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const code = codeFrom(e.target);
          const box = wrap.current?.getBoundingClientRect();
          if (!code || !box) return setHover(null);
          setHover({ code, x: e.clientX - box.left, y: e.clientY - box.top });
        }}
        onPointerLeave={() => setHover(null)}
      >
        <g ref={g}>
          <Shapes
            statuses={statuses}
            selected={selected}
            interactive={Boolean(onSelect)}
            photos={photoSet}
            pulse={pulse}
            regionStatuses={onSelectRegion ? (regionStatuses ?? {}) : undefined}
          />
        </g>
      </svg>

      {hover && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-fg shadow-float"
          style={{ left: hover.x, top: hover.y }}
        >
          {isRegion(hover.code) ? (
            <>
              <span className="mr-1">{getCountry(hover.code.slice(0, 2))?.flag}</span>
              {getRegion(hover.code)?.name}
              <span className="ml-1.5 font-medium text-muted">· {statusLabel(regionStatuses?.[hover.code])}</span>
            </>
          ) : (
            <>
              <span className="mr-1">{getCountry(hover.code)?.flag}</span>
              {countryName(hover.code)}
              <span className="ml-1.5 font-medium text-muted">· {statusLabel(statuses[hover.code])}</span>
            </>
          )}
        </div>
      )}

      {zoomable && <ZoomControls zoomed={zoomed} zoomBy={zoomBy} reset={reset} compact={Boolean(phoneZoom)} />}

      {legend && (
        <MapLegend
          className={cn("absolute bottom-3 left-3", zoomed ? "max-w-[calc(100%-7.5rem)]" : "max-w-[calc(100%-4.5rem)]", phoneZoom && "max-md:max-w-[calc(100%-4.5rem)]")}
          compact={Boolean(phoneZoom)}
          photos={showPhotos}
          onTogglePhotos={photoCountries?.length ? () => setShowPhotos((v) => !v) : undefined}
        />
      )}
    </div>
  );
}

function statusLabel(status: CountryStatus | undefined) {
  return status === "visited" ? "Visited" : status === "wishlist" ? "Want to visit" : "Not visited";
}
