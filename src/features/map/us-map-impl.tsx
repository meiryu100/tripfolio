"use client";

import { geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { memo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import states from "us-atlas/states-albers-10m.json";
import { getRegion, US_FIPS_TO_CODE } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { MapLegend } from "./legend";
import { useMapZoom, ZoomControls } from "./zoom";

// us-atlas ships these shapes already projected (Albers USA, Alaska & Hawaii as insets) to 975×610.
const W = 975;
const H = 610;
const topo = states as unknown as Topology<{ states: GeometryCollection; nation: GeometryCollection }>;
const fc = feature(topo, topo.objects.states) as FeatureCollection<Geometry>;
const path = geoPath();
const SHAPES = fc.features
  .map((f) => ({ code: US_FIPS_TO_CODE[String(f.id)], d: path(f) ?? "" }))
  .filter((s) => s.code);
const BORDERS = path(mesh(topo, topo.objects.states, (a, b) => a !== b)) ?? "";

const FILL: Record<CountryStatus | "none", string> = {
  visited: "var(--visited-fill)",
  wishlist: "var(--wishlist-fill)",
  none: "var(--land)",
};

const Shapes = memo(function Shapes({
  statuses,
  selected,
  interactive,
  pulse,
}: {
  statuses: Record<string, CountryStatus>;
  selected?: string | null;
  interactive: boolean;
  pulse: { code: string; at: number } | null;
}) {
  return (
    <>
      {SHAPES.map(({ code, d }) => (
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
      <path d={BORDERS} fill="none" stroke="var(--surface)" strokeWidth={0.75} strokeLinejoin="round" className="pointer-events-none" style={{ vectorEffect: "non-scaling-stroke" }} />
    </>
  );
});

export function UsMap({
  statuses,
  onSelect,
  selected,
  legend = true,
  className,
}: {
  statuses: Record<string, CountryStatus>;
  onSelect?: (code: string) => void;
  selected?: string | null;
  legend?: boolean;
  className?: string;
}) {
  const pulse = useUI((s) => s.pulse);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const g = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const { zoomed, zoomBy, reset } = useMapZoom(svg, g, { width: W, height: H }, true, 8);
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
        viewBox={`0 0 ${W} ${H}`}
        className={cn("block h-full w-full touch-pan-y px-2 pt-14 pb-2 sm:px-4 sm:pt-16 sm:pb-4", zoomed && "touch-none")}
        role="img"
        aria-label="Map of the United States"
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
          <Shapes statuses={statuses} selected={selected} interactive={Boolean(onSelect)} pulse={pulse} />
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
