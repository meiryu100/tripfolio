import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog-shell";
import { buttonClass } from "@/components/button-class";
import facts from "@/data/country-facts.json";
import { COUNTRIES, countrySlug, getCountry, getCountryBySlug, LIMITED_RECOGNITION, nameInSentence, UNINHABITED } from "@/lib/countries";
import { breadcrumbs, jsonLd, WEBSITE_ID } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import type { Country } from "@/lib/types";

/**
 * Public, statically generated page per country, for searches like "where is Japan" or "Japan
 * travel map": where it is, a few facts, its neighbours and how Tripfolio counts it. General
 * facts only (src/data/country-facts.json, from `npm run country-facts`), never any user's data.
 */

interface Facts {
  official: string;
  area: number | null;
  landlocked: boolean;
  borders: string[];
  languages: string[];
  currencies: string[];
  callingCode: string;
  tld: string;
}

const factsOf = (c: Country) => (facts as Record<string, Facts>)[c.code];

const number = (n: number) => n.toLocaleString("en-US");
const list = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function kind(c: Country) {
  if (c.sovereign) return "country";
  if (c.code === "EH") return "disputed territory";
  if (LIMITED_RECOGNITION.has(c.code)) return "partially recognized state";
  return "territory";
}

/** Does it count toward the 195? One short answer, used on the page and in the FAQ markup. */
function countingAnswer(c: Country) {
  const name = nameInSentence(c, true);
  if (c.code === "PS" || c.code === "VA")
    return `Yes. ${name} is one of the two UN observer states, so it's one of the 195 countries Tripfolio counts toward your "% of the world".`;
  if (c.sovereign) return `Yes. ${name} is a member of the United Nations, so it's one of the 195 countries Tripfolio counts toward your "% of the world".`;
  if (c.code === "EH")
    return `Not toward the 195. Western Sahara's status is disputed and unresolved, so Tripfolio shows it on your map when you mark it but doesn't count it among the 195 countries.`;
  if (LIMITED_RECOGNITION.has(c.code))
    return `Not toward the 195. ${name} is recognized as a country by some UN members but isn't a UN member, so Tripfolio shows it on your map when you mark it but doesn't count it among the 195 countries.`;
  return `Not toward the 195. ${name} is a territory rather than an independent country, so it shows on your map when you mark it but doesn't change your count of 195 countries or your "% of the world".`;
}

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ slug: countrySlug(c) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const country = getCountryBySlug((await params).slug);
  if (!country) return {};
  const f = factsOf(country);
  const url = `/countries/${countrySlug(country)}`;
  const title = `${country.name} on the Map: Capital, Neighbours and Facts`;
  const where = country.subregion || country.continent;
  const description = [
    `Where is ${nameInSentence(country)}? It's in ${where}`,
    country.capital ? `, with ${country.capital} as its capital` : "",
    f?.borders.length ? ` and ${f.borders.length} neighbouring ${f.borders.length === 1 ? "country" : "countries"}` : "",
    `. See it on the map and add it to your free travel map.`,
  ].join("");
  return {
    title: `${title} | Tripfolio`,
    description,
    alternates: { canonical: url },
    // Uninhabited places (Bouvet Island, Heard Island, ...) have little to say; keep them out of search.
    robots: UNINHABITED.has(country.code) ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const country = getCountryBySlug((await params).slug);
  if (!country) notFound();
  const f = factsOf(country);
  const slug = countrySlug(country);
  const name = nameInSentence(country);
  const Name = nameInSentence(country, true);
  const inhabited = !UNINHABITED.has(country.code);

  const borders = (f?.borders ?? []).map((code) => getCountry(code)).filter((c): c is Country => Boolean(c));
  const borderCodes = new Set(borders.map((c) => c.code));
  const nearby = COUNTRIES.filter((c) => c.code !== country.code && !borderCodes.has(c.code) && c.subregion === country.subregion && c.subregion)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  const lead = [
    `${Name} is a ${f?.landlocked ? "landlocked " : ""}${kind(country)} in ${country.subregion || country.continent}`,
    f?.area ? `, covering about ${number(f.area)} km² (${number(Math.round(f.area / 2.59))} sq mi)` : "",
    ". ",
    // "Washington D.C." already ends with a period.
    country.capital ? `Its capital is ${country.capital}${country.capital.endsWith(".") ? "" : "."} ` : "",
    borders.length
      ? `It shares a land border with ${list(borders.map((c) => nameInSentence(c)))}.`
      : f && !f.landlocked
        ? `It has no land borders with other countries.`
        : "",
  ].join("");

  const rows: [string, string][] = [
    ...(country.capital ? [["Capital", country.capital] as [string, string]] : []),
    ["Continent", country.continent],
    ...(country.subregion ? [["Region", country.subregion] as [string, string]] : []),
    ...(f?.area ? [["Area", `${number(f.area)} km²`] as [string, string]] : []),
    ...(inhabited && f?.languages.length ? [[f.languages.length === 1 ? "Language" : "Languages", list(f.languages)] as [string, string]] : []),
    ...(inhabited && f?.currencies.length ? [["Currency", list(f.currencies)] as [string, string]] : []),
    ...(inhabited && f?.callingCode ? [["Calling code", f.callingCode] as [string, string]] : []),
    ...(f?.tld ? [["Internet domain", f.tld] as [string, string]] : []),
  ];

  const faq = [
    { q: `Where is ${name}?`, a: lead },
    { q: `Does ${name} count as a country on Tripfolio?`, a: countingAnswer(country) },
    ...(borders.length ? [{ q: `Which countries border ${name}?`, a: `${Name} borders ${list(borders.map((c) => nameInSentence(c)))}.` }] : []),
  ];

  const url = `${siteUrl}/countries/${slug}`;
  const graph = [
    {
      "@type": "WebPage",
      "@id": url,
      url,
      name: `${country.name} on the map`,
      isPartOf: { "@id": WEBSITE_ID },
      primaryImageOfPage: `${url}/opengraph-image`,
      about: {
        "@type": country.sovereign ? "Country" : "Place",
        name: country.name,
        ...(f?.official && f.official !== country.name && { alternateName: f.official }),
        ...(country.capital && { containsPlace: { "@type": "City", name: country.capital } }),
        containedInPlace: { "@type": "Continent", name: country.continent },
      },
    },
    breadcrumbs(["Countries", "/countries"], [country.name, `/countries/${slug}`]),
    { "@type": "FAQPage", mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];

  const articles = [
    ...(country.code === "US" ? [{ href: "/blog/us-states-visited-map", label: "How many US states have you visited?" }] : []),
    ...(!country.sovereign || country.code === "PS" || country.code === "VA"
      ? [{ href: "/blog/how-many-countries-are-there-in-the-world", label: "How many countries are there in the world?" }]
      : []),
    { href: "/blog/how-many-countries-have-i-visited", label: "How to work out how many countries you've visited" },
  ];

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(...graph) }} />
      <Link href="/countries" className="inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline">
        ← All countries
      </Link>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-6xl leading-none" aria-hidden>
          {country.flag}
        </span>
        <h1 className="min-w-0 text-4xl leading-[1.05] font-bold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{country.name}</h1>
      </div>
      <p className="mt-5 text-[17px] leading-relaxed text-muted">{lead}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/countries-visited-map" className={buttonClass("primary", "lg")}>
          Been there? Mark it on the map
        </Link>
        <Link href="/register" className={buttonClass("secondary", "lg")}>
          Create my map
        </Link>
      </div>

      <dl className="mt-8 grid gap-4 rounded-3xl border border-border bg-surface/85 p-5 shadow-card sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-semibold [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>

      <figure className="mt-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- our own statically generated PNG */}
        <img
          src={`/countries/${slug}/opengraph-image`}
          width={1200}
          height={630}
          loading="lazy"
          alt={`World map with ${name} highlighted in green and circled`}
          className="w-full rounded-3xl border border-border shadow-card"
        />
        <figcaption className="mt-2 text-center text-sm text-muted">Where {name} is on the world map.</figcaption>
      </figure>

      {borders.length > 0 && (
        <section className="mt-12" aria-labelledby="borders">
          <h2 id="borders" className="text-2xl font-bold tracking-tight">
            Countries bordering {name}
          </h2>
          <CountryList countries={borders} />
        </section>
      )}

      <section className="mt-12" aria-labelledby="counting">
        <h2 id="counting" className="text-2xl font-bold tracking-tight">
          Does {name} count as a country?
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">{countingAnswer(country)}</p>
      </section>

      <section className="mt-12" aria-labelledby="map-it">
        <h2 id="map-it" className="text-2xl font-bold tracking-tight">
          Add {name} to your travel map
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-muted">
          On Tripfolio, tap {name} once and it turns green as a place you&apos;ve visited, or mark it &ldquo;Want to visit&rdquo; and it
          turns orange. Then add the trip behind it: the dates, the cities, a few lines about what you did and your best photos. It&apos;s
          free and runs in your browser.
        </p>
      </section>

      {nearby.length > 0 && (
        <section className="mt-12" aria-labelledby="nearby">
          <h2 id="nearby" className="text-2xl font-bold tracking-tight">
            More in {country.subregion}
          </h2>
          <CountryList countries={nearby} />
        </section>
      )}

      <section className="mt-12" aria-labelledby="read">
        <h2 id="read" className="text-2xl font-bold tracking-tight">
          Read next
        </h2>
        <ul className="mt-3 grid gap-1">
          {articles.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="inline-flex min-h-11 items-center font-medium text-brand hover:underline">
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </BlogShell>
  );
}

function CountryList({ countries }: { countries: Country[] }) {
  return (
    <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {countries.map((c) => (
        <li key={c.code}>
          <Link href={`/countries/${countrySlug(c)}`} className="flex min-h-11 items-center gap-2 rounded-lg px-1 hover:text-brand hover:underline">
            <span aria-hidden>{c.flag}</span>
            <span className="[overflow-wrap:anywhere]">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
