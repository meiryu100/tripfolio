// Builds a compact country index (src/data/countries.json) and a trimmed world
// topology (src/data/world-110m.json) keyed by ISO alpha-2 codes.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const all = require("world-countries");
const world = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));

const byNum = new Map(all.filter((c) => c.ccn3).map((c) => [String(Number(c.ccn3)), c]));
const byName = { "N. Cyprus": "CY", Somaliland: "SO", Kosovo: "XK" };

// Seven-continent model (the dataset groups the Americas together).
function continentOf(c) {
  if (c.region === "Americas") return c.subregion === "South America" ? "South America" : "North America";
  if (c.region === "Antarctic") return "Antarctica";
  return c.region; // Africa, Asia, Europe, Oceania
}

const countries = all
  .map((c) => ({
    code: c.cca2,
    name: c.name.common,
    capital: c.capital?.[0] ?? "",
    region: c.region,
    continent: continentOf(c),
    subregion: c.subregion ?? "",
    flag: c.flag,
    // UN members + the two observer states count toward "% of the world".
    sovereign: Boolean(c.unMember) || c.cca2 === "PS" || c.cca2 === "VA",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
writeFileSync("src/data/countries.json", JSON.stringify(countries));

const unmatched = [];
world.objects.countries.geometries = world.objects.countries.geometries
  .map((g) => {
    const code = (g.id && byNum.get(String(Number(g.id)))?.cca2) || byName[g.properties.name];
    if (!code) unmatched.push(g.properties.name);
    return { ...g, id: code, properties: {} };
  })
  .filter((g) => g.id && g.id !== "AQ");

// Overseas territories the source draws as part of another country, split into their own shape
// so marking the parent doesn't color a different continent (France → French Guiana in South America).
// `where` picks the territory's polygons by their first point [lon, lat].
const SPLITS = [{ from: "FR", to: "GF", where: ([lon]) => lon < -30 }];
const { feature } = require("topojson-client");
for (const { from, to, where } of SPLITS) {
  const i = world.objects.countries.geometries.findIndex((g) => g.id === from);
  const g = world.objects.countries.geometries[i];
  if (g?.type !== "MultiPolygon") throw new Error(`Can't split ${to} out of ${from}`);
  const polygons = feature(world, g).geometry.coordinates;
  const part = g.arcs.filter((_, k) => where(polygons[k][0][0]));
  const rest = g.arcs.filter((_, k) => !where(polygons[k][0][0]));
  if (!part.length || !rest.length) throw new Error(`No ${to} polygons found in ${from}`);
  world.objects.countries.geometries.splice(
    i,
    1,
    { type: rest.length === 1 ? "Polygon" : "MultiPolygon", arcs: rest.length === 1 ? rest[0] : rest, id: from, properties: {} },
    { type: part.length === 1 ? "Polygon" : "MultiPolygon", arcs: part.length === 1 ? part[0] : part, id: to, properties: {} },
  );
}
delete world.objects.land;
writeFileSync("src/data/world-110m.json", JSON.stringify(world));
console.log(countries.length, "countries;", world.objects.countries.geometries.length, "shapes; unmatched:", unmatched);
