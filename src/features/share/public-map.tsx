"use client";

import { WorldMap } from "@/features/map/world-map";
import type { CountryStatus } from "@/lib/types";

/** Read-only world map for the public profile page (no country sheets — they need an account). */
export function PublicMap({ statuses, regionStatuses }: { statuses: Record<string, CountryStatus>; regionStatuses: Record<string, CountryStatus> }) {
  return (
    <WorldMap
      statuses={statuses}
      regionStatuses={regionStatuses}
      className="aspect-[4/3] w-full border border-border shadow-card sm:aspect-[16/9] lg:aspect-[2/1]"
    />
  );
}
