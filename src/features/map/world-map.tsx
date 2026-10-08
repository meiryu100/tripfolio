"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/**
 * The map (d3 + ~100 KB of country shapes) is code-split and loaded on demand,
 * so pages without a map never download it.
 */
export const WorldMap = dynamic(() => import("./world-map-impl").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading map"
      className={cn("relative aspect-[4/3] w-full animate-pulse overflow-hidden rounded-2xl border border-border bg-ocean sm:aspect-[16/9] lg:aspect-[2/1]", className)}
    >
      <div className="absolute inset-[12%] rounded-[40%] bg-land/50 blur-2xl" />
    </div>
  );
}

export { MapLegend } from "./legend";

/** The USA states map, code-split like the world map. */
export const UsMap = dynamic(() => import("./us-map-impl").then((m) => m.UsMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
