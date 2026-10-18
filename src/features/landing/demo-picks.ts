import type { CountryStatus } from "@/lib/types";

/**
 * Countries and US states a visitor colored on the landing page's demo map, kept in this browser (sessionStorage)
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
  /** US state codes like "US-CA". */
  visitedStates: string[];
  wishlistStates: string[];
}

export function parseDemoPicks(raw: string | null): DemoPicks {
  const empty = { visited: [], wishlist: [], visitedStates: [], wishlistStates: [] };
  if (!raw) return empty;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const pick = (re: RegExp, s: CountryStatus) => Object.keys(v).filter((k) => re.test(k) && v[k] === s);
    return {
      visited: pick(/^[A-Z]{2}$/, "visited"),
      wishlist: pick(/^[A-Z]{2}$/, "wishlist"),
      visitedStates: pick(/^US-[A-Z]{2}$/, "visited"),
      wishlistStates: pick(/^US-[A-Z]{2}$/, "wishlist"),
    };
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
