// Builds src/data/us-states-world.json: US state shapes in geographic coordinates,
// simplified for the world map (the "USA only" map uses us-atlas' projected shapes).
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { presimplify, quantile, simplify } from "topojson-simplify";

const require = createRequire(import.meta.url);
const topo = JSON.parse(JSON.stringify(require("us-atlas/states-10m.json")));

// FIPS → ISO 3166-2 for the 50 states + DC (territories are separate countries on the world map).
const ABBR = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT",
  "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY",
};

topo.objects.states.geometries = topo.objects.states.geometries
  .filter((g) => ABBR[g.id])
  .map((g) => ({ ...g, id: `US-${ABBR[g.id]}`, properties: {} }));
delete topo.objects.nation;

// Keep the 10% most significant points: plenty at world scale, even zoomed in.
const pre = presimplify(topo);
const out = simplify(pre, quantile(pre, 0.1));
writeFileSync("src/data/us-states-world.json", JSON.stringify(out));
console.log(out.objects.states.geometries.length, "states →", JSON.stringify(out).length, "bytes");
