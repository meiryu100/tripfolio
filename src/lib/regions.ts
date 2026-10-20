/**
 * Sub-national regions (ISO 3166-2) for the countries that have their own regions map:
 * US states, Canadian provinces & territories, Australian states & territories.
 * Add another country by listing its regions and its entry in REGION_COUNTRIES here,
 * and adding its shapes to scripts/build-world-regions.mjs.
 */

export type RegionKind = "State" | "Province" | "Territory" | "Federal district";

export interface Region {
  /** ISO 3166-2 code, e.g. "US-CA". */
  code: string;
  /** Country code, e.g. "US". */
  country: RegionCountry;
  name: string;
  /** Short label, e.g. "CA". */
  abbr: string;
  kind: RegionKind;
  /** Counts toward "x / 50 states" (DC doesn't). */
  counts: boolean;
}

// FIPS code (used by the us-atlas shapes) → state.
const US: Record<string, [abbr: string, name: string]> = {
  "01": ["AL", "Alabama"], "02": ["AK", "Alaska"], "04": ["AZ", "Arizona"], "05": ["AR", "Arkansas"],
  "06": ["CA", "California"], "08": ["CO", "Colorado"], "09": ["CT", "Connecticut"], "10": ["DE", "Delaware"],
  "11": ["DC", "District of Columbia"], "12": ["FL", "Florida"], "13": ["GA", "Georgia"], "15": ["HI", "Hawaii"],
  "16": ["ID", "Idaho"], "17": ["IL", "Illinois"], "18": ["IN", "Indiana"], "19": ["IA", "Iowa"],
  "20": ["KS", "Kansas"], "21": ["KY", "Kentucky"], "22": ["LA", "Louisiana"], "23": ["ME", "Maine"],
  "24": ["MD", "Maryland"], "25": ["MA", "Massachusetts"], "26": ["MI", "Michigan"], "27": ["MN", "Minnesota"],
  "28": ["MS", "Mississippi"], "29": ["MO", "Missouri"], "30": ["MT", "Montana"], "31": ["NE", "Nebraska"],
  "32": ["NV", "Nevada"], "33": ["NH", "New Hampshire"], "34": ["NJ", "New Jersey"], "35": ["NM", "New Mexico"],
  "36": ["NY", "New York"], "37": ["NC", "North Carolina"], "38": ["ND", "North Dakota"], "39": ["OH", "Ohio"],
  "40": ["OK", "Oklahoma"], "41": ["OR", "Oregon"], "42": ["PA", "Pennsylvania"], "44": ["RI", "Rhode Island"],
  "45": ["SC", "South Carolina"], "46": ["SD", "South Dakota"], "47": ["TN", "Tennessee"], "48": ["TX", "Texas"],
  "49": ["UT", "Utah"], "50": ["VT", "Vermont"], "51": ["VA", "Virginia"], "53": ["WA", "Washington"],
  "54": ["WV", "West Virginia"], "55": ["WI", "Wisconsin"], "56": ["WY", "Wyoming"],
};

