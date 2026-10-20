import "server-only";
import { geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldRegions from "@/data/regions-world.json";
import usStates from "@/data/us-states-world.json";
import world from "@/data/world-110m.json";
import { worldProjection } from "@/lib/map-projection";
import { isRegionCountry } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";

/**
 * The world map as a standalone SVG string, for images rendered on the server
 * (share cards). Same projection and regions treatment (US states, Canadian provinces, ...) as the in-app map, with
 * the light theme's colors baked in since there's no CSS here.
 */

export const MAP_W = 960;

const COLORS = {
  visited: "#10b981",
  wishlist: "#f97316",
  land: "#d6e6f2",
  border: "#ffffff",
  // A region with no status of its own inside a marked country: 45% of the country's color over land.
  visitedTint: "#7dd2bf",
  wishlistTint: "#e6b28f",
};

const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
// Size the SVG to the map's own shape (about 2.3 : 1) instead of a fixed frame.
const fitted = worldProjection().fitWidth(MAP_W - 8, fc);
const [[, top], [, bottom]] = geoPath(fitted).bounds(fc);
export const MAP_H = Math.ceil(bottom - top) + 8;
const projection = fitted.fitExtent([[4, 4], [MAP_W - 4, MAP_H - 4]], fc);
// One decimal is plenty at share-card size and keeps the SVG small.
const path = geoPath(projection).digits(1);

const COUNTRY_SHAPES = fc.features.filter((f) => !isRegionCountry(String(f.id))).map((f) => ({ code: String(f.id), d: path(f) ?? "" }));
const usTopo = usStates as unknown as Topology<{ states: GeometryCollection }>;
const regionsTopo = worldRegions as unknown as Topology<{ regions: GeometryCollection }>;
const REGION_SHAPES = [
  ...(feature(usTopo, usTopo.objects.states) as FeatureCollection<Geometry>).features,
  ...(feature(regionsTopo, regionsTopo.objects.regions) as FeatureCollection<Geometry>).features,
].map((f) => ({ code: String(f.id), country: String(f.id).slice(0, 2), d: path(f) ?? "" }));

export function worldMapSvg(statuses: Record<string, CountryStatus>, regionStatuses: Record<string, CountryStatus> = {}) {
  const fill = (s: CountryStatus | undefined) => (s === "visited" ? COLORS.visited : s === "wishlist" ? COLORS.wishlist : COLORS.land);
  const regionFill = (code: string, country: string) => {
    const own = regionStatuses[code];
    if (own) return fill(own);
    const c = statuses[country];
    return c === "visited" ? COLORS.visitedTint : c === "wishlist" ? COLORS.wishlistTint : COLORS.land;
  };
  const shapes = [
    ...COUNTRY_SHAPES.map(({ code, d }) => `<path d="${d}" fill="${fill(statuses[code])}"/>`),
    ...REGION_SHAPES.map(({ code, country, d }) => `<path d="${d}" fill="${regionFill(code, country)}"/>`),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}"><g stroke="${COLORS.border}" stroke-width="0.5" stroke-linejoin="round">${shapes}</g></svg>`;
}
