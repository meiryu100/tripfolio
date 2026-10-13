import type { CountryStatus } from "@/lib/types";

/**
 * Countries a visitor colored on the landing page's demo map, kept in this browser (sessionStorage)
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

export function parseDemoPicks(raw: string | null): { visited: string[]; wishlist: string[] } {
  if (!raw) return { visited: [], wishlist: [] };
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const pick = (s: CountryStatus) => Object.keys(v).filter((k) => /^[A-Z]{2}$/.test(k) && v[k] === s);
    return { visited: pick("visited"), wishlist: pick("wishlist") };
  } catch {
    return { visited: [], wishlist: [] };
  }
}

export function clearDemoPicks() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