export const US_STATES: Region[] = Object.values(US)
  .map(([abbr, name]): Region => ({
    code: `US-${abbr}`,
    country: "US",
    abbr,
    name,
    kind: abbr === "DC" ? "Federal district" : "State",
    counts: abbr !== "DC",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const CA: [abbr: string, name: string, kind: RegionKind][] = [
  ["AB", "Alberta", "Province"], ["BC", "British Columbia", "Province"], ["MB", "Manitoba", "Province"],
  ["NB", "New Brunswick", "Province"], ["NL", "Newfoundland and Labrador", "Province"], ["NS", "Nova Scotia", "Province"],
  ["ON", "Ontario", "Province"], ["PE", "Prince Edward Island", "Province"], ["QC", "Quebec", "Province"],
  ["SK", "Saskatchewan", "Province"], ["NT", "Northwest Territories", "Territory"], ["NU", "Nunavut", "Territory"],
  ["YT", "Yukon", "Territory"],
];

const AU: [abbr: string, name: string, kind: RegionKind][] = [
  ["NSW", "New South Wales", "State"], ["QLD", "Queensland", "State"], ["SA", "South Australia", "State"],
  ["TAS", "Tasmania", "State"], ["VIC", "Victoria", "State"], ["WA", "Western Australia", "State"],
  ["ACT", "Australian Capital Territory", "Territory"], ["NT", "Northern Territory", "Territory"],
];

const listOf = (country: RegionCountry, rows: [string, string, RegionKind][]): Region[] =>
  rows
    .map(([abbr, name, kind]) => ({ code: `${country}-${abbr}`, country, abbr, name, kind, counts: true }))
    .sort((a, b) => a.name.localeCompare(b.name));

const REGIONS: Record<RegionCountry, Region[]> = { US: US_STATES, CA: listOf("CA", CA), AU: listOf("AU", AU) };

export const US_FIPS_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US).map(([fips, [abbr]]) => [fips, `US-${abbr}`]),
);

export interface RegionCountryInfo {
  /** Tab label, e.g. "USA". */
  label: string;
  flag: string;
  /** Full name, e.g. "United States". */
  name: string;
  /** In a sentence, e.g. "the USA". */
  inSentence: string;
  /** One region, e.g. "state", "province or territory". */
  noun: string;
  /** Short form for tight spots, e.g. "Jump to a province…". */
  shortNoun: string;
  /** All of them, e.g. "states", "provinces and territories". */
  plural: string;
  /** e.g. "50 states" in "Open the 50 states map". */
  mapName: string;
  /** For counters, e.g. "US states" in "3 of 50 US states". */
  unit: string;
  /** Regions that count toward the "x / total" counter. */
  total: number;
}

/** Countries that have a regions map, in tab order. */
export const REGION_COUNTRIES = {
  US: { label: "USA", flag: "🇺🇸", name: "United States", inSentence: "the USA", noun: "state", shortNoun: "state", plural: "states", mapName: "50 states", unit: "US states", total: 50 },
  CA: {
    label: "Canada",
    flag: "🇨🇦",
    name: "Canada",
    inSentence: "Canada",
    noun: "province or territory",
    shortNoun: "province",
    plural: "provinces and territories",
    mapName: "provinces & territories",
    unit: "Canadian provinces & territories",
    total: 13,
  },
  AU: {
    label: "Australia",
    flag: "🇦🇺",
    name: "Australia",
    inSentence: "Australia",
    noun: "state or territory",
    shortNoun: "state",
    plural: "states and territories",
    mapName: "states & territories",
    unit: "Australian states & territories",
    total: 8,
  },
} as const satisfies Record<string, RegionCountryInfo>;
export type RegionCountry = keyof typeof REGION_COUNTRIES;
export const REGION_COUNTRY_CODES = Object.keys(REGION_COUNTRIES) as RegionCountry[];

const byCode = new Map(Object.values(REGIONS).flatMap((list) => list.map((r) => [r.code, r] as const)));

export function isRegionCountry(country: string): country is RegionCountry {
  return Object.hasOwn(REGION_COUNTRIES, country.toUpperCase());
}

export function getRegion(code: string): Region | undefined {
  return byCode.get(code.toUpperCase());
}

export function regionsOf(country: string): Region[] {
  const c = country.toUpperCase();
  return isRegionCountry(c) ? REGIONS[c] : [];
}

/** How many of a country's regions are visited (only those that count, so DC doesn't). */
export function countVisitedRegions(statuses: Record<string, string>, country: RegionCountry) {
  return Object.entries(statuses).filter(([code, s]) => s === "visited" && getRegion(code)?.country === country && getRegion(code)?.counts)
    .length;
}

/**
 * A country with regions follows them, as the server does when one is marked:
 * any visited region → visited, else any wished-for region → want to go.
 * Countries already marked keep their status.
 */
export function withRegionCountries<T extends Record<string, string>>(statuses: T, regionStatuses: Record<string, string>): T {
  const out: Record<string, string> = { ...statuses };
  for (const [code, s] of Object.entries(regionStatuses)) {
    const country = getRegion(code)?.country;
    if (!country || statuses[country]) continue;
    if (s === "visited" || !out[country]) out[country] = s;
  }
  return out as T;
}

/** "3 states" when they're all US states, else "3 regions". */
export function regionCountLabel(codes: string[]) {
  const word = codes.every((c) => c.toUpperCase().startsWith("US-")) ? "state" : "region";
  return `${codes.length} ${word}${codes.length === 1 ? "" : "s"}`;
}
