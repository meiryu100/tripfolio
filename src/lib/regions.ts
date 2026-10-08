/**
 * Sub-national regions (ISO 3166-2). Only the United States has a map today;
 * add another country by listing its regions here and providing its shapes.
 */

export interface Region {
  /** ISO 3166-2 code, e.g. "US-CA". */
  code: string;
  name: string;
  /** Short label, e.g. "CA". */
  abbr: string;
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
  .map(([abbr, name]) => ({ code: `US-${abbr}`, abbr, name, counts: abbr !== "DC" }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const US_FIPS_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(US).map(([fips, [abbr]]) => [fips, `US-${abbr}`]),
);

const byCode = new Map(US_STATES.map((r) => [r.code, r]));

/** Countries that have a regions map. */
export const REGION_COUNTRIES = { US: { label: "USA", unit: "states", total: US_STATES.filter((s) => s.counts).length } } as const;
export type RegionCountry = keyof typeof REGION_COUNTRIES;

export function getRegion(code: string): Region | undefined {
  return byCode.get(code.toUpperCase());
}

export function regionsOf(country: string): Region[] {
  return country.toUpperCase() === "US" ? US_STATES : [];
}

export function isRegionOf(country: string, code: string) {
  return code.toUpperCase().startsWith(`${country.toUpperCase()}-`) && byCode.has(code.toUpperCase());
}
