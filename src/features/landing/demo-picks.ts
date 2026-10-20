import { getRegion } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";

/**
 * Countries and regions (US states, Canadian provinces, ...) a visitor colored on the landing page's demo map, kept in this browser (sessionStorage)
 * so onboarding can offer to start from them. Browser storage can be unavailable; then it's a no-op.
 */
const KEY = "tf_demo_map";

export function saveDemoPicks(statuses: Record<string, CountryStatus>) {
  try {
    if (Object.keys(statuses).length) sessionStorage.setItem(KEY, JSON.stringify(statuses));
  } catch {
    // Private mode or storage blocked.
  }
}

/** Stable string snapshot for useSyncExternalStore; parse with parseDemoPicks. */
export function readDemoPicksRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export interface DemoPicks {
  visited: string[];
  wishlist: string[];
  /** Regions, e.g. `US-CA` or `AU-NSW`. Their countries are already in visited / wishlist. */
  states: { code: string; status: CountryStatus }[];
}

export function parseDemoPicks(raw: string | null): DemoPicks {
  const empty: DemoPicks = { visited: [], wishlist: [], states: [] };
  if (!raw) return empty;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const pick = (s: CountryStatus) => Object.keys(v).filter((k) => /^[A-Z]{2}$/.test(k) && v[k] === s);
    const states = Object.keys(v)
      .filter((k) => getRegion(k) && (v[k] === "visited" || v[k] === "wishlist"))
      .map((code) => ({ code, status: v[code] as CountryStatus }));
    return { visited: pick("visited"), wishlist: pick("wishlist"), states };
  } catch {
    return empty;
  }
}

export function clearDemoPicks() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
