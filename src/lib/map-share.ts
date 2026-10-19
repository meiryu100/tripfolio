import { getCountry } from "@/lib/countries";
import { getRegion } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";

/**
 * A map made without an account, carried in a URL: `/m?v=<visited>&w=<want to go>`, each a comma-separated
 * list of country codes and US state codes (`US-CA`). Nothing is stored on the server. Shared by the
 * /m page, the share image and the "Share my map" button on the try-it map.
 */

const MAX_PARAM_LENGTH = 2000;

export interface SharedMap {
  statuses: Record<string, CountryStatus>;
  regionStatuses: Record<string, CountryStatus>;
}

/** The `v` and `w` query values for a try-it map's picks (countries and states together). */
export function encodeSharedMap(statuses: Record<string, CountryStatus>, regionStatuses: Record<string, CountryStatus>) {
  const all = { ...statuses, ...regionStatuses };
  const list = (s: CountryStatus) =>
    Object.keys(all)
      .filter((code) => all[code] === s)
      .sort()
      .join(",");
  return { v: list("visited"), w: list("wishlist") };
}

/** Reads `v` and `w`, keeping only codes we know; anything else (or an oversized value) is ignored. */
export function parseSharedMap(v: string | null | undefined, w: string | null | undefined): SharedMap {
  const map: SharedMap = { statuses: {}, regionStatuses: {} };
  const add = (raw: string | null | undefined, status: CountryStatus) => {
    if (!raw || raw.length > MAX_PARAM_LENGTH) return;
    for (const code of raw.split(",")) {
      const region = getRegion(code);
      if (region) map.regionStatuses[region.code] = status;
      else if (/^[A-Z]{2}$/.test(code) && getCountry(code)) map.statuses[code] = status;
    }
  };
  // Visited first so a code listed in both stays visited.
  add(w, "wishlist");
  add(v, "visited");
  // The USA follows its states, as on the try-it map: any visited state → visited, else any wished state → want to go.
  const states = Object.values(map.regionStatuses);
  if (!map.statuses.US && states.length) map.statuses.US = states.includes("visited") ? "visited" : "wishlist";
  return map;
}

/** The share link for a try-it map, tagged so sign-ups from it are counted (see src/lib/attribution.ts). */
export function sharedMapPath(statuses: Record<string, CountryStatus>, regionStatuses: Record<string, CountryStatus>) {
  const { v, w } = encodeSharedMap(statuses, regionStatuses);
  const q = new URLSearchParams();
  if (v) q.set("v", v);
  if (w) q.set("w", w);
  q.set("utm_source", "share");
  q.set("utm_medium", "card");
  return `/m?${q}`;
}
