import { COUNTRIES, getCountry } from "@/lib/countries";
import type { CountryStatus } from "@/lib/types";

export const CONTINENTS = ["Europe", "Asia", "Africa", "North America", "South America", "Oceania", "Antarctica"] as const;

/** Denominator for "% of the world": sovereign states in the dataset (195). */
export const WORLD_TOTAL = COUNTRIES.filter((c) => c.sovereign).length;

const CONTINENT_TOTALS = Object.fromEntries(
  CONTINENTS.map((name) => [name, COUNTRIES.filter((c) => c.continent === name && (c.sovereign || name === "Antarctica")).length]),
) as Record<(typeof CONTINENTS)[number], number>;

export const MILESTONES = [
  { count: 1, label: "First Country", icon: "flag" },
  { count: 10, label: "10 Countries", icon: "plane" },
  { count: 25, label: "25 Countries", icon: "globe" },
  { count: 50, label: "50 Countries", icon: "mountain" },
  { count: 100, label: "100 Countries", icon: "crown" },
] as const;

export interface TravelStats {
  visited: number; // sovereign countries only
  wishlist: number;
  explored: number; // %
  continents: { name: (typeof CONTINENTS)[number]; visited: number; total: number }[];
  continentsVisited: number;
  milestones: { count: number; label: string; icon: string; reached: boolean }[];
  nextMilestone: { count: number; label: string; remaining: number } | null;
}

export function computeStats(statuses: Record<string, CountryStatus>): TravelStats {
  let visited = 0;
  let wishlist = 0;
  const perContinent = new Map<string, number>();
  for (const [code, status] of Object.entries(statuses)) {
    if (status === "wishlist") {
      wishlist++;
      continue;
    }
    const c = getCountry(code);
    // Only the sovereign countries count (Antarctica still counts toward its continent).
    if (!c || (!c.sovereign && c.continent !== "Antarctica")) continue;
    if (c.sovereign) visited++;
    perContinent.set(c.continent, (perContinent.get(c.continent) ?? 0) + 1);
  }
  const continents = CONTINENTS.map((name) => ({ name, visited: perContinent.get(name) ?? 0, total: CONTINENT_TOTALS[name] }));
  const milestones = MILESTONES.map((m) => ({ ...m, reached: visited >= m.count }));
  const next = MILESTONES.find((m) => visited < m.count);
  return {
    visited,
    wishlist,
    explored: Math.min(100, (visited / WORLD_TOTAL) * 100),
    continents,
    continentsVisited: continents.filter((c) => c.visited > 0).length,
    milestones,
    nextMilestone: next ? { count: next.count, label: next.label, remaining: next.count - visited } : null,
  };
}
