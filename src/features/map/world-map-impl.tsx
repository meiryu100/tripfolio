"use client";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { memo, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usStates from "@/data/us-states-world.json";
import world from "@/data/world-110m.json";
import { countryName, getCountry } from "@/lib/countries";
import { getRegion } from "@/lib/regions";
import { useUI } from "@/lib/ui";
import type { CountryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapLegend } from "./legend";
import { useMapZoom, ZoomControls } from "./zoom";

const W = 960;
const H = 500;

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
const projection = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], fc);
const pathGen = geoPath(projection);
// The USA is drawn as its 50 states (+ DC) instead of one shape, in the same projection.
const SHAPES = fc.features.filter((f) => f.id !== "US").map((f) => ({ code: String(f.id), d: pathGen(f) ?? "" }));
const usTopo = usStates as unknown as Topology<{ states: GeometryCollection }>;
const STATE_SHAPES = (feature(usTopo, usTopo.objects.states) as FeatureCollection<Geometry>).features.map((f) => ({
  code: String(f.id),
  d: pathGen(f) ?? "",
}));

const isState = (code: string) => code.startsWith("US-");

const FILL: Record<CountryStatus | "none", string> = {
  visited: "var(--visited-fill)",
  wishlist: "var(--wishlist-fill)",
  none: "var(--land)",
};

/** A state with no status of its own, inside a USA that's marked: a lighter tint of the country's color. */
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
  /** State statuses; when given, US states are individually clickable. */
  regionStatuses?: Record<string, CountryStatus>;
}) {
  const usStatus = statuses.US;
  const usSelected = selected === "US";
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
      {STATE_SHAPES.map(({ code, d }) => {
        const own = regionStatuses?.[code];
        // Without state data (e.g. onboarding), every state just stands for the USA.
        const dataCode = regionStatuses ? code : "US";
        const fill = own ? FILL[own] : regionStatuses && usStatus ? TINT[usStatus] : FILL[usStatus ?? "none"];
        const isSelected = selected === code || usSelected;
        const pulsing = pulse?.code === code || pulse?.code === "US";
        return (
          <path
            key={code + (pulsing ? pulse!.at : "")}
            d={d}
            data-code={dataCode}
            className={cn("country-path", pulsing && "country-pulse", interactive && hoverClass)}
            style={{ fill }}
            stroke={isSelected ? "var(--fg)" : photos?.has("US") ? "var(--photo-stroke)" : "var(--surface)"}
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
  className,
}: {
  statuses: Record<string, CountryStatus>;
  onSelect?: (code: string) => void;
  /** US state statuses. With `onSelectRegion`, clicking a state opens the state instead of the USA. */
  regionStatuses?: Record<string, CountryStatus>;
  onSelectRegion?: (code: string) => void;
  selected?: string | null;
  zoomable?: boolean;
  legend?: boolean;
  /** Countries with photos; enables the "With photos" legend toggle. */
  photoCountries?: string[];
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
  const { zoomed, zoomBy, reset } = useMapZoom(svg, g, { width: W, height: H }, zoomable);

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
          if (isState(code) && onSelectRegion) onSelectRegion(code);
          else if (onSelect) onSelect(isState(code) ? "US" : code);
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
          {isState(hover.code) ? (
            <>
              <span className="mr-1">🇺🇸</span>
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

      {zoomable && <ZoomControls zoomed={zoomed} zoomBy={zoomBy} reset={reset} />}

      {legend && (
        <MapLegend
          className={cn("absolute bottom-3 left-3", zoomed ? "max-w-[calc(100%-7.5rem)]" : "max-w-[calc(100%-4.5rem)]")}
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
