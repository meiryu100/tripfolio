"use client";

import { geoConicConformal, geoConicEqualArea, geoPath, type GeoProjection } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { memo, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import states from "us-atlas/states-albers-10m.json";
import worldRegions from "@/data/regions-world.json";
import { getRegion, REGION_COUNTRIES, type RegionCountry, US_FIPS_TO_CODE } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { MapLegend } from "./legend";
import { useMapZoom, ZoomControls } from "./zoom";

interface Layout {
  width: number;
  height: number;
  shapes: { code: string; d: string }[];
  /** Shared borders, drawn once on top. */
  borders: string;
}

const W = 975;

// us-atlas ships the US already projected (Albers USA, Alaska & Hawaii as insets) to 975×610.
function usLayout(): Layout {
  const topo = states as unknown as Topology<{ states: GeometryCollection; nation: GeometryCollection }>;
  const fc = feature(topo, topo.objects.states) as FeatureCollection<Geometry>;
  const path = geoPath();
  return {
    width: W,
    height: 610,
    shapes: fc.features.map((f) => ({ code: US_FIPS_TO_CODE[String(f.id)], d: path(f) ?? "" })).filter((s) => s.code),
    borders: path(mesh(topo, topo.objects.states, (a, b) => a !== b)) ?? "",
  };
}

// Each country in the projection its own mapping agency uses (Statistics Canada's Lambert, Geoscience Australia's Albers).
const PROJECTIONS: Record<Exclude<RegionCountry, "US">, () => GeoProjection> = {
  CA: () => geoConicConformal().rotate([96, 0]).parallels([49, 77]),
  AU: () => geoConicEqualArea().rotate([-132, 0]).parallels([-18, -36]),
};

/** Other countries: their shapes from the world map's regions file, projected to fill the width. */
function projectedLayout(country: Exclude<RegionCountry, "US">): Layout {
  const topo = worldRegions as unknown as Topology<{ regions: GeometryCollection }>;
  const object: GeometryCollection = {
    type: "GeometryCollection",
    geometries: topo.objects.regions.geometries.filter((g) => String(g.id).startsWith(`${country}-`)),
  };
  const fc = feature(topo, object) as FeatureCollection<Geometry>;
  const pad = 8;
  const fitted = PROJECTIONS[country]().fitWidth(W - pad * 2, fc);
  const [[, top], [, bottom]] = geoPath(fitted).bounds(fc);
  const height = Math.ceil(bottom - top) + pad * 2;
  const path = geoPath(fitted.fitExtent([[pad, pad], [W - pad, height - pad]], fc));
  return {
    width: W,
    height,
    shapes: fc.features.map((f) => ({ code: String(f.id), d: path(f) ?? "" })),
    borders: path(mesh(topo, object, (a, b) => a !== b)) ?? "",
  };
}

const layouts = new Map<RegionCountry, Layout>();
function layoutOf(country: RegionCountry) {
  let layout = layouts.get(country);
  if (!layout) layouts.set(country, (layout = country === "US" ? usLayout() : projectedLayout(country)));
  return layout;
}

const FILL: Record<CountryStatus | "none", string> = {
  visited: "var(--visited-fill)",
  wishlist: "var(--wishlist-fill)",
  none: "var(--land)",
};

const Shapes = memo(function Shapes({
  layout,
  statuses,
  selected,
  interactive,
  pulse,
}: {
  layout: Layout;
  statuses: Record<string, CountryStatus>;
  selected?: string | null;
  interactive: boolean;
  pulse: { code: string; at: number } | null;
}) {
  return (
    <>
      {layout.shapes.map(({ code, d }) => (
        <path
          key={code + (pulse?.code === code ? pulse.at : "")}
          d={d}
          data-code={code}
          className={cn(
            "country-path",
            pulse?.code === code && "country-pulse",
            interactive && "cursor-pointer hover:brightness-95 dark:hover:brightness-125",
          )}
          style={{ fill: FILL[statuses[code] ?? "none"] }}
          stroke={selected === code ? "var(--fg)" : "none"}
          strokeWidth={selected === code ? 1.5 : 0}
        />
      ))}
      {/* Shared borders drawn once on top, so they stay crisp at every zoom level. */}
      <path d={layout.borders} fill="none" stroke="var(--surface)" strokeWidth={0.75} strokeLinejoin="round" className="pointer-events-none" style={{ vectorEffect: "non-scaling-stroke" }} />
    </>
  );
});

/** One country's regions map (US states, Canadian provinces & territories, ...). */
export function RegionMap({
  country,
  statuses,
  onSelect,
  selected,
  legend = true,
  className,
}: {
  country: RegionCountry;
  statuses: Record<string, CountryStatus>;
  onSelect?: (code: string) => void;
  selected?: string | null;
  legend?: boolean;
  className?: string;
}) {
  const layout = useMemo(() => layoutOf(country), [country]);
  const pulse = useUI((s) => s.pulse);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const g = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const { zoomed, zoomBy, reset } = useMapZoom(svg, g, { width: layout.width, height: layout.height }, true, 8);
  const codeFrom = (t: EventTarget) => (t as Element).getAttribute?.("data-code");

  return (
    <div
      ref={wrap}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-ocean bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--brand-bright)_6%,transparent),transparent_70%)]",
        className,
      )}
    >
      <svg
        ref={svg}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className={cn("block h-full w-full touch-pan-y px-2 pt-14 pb-2 sm:px-4 sm:pt-16 sm:pb-4", zoomed && "touch-none")}
        role="img"
        aria-label={`Map of ${REGION_COUNTRIES[country].name}`}
        onClick={(e) => {
          const code = codeFrom(e.target);
          if (code && onSelect) onSelect(code);
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
          <Shapes layout={layout} statuses={statuses} selected={selected} interactive={Boolean(onSelect)} pulse={pulse} />
        </g>
      </svg>

      {hover && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-fg shadow-float"
          style={{ left: hover.x, top: hover.y }}
        >
          {getRegion(hover.code)?.name}
          <span className="ml-1.5 font-medium text-muted">
            · {statuses[hover.code] === "visited" ? "Visited" : statuses[hover.code] === "wishlist" ? "Want to visit" : "Not visited"}
          </span>
        </div>
      )}

      <ZoomControls zoomed={zoomed} zoomBy={zoomBy} reset={reset} />
      {legend && (
        <MapLegend className={cn("absolute bottom-3 left-3", zoomed ? "max-w-[calc(100%-7.5rem)]" : "max-w-[calc(100%-4.5rem)]")} />
      )}
    </div>
  );
}
