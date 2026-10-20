import "server-only";
import { computeStats } from "@/features/stats/compute";
import { getMap } from "../services/countries";
import { getRegions } from "../services/regions";
import { getProfile } from "../services/users";

/** Everything a public profile page or share card shows, as `viewerId` is allowed to see it. */
export async function getProfileShare(viewerId: string | null, username: string) {
  const profile = await getProfile(viewerId, username);
  const [map, regions] = await Promise.all([getMap(viewerId, username), getRegions(viewerId, username)]);
  return { profile, map, regionStatuses: regions.statuses, stats: computeStats(map.statuses) };
}

export function shareSummary({ visited, explored, continentsVisited }: { visited: number; explored: number; continentsVisited: number }) {
  if (visited === 0) return "Just starting to map the world";
  const pct = explored >= 10 ? Math.round(explored) : Math.round(explored * 10) / 10;
  return `${visited} ${visited === 1 ? "country" : "countries"} · ${pct}% of the world · ${continentsVisited}/7 continents`;
}
