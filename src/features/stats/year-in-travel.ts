import { getCountry } from "@/lib/countries";
import type { Trip } from "@/lib/types";

/**
 * "Year in travel" numbers from a user's trips. Only trips with dates count: a trip belongs to a
 * year when it starts or ends in it. A country is "new" that year when the user's earliest dated
 * trip there is in that year.
 */
export interface YearInTravel {
  year: number;
  trips: Trip[];
  countries: string[];
  newCountries: string[];
  continents: string[];
  cities: number;
  photos: number;
  days: number;
  longest: { trip: Trip; days: number } | null;
}

const DAY = 86_400_000;
const daysOf = (t: Trip) => {
  if (!t.startDate) return 0;
  const end = t.endDate ?? t.startDate;
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(t.startDate)) / DAY) + 1);
};
const inYear = (t: Trip, year: number) => [t.startDate, t.endDate].some((d) => d?.startsWith(`${year}-`));

export function yearInTravel(all: Trip[], year: number): YearInTravel {
  const trips = all.filter((t) => inYear(t, year)).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  const countries = [...new Set(trips.map((t) => t.countryCode))];

  const firstVisit = new Map<string, string>();
  for (const t of all) {
    if (!t.startDate) continue;
    const prev = firstVisit.get(t.countryCode);
    if (!prev || t.startDate < prev) firstVisit.set(t.countryCode, t.startDate);
  }
  const newCountries = countries.filter((c) => firstVisit.get(c)?.startsWith(`${year}-`));

  const longest = trips.reduce<YearInTravel["longest"]>((best, t) => (daysOf(t) > (best?.days ?? 0) ? { trip: t, days: daysOf(t) } : best), null);
  return {
    year,
    trips,
    countries,
    newCountries,
    continents: [...new Set(countries.map((c) => getCountry(c)?.continent).filter((c): c is string => Boolean(c)))],
    cities: new Set(trips.flatMap((t) => t.cities.map((c) => c.trim().toLowerCase()))).size,
    photos: trips.reduce((sum, t) => sum + t.photoCount, 0),
    days: trips.reduce((sum, t) => sum + daysOf(t), 0),
    longest,
  };
}

/** The year the recap is about: this year, except in January, when last year just ended. */
export function recapYear(now: Date) {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

/** The recap is promoted from December 1 to January 31. */
export const isRecapSeason = (now: Date) => now.getMonth() === 11 || now.getMonth() === 0;
