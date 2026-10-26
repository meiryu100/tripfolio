import { geoBounds, geoContains, geoDistance } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldRegions from "@/data/regions-world.json";
import usStates from "@/data/us-states-world.json";
import world from "@/data/world-110m.json";
import { isRegionCountry } from "@/lib/regions";

/** Photos taken this close to a coast or a small island still count for the nearest land. */
const NEAR_KM = 25;
const EARTH_KM = 6371;

interface Shape {
  code: string;
  feature: Feature<Geometry>;
  /** [west, south, east, north]; west > east when the shape crosses the antimeridian. */
  box: [number, number, number, number];
}

function shapesOf(fc: FeatureCollection<Geometry>): Shape[] {
  return fc.features.map((f) => {
    const [[w, s], [e, n]] = geoBounds(f);
    return { code: String(f.id), feature: f, box: [w, s, e, n] };
  });
}

const worldTopo = world as unknown as Topology<{ countries: GeometryCollection }>;
const usTopo = usStates as unknown as Topology<{ states: GeometryCollection }>;
const regionsTopo = worldRegions as unknown as Topology<{ regions: GeometryCollection }>;
const COUNTRY_SHAPES = shapesOf(feature(worldTopo, worldTopo.objects.countries) as FeatureCollection<Geometry>);
const REGION_SHAPES = shapesOf({
  type: "FeatureCollection",
  features: [
    ...(feature(usTopo, usTopo.objects.states) as FeatureCollection<Geometry>).features,
    ...(feature(regionsTopo, regionsTopo.objects.regions) as FeatureCollection<Geometry>).features,
  ],
});

function inBox([w, s, e, n]: Shape["box"], lon: number, lat: number, pad: number) {
  if (lat < s - pad || lat > n + pad) return false;
  return w <= e ? lon >= w - pad && lon <= e + pad : lon >= w - pad || lon <= e + pad;
}

function* vertices(g: Geometry): Generator<Position> {
  if (g.type === "Polygon") for (const ring of g.coordinates) yield* ring;
  else if (g.type === "MultiPolygon") for (const poly of g.coordinates) for (const ring of poly) yield* ring;
  else if (g.type === "GeometryCollection") for (const part of g.geometries) yield* vertices(part);
}

/** The shape that contains the point, else the one with an outline vertex within NEAR_KM of it. */
function find(shapes: Shape[], lon: number, lat: number, within?: string): string | null {
  const candidates = shapes.filter((s) => (!within || s.code.startsWith(within)) && inBox(s.box, lon, lat, 0));
  const hit = candidates.find((s) => geoContains(s.feature, [lon, lat]));
  if (hit) return hit.code;

  // Pad the box by ~0.5° (about 55 km) before measuring distances.
  let best: { code: string; km: number } | null = null;
  for (const s of shapes) {
    if ((within && !s.code.startsWith(within)) || !inBox(s.box, lon, lat, 0.5)) continue;
    for (const [vx, vy] of vertices(s.feature.geometry)) {
      const km = geoDistance([lon, lat], [vx, vy]) * EARTH_KM;
      if (km <= NEAR_KM && (!best || km < best.km)) best = { code: s.code, km };
    }
  }
  return best?.code ?? null;
}

const cache = new Map<string, { country: string | null; region: string | null }>();

/** Country (ISO 3166-1 alpha-2) and, in the USA / Canada / Australia, the region (e.g. "US-CA") of a point. */
export function locate(lat: number, lon: number) {
  // Photos from one spot are common: share the work between points about 1 km apart.
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const country = find(COUNTRY_SHAPES, lon, lat);
  const region = country && isRegionCountry(country) ? find(REGION_SHAPES, lon, lat, `${country}-`) : null;
  const result = { country, region };
  cache.set(key, result);
  return result;
}
