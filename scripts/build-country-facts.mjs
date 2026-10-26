// Builds src/data/country-facts.json: the extra facts shown on the public country pages
// (area, languages, currency, land borders, ...). Kept apart from countries.json, which ships
// to the browser, so those pages' facts don't add to every page's bundle.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const all = require("world-countries");
const cca3To2 = new Map(all.map((c) => [c.cca3, c.cca2]));

// Countries whose dial code the data splits into a one-digit root and many suffixes, so the
// generic rule below would show just "+3" or "+2". (+1 and +7 are real one-digit codes.)
const CALLING_CODES = { VA: "+379", SH: "+290", EH: "+212" };

function callingCode(c) {
  if (CALLING_CODES[c.cca2]) return CALLING_CODES[c.cca2];
  return c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : ""}` : "";
}

const facts = Object.fromEntries(
  all.map((c) => [
    c.cca2,
    {
      official: c.name.official,
      area: c.area > 0 ? Math.round(c.area) : null,
      landlocked: c.landlocked,
      borders: c.borders.map((b) => cca3To2.get(b)).filter(Boolean),
      languages: Object.values(c.languages ?? {}),
      currencies: Object.values(c.currencies ?? {}).map((x) => x.name),
      demonym: c.demonyms?.eng?.m ?? "",
      callingCode: callingCode(c),
      tld: c.tld?.[0] ?? "",
      latlng: c.latlng,
    },
  ]),
);
writeFileSync("src/data/country-facts.json", JSON.stringify(facts));
console.log(Object.keys(facts).length, "countries");
