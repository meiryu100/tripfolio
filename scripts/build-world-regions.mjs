// Builds src/data/regions-world.json: Canada's provinces & territories and Australia's
// states & territories in geographic coordinates, from Natural Earth's 1:50m admin-1 shapes.
// Used both on the world map and (projected per country) on each country's own map.
// The US has its own file (scripts/build-us-states.mjs).
import { writeFileSync } from "node:fs";
import { mergeArcs } from "topojson-client";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";

const SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_1_states_provinces.geojson";
// Natural Earth's country code → ours.
const COUNTRIES = { CAN: "CA", AUS: "AU" };
// Jervis Bay Territory is run as part of the ACT; fold it in so Australia has no hole.
const RENAME = { "AU-X02~": "AU-ACT" };

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const geo = await res.json();
const features = geo.features
  .filter((f) => COUNTRIES[f.properties.adm0_a3])
  .map((f) => {
    const code = RENAME[f.properties.iso_3166_2] ?? f.properties.iso_3166_2;
    if (!/^(CA|AU)-[A-Z]{2,3}$/.test(code)) throw new Error(`Unexpected region code ${code}`);
    return { type: "Feature", id: code, properties: {}, geometry: f.geometry };
  });

const topo = topology({ regions: { type: "FeatureCollection", features } }, 1e5);
// One geometry per region code (merges Jervis Bay into the ACT).
const byCode = new Map();
for (const g of topo.objects.regions.geometries) byCode.set(g.id, [...(byCode.get(g.id) ?? []), g]);
topo.objects.regions.geometries = [...byCode].map(([id, geoms]) =>
  geoms.length === 1 ? geoms[0] : { ...mergeArcs(topo, geoms), id },
);

// Keep the 12% most significant points: about the size of the US file, still sharp on a country-wide map.
const pre = presimplify(topo);
const out = simplify(pre, quantile(pre, 0.12));
writeFileSync("src/data/regions-world.json", JSON.stringify(out));
console.log(out.objects.regions.geometries.length, "regions →", JSON.stringify(out).length, "bytes");
