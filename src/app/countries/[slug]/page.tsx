import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog-shell";
import { buttonClass } from "@/components/button-class";
import { COUNTRIES, countrySlug, getCountryBySlug } from "@/lib/countries";

/**
 * Public, statically generated page per country, for searches like "trips to Japan" or "Japan
 * travel map". General facts only — never any user's data.
 */

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ slug: countrySlug(c) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const country = getCountryBySlug((await params).slug);
  if (!country) return {};
  const url = `/countries/${countrySlug(country)}`;
  const title = `Been to ${country.name}? Add it to your travel map`;
  const description = `${country.name} is in ${country.subregion || country.continent}${country.capital ? `, with ${country.capital} as its capital` : ""}. Mark it on your free countries visited map and keep your trips and photos from ${country.name}.`;
  return {
    title: `${title} | Tripfolio`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const country = getCountryBySlug((await params).slug);
  if (!country) notFound();

  const neighbours = COUNTRIES.filter((c) => c.code !== country.code && c.subregion === country.subregion && c.subregion)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);
  const utm = `utm_source=country-page&utm_medium=organic&utm_campaign=${countrySlug(country)}`;

  return (
    <BlogShell>
      <Link href="/countries" className="text-sm font-medium text-brand hover:underline">
        ← All countries
      </Link>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-6xl leading-none" aria-hidden>
          {country.flag}
        </span>
        <h1 className="min-w-0 text-4xl leading-[1.05] font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{country.name}</h1>
      </div>

      <dl className="mt-6 grid gap-3 rounded-3xl border border-border bg-surface/85 p-5 shadow-card sm:grid-cols-3">
        {country.capital && <Fact label="Capital" value={country.capital} />}
        <Fact label="Continent" value={country.continent} />
        {country.subregion && <Fact label="Region" value={country.subregion} />}
      </dl>

      <div className="mt-8 grid gap-4 text-[17px] leading-relaxed text-muted">
        <p>
          {country.sovereign ? (
            <>
              {country.name} is one of the 195 countries Tripfolio counts toward your &ldquo;% of the world&rdquo;.
            </>
          ) : (
            <>
              {country.name} is a territory: it shows on your map when you mark it, but it doesn&apos;t change your count of 195
              countries or your &ldquo;% of the world&rdquo;.
            </>
          )}{" "}
          Been there? Tap it on your map and it turns green. Dreaming of it? Mark it &ldquo;Want to visit&rdquo; and it turns orange,
          so your map shows where you&apos;ve been and where you&apos;re going next.
        </p>
        <p>
          Add the trip behind it too: the dates, the cities, a few lines about what you did and your best photos from {country.name}.
          It&apos;s free, runs in your browser, and you can follow friends to see who else has been.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={`/countries-visited-map?${utm}`} className={buttonClass("primary", "lg")}>
          Try the map
        </Link>
        <Link href={`/register?${utm}`} className={buttonClass("secondary", "lg")}>
          Create my map
        </Link>
      </div>

      {neighbours.length > 0 && (
        <section className="mt-12" aria-labelledby="nearby">
          <h2 id="nearby" className="text-2xl font-bold tracking-tight">
            More in {country.subregion}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {neighbours.map((c) => (
              <li key={c.code}>
                <Link href={`/countries/${countrySlug(c)}`} className="flex min-h-10 items-center gap-2 rounded-lg px-1 hover:text-brand hover:underline">
                  <span aria-hidden>{c.flag}</span>
                  <span className="[overflow-wrap:anywhere]">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-sm text-muted">
        Counting your countries?{" "}
        <Link href="/blog/how-many-countries-have-i-visited" className="font-medium text-brand hover:underline">
          How to work out how many countries you&apos;ve visited
        </Link>
        .
      </p>
    </BlogShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
