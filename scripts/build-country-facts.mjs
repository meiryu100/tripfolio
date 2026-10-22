// Builds src/data/country-facts.json: the extra facts shown on the public country pages
// (area, languages, currency, land borders, ...). Kept apart from countries.json, which ships
// to the browser, so those pages' facts don't add to every page's bundle.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const all = require("world-countries");
const cca3To2 = new Map(all.map((c) => [c.cca3, c.cca2]));

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
      callingCode: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : ""}` : "",
      tld: c.tld?.[0] ?? "",
      latlng: c.latlng,
    },
  ]),
);
writeFileSync("src/data/country-facts.json", JSON.stringify(facts));
console.log(Object.keys(facts).length, "countries");
