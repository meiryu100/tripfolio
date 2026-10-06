"use client";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { FeatureCollection, Geometry } from "geojson";
import { Maximize2, Minus, Plus } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "@/data/world-110m.json";
import { countryName, getCountry } from "@/lib/countries";
import { useUI } from "@/lib/ui";
import type { CountryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapLegend } from "./legend";

const W = 960;
const H = 500;

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
const projection = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], fc);
const pathGen = geoPath(projection);
const SHAPES = fc.features.map((f) => ({ code: String(f.id), d: pathGen(f) ?? "" }));

const FILL: Record<CountryStatus | "none", string> = {
  visited: "var(--visited-fill)",
  wishlist: "var(--wishlist-fill)",
  none: "var(--land)",
};

const Shapes = memo(function Shapes({
  statuses,
  selected,
  interactive,
  photos,
  pulse,
}: {
  statuses: Record<string, CountryStatus>;
  selected?: string | null;
  interactive: boolean;
  photos: Set<string> | null;
  pulse: { code: string; at: number } | null;
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
              interactive &&
                "cursor-pointer hover:brightness-95 hover:[filter:drop-shadow(0_0_4px_color-mix(in_oklab,var(--brand-bright)_40%,transparent))] dark:hover:brightness-125",
            )}
            style={{ fill: FILL[statuses[code] ?? "none"] }}
            stroke={selected === code ? "var(--fg)" : hasPhotos ? "var(--photo-stroke)" : "var(--surface)"}
            strokeWidth={selected === code ? 1.5 : hasPhotos ? 1.4 : 0.5}
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
  className,
}: {
  statuses: Record<string, CountryStatus>;
  onSelect?: (code: string) => void;
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
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomable || !svg.current) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [W, H]])
      .clickDistance(5)
      .filter((e: Event) => {
        // Wheel zoom only with a modifier so the page still scrolls normally.
        if (e.type === "wheel") return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
        return !(e as MouseEvent).button;
      })
      .on("zoom", (e) => {
        g.current?.setAttribute("transform", e.transform.toString());
        setZoomed(e.transform.k > 1.01);
      });
    zoomRef.current = z;
    // d3-zoom sets touch-action:none inline; drop it so the page can still scroll
    // vertically on phones until the map is zoomed in (handled by class names).
    const sel = select(svg.current).call(z).style("touch-action", null);
    return () => {
      sel.on(".zoom", null);
    };
  }, [zoomable]);

  const zoomBy = (k: number) => {
    if (svg.current && zoomRef.current)
      select(svg.current).transition().duration(250).call(zoomRef.current.scaleBy, k);
  };
  const reset = () => {
    if (svg.current && zoomRef.current)
      select(svg.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity);
  };

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
          <Shapes statuses={statuses} selected={selected} interactive={Boolean(onSelect)} photos={photoSet} pulse={pulse} />
        </g>
      </svg>

      {hover && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-fg shadow-float"
          style={{ left: hover.x, top: hover.y }}
        >
          <span className="mr-1">{getCountry(hover.code)?.flag}</span>
          {countryName(hover.code)}
          <span className="ml-1.5 font-medium text-muted">
            · {statuses[hover.code] === "visited" ? "Visited" : statuses[hover.code] === "wishlist" ? "Want to visit" : "Not visited"}
          </span>
        </div>
      )}

      {zoomable && (
        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-xl border border-border glass shadow-card">
          <MapButton label="Zoom in" onClick={() => zoomBy(1.6)}>
            <Plus className="size-4" />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
            <Minus className="size-4" />
          </MapButton>
          {zoomed && (
            <MapButton label="Reset zoom" onClick={reset}>
              <Maximize2 className="size-3.5" />
            </MapButton>
          )}
        </div>
      )}

      {legend && (
        <MapLegend
          className="absolute bottom-3 left-3 max-w-[calc(100%-4.5rem)]"
          photos={showPhotos}
          onTogglePhotos={photoCountries?.length ? () => setShowPhotos((v) => !v) : undefined}
        />
      )}
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center text-fg transition duration-200 hover:bg-surface-2 active:shadow-pressed not-last:border-b not-last:border-border"
    >
      {children}
    </button>
  );
}
