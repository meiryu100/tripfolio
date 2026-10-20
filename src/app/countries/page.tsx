import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog-shell";
import { COUNTRIES, countrySlug } from "@/lib/countries";

/** Public index of every country page, grouped by continent — the entry point for search engines. */

const TITLE = "Every Country in the World — Mark the Ones You've Visited";
const DESCRIPTION = "All 195 countries and 55 territories by continent. Open any country and add it to your free travel map.";

export const metadata: Metadata = {
  title: `${TITLE} | Tripfolio`,
  description: DESCRIPTION,
  alternates: { canonical: "/countries" },
  openGraph: { type: "website", url: "/countries", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania", "Antarctica"];

export default function CountriesIndexPage() {
  return (
    <BlogShell>
      <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">Every country in the world</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">
        Tripfolio counts 195 countries — the 193 UN member states plus the Vatican and Palestine — and shows 55 territories on
        the map too. Pick a country to see where it is and add it to your map.
      </p>
      {CONTINENTS.map((continent) => {
        const list = COUNTRIES.filter((c) => c.continent === continent).sort((a, b) => a.name.localeCompare(b.name));
        if (list.length === 0) return null;
        const id = continent.toLowerCase().replace(/ /g, "-");
        return (
          <section key={continent} className="mt-10" aria-labelledby={id}>
            <h2 id={id} className="text-2xl font-bold tracking-tight">
              {continent} <span className="text-base font-medium text-muted">· {list.length}</span>
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <li key={c.code}>
                  <Link href={`/countries/${countrySlug(c)}`} className="flex min-h-10 items-center gap-2 rounded-lg px-1 hover:text-brand hover:underline">
                    <span aria-hidden>{c.flag}</span>
                    <span className="[overflow-wrap:anywhere]">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </BlogShell>
  );
}
