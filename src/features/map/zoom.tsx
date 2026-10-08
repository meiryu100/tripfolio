"use client";

import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * Pan/zoom for an SVG map: pinch and ⌘/Ctrl+wheel to zoom, drag to pan.
 * Plain wheel still scrolls the page, and on phones one finger scrolls the
 * page until you've zoomed in.
 */
export function useMapZoom(
  svg: RefObject<SVGSVGElement | null>,
  g: RefObject<SVGGElement | null>,
  size: { width: number; height: number },
  enabled = true,
  maxScale = 10,
) {
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const { width, height } = size;

  useEffect(() => {
    if (!enabled || !svg.current) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxScale])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .clickDistance(5)
      .filter((e: Event) => {
        if (e.type === "wheel") return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
        return !(e as MouseEvent).button;
      })
      .on("zoom", (e) => {
        g.current?.setAttribute("transform", e.transform.toString());
        setZoomed(e.transform.k > 1.01);
      });
    zoomRef.current = z;
    // d3-zoom sets touch-action:none inline; drop it so the page can still scroll.
    const sel = select(svg.current).call(z).style("touch-action", null);
    return () => {
      sel.on(".zoom", null);
    };
  }, [enabled, svg, g, width, height, maxScale]);

  return {
    zoomed,
    zoomBy: (k: number) => {
      if (svg.current && zoomRef.current) select(svg.current).transition().duration(250).call(zoomRef.current.scaleBy, k);
    },
    reset: () => {
      if (svg.current && zoomRef.current)
        select(svg.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity);
    },
  };
}

/** + / − stack, with "reset" appearing to its left once zoomed. */
export function ZoomControls({ zoomed, zoomBy, reset }: { zoomed: boolean; zoomBy: (k: number) => void; reset: () => void }) {
  return (
    <div className="absolute right-3 bottom-3 flex items-end gap-2">
      {zoomed && (
        <div className="animate-fade glass overflow-hidden rounded-xl border border-border shadow-card">
          <MapButton label="Reset zoom" onClick={reset}>
            <Maximize2 className="size-3.5" />
          </MapButton>
        </div>
      )}
      <div className="glass flex flex-col overflow-hidden rounded-xl border border-border shadow-card">
        <MapButton label="Zoom in" onClick={() => zoomBy(1.6)}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <Minus className="size-4" />
        </MapButton>
      </div>
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
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
