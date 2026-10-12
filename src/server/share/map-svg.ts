import "server-only";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usStates from "@/data/us-states-world.json";
import world from "@/data/world-110m.json";
import type { CountryStatus } from "@/lib/types";

/**
 * The world map as a standalone SVG string, for images rendered on the server
 * (share cards). Same projection and US-states treatment as the in-app map, with
 * the light theme's colors baked in since there's no CSS here.
 */

export const MAP_W = 960;
export const MAP_H = 500;

const COLORS = {
  visited: "#10b981",
  wishlist: "#f97316",
  land: "#d6e6f2",
  border: "#ffffff",
  // A state with no status of its own inside a marked USA: 45% of the USA's color over land.
  visitedTint: "#7dd2bf",
  wishlistTint: "#e6b28f",
};

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
const projection = geoNaturalEarth1().fitExtent([[4, 4], [MAP_W - 4, MAP_H - 4]], fc);
// One decimal is plenty at share-card size and keeps the SVG small.
const path = geoPath(projection).digits(1);

const COUNTRY_SHAPES = fc.features.filter((f) => f.id !== "US").map((f) => ({ code: String(f.id), d: path(f) ?? "" }));
const usTopo = usStates as unknown as Topology<{ states: GeometryCollection }>;
const STATE_SHAPES = (feature(usTopo, usTopo.objects.states) as FeatureCollection<Geometry>).features.map((f) => ({
  code: String(f.id),
  d: path(f) ?? "",
}));

export function worldMapSvg(statuses: Record<string, CountryStatus>, regionStatuses: Record<string, CountryStatus> = {}) {
  const fill = (s: CountryStatus | undefined) => (s === "visited" ? COLORS.visited : s === "wishlist" ? COLORS.wishlist : COLORS.land);
  const us = statuses.US;
  const stateFill = (code: string) => {
    const own = regionStatuses[code];
    if (own) return fill(own);
    return us === "visited" ? COLORS.visitedTint : us === "wishlist" ? COLORS.wishlistTint : COLORS.land;
  };
  const shapes = [
    ...COUNTRY_SHAPES.map(({ code, d }) => `<path d="${d}" fill="${fill(statuses[code])}"/>`),
    ...STATE_SHAPES.map(({ code, d }) => `<path d="${d}" fill="${stateFill(code)}"/>`),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}"><g stroke="${COLORS.border}" stroke-width="0.5" stroke-linejoin="round">${shapes}</g></svg>`;
}
