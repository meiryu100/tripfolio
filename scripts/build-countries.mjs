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
delete world.objects.land;
writeFileSync("src/data/world-110m.json", JSON.stringify(world));
console.log(countries.length, "countries;", world.objects.countries.geometries.length, "shapes; unmatched:", unmatched);
