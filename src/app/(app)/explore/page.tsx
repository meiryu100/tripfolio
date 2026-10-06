"use client";

import { Compass, Heart, Search, SearchX, TrendingUp, Trophy, Users, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { TripGrid, TripGridSkeleton, UserRow, UserRowSkeleton } from "@/components/cards";
import { StatusDot } from "@/components/country-search";
import { Photo } from "@/components/photo";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useExplore, useSearch } from "@/features/explore/api";
import { useUserMap } from "@/features/map/api";
import { getCountry } from "@/lib/countries";
import { plural } from "@/lib/utils";

export default function ExplorePage() {
  const [q, setQ] = useState("");

  return (
    <Page
      wide
      title={
        <>
          Explore the <span className="text-gradient">World</span>
        </>
      }
      subtitle="Trending destinations, interesting travelers and their latest journeys."
    >
      <div className="relative mb-8 max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ai" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, countries, trips…"
          aria-label="Search people, countries and trips"
          className="h-13 w-full rounded-2xl border border-border bg-surface pr-11 pl-12 text-base shadow-soft outline-none transition duration-200 placeholder:text-muted/80 focus:border-ai/60 focus:ring-4 focus:ring-ai/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {q.trim() ? <SearchResults query={q} /> : <Discover />}
    </Page>
  );
}

function SearchResults({ query }: { query: string }) {
  const me = useMe();
  const statuses = useUserMap(me.username).data?.statuses;
  const { data, isPending, isError, refetch, debouncedQuery, isFetching } = useSearch(query);

  if (isPending) return <Spinner label="Searching" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data.users.length && !data.countries.length && !data.trips.length)
    return <EmptyState icon={<SearchX />} title={`No results for “${debouncedQuery}”`} body="Try a different name, username, city or country." />;

  return (
    <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <div className="grid gap-8 lg:grid-cols-2">
        {data.countries.length > 0 && (
          <Section title="Countries">
            <div className="grid gap-2">
              {data.countries.map((c) => (
                <Link
                  key={c.code}
                  href={`/explore/${c.code.toLowerCase()}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft transition duration-200 hover:border-brand/40"
                >
                  <span className="text-3xl" aria-hidden>
                    {c.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted">
                      {c.continent}
                      {c.capital && ` · ${c.capital}`}
                    </span>
                  </span>
                  {statuses?.[c.code] && <StatusDot status={statuses[c.code]} />}
                </Link>
              ))}
            </div>
          </Section>
        )}
        {data.users.length > 0 && (
          <Section title="People">
            <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-4 shadow-soft">
              {data.users.map((u) => (
                <UserRow key={u.id} user={u} relationship={u.relationship} isMe={u.id === me.id} meta={u.visited ? plural(u.visited, "country", "countries") : undefined} />
              ))}
            </div>
          </Section>
        )}
      </div>
      {data.trips.length > 0 && (
        <Section title="Trips" className="mt-8">
          <TripGrid trips={data.trips} showAuthor />
        </Section>
      )}
    </div>
  );
}

function Discover() {
  const me = useMe();
  const q = useExplore();

  if (q.isError) return <ErrorState body="We couldn't load Explore." onRetry={() => q.refetch()} />;
  const d = q.data;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <Section title="Trending Destinations" icon={TrendingUp}>
        <CountryStrip loading={q.isPending} items={d?.trending.map((t) => ({ code: t.code, meta: `${t.visited} been · ${t.wishlist} want` }))} />
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="People to Follow" icon={Users}>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-4 shadow-soft">
            {q.isPending ? (
              Array.from({ length: 4 }, (_, i) => <UserRowSkeleton key={i} />)
            ) : d!.suggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">You follow everyone already 🎉</p>
            ) : (
              d!.suggestions.map((u) => (
                <UserRow key={u.id} user={u} relationship={u.relationship} isMe={u.id === me.id} meta={u.visited ? plural(u.visited, "country", "countries") : undefined} />
              ))
            )}
          </div>
        </Section>
        <Section title="Top Travelers" icon={Trophy}>
          <ol className="divide-y divide-border rounded-2xl border border-border bg-surface px-4 shadow-soft">
            {q.isPending
              ? Array.from({ length: 4 }, (_, i) => <UserRowSkeleton key={i} />)
              : d!.topTravelers.slice(0, 5).map((u, i) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <span className="w-5 text-center font-heading text-lg font-bold text-muted tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <UserRow user={u} relationship={u.relationship} isMe={u.id === me.id} meta={plural(u.visited, "country", "countries")} />
                    </div>
                  </li>
                ))}
          </ol>
        </Section>
      </div>

      <Section title="Popular on Wishlists" icon={Heart}>
        <CountryStrip loading={q.isPending} items={d?.wishlisted.map((w) => ({ code: w.code, meta: `${plural(w.count, "traveler")} want to go` }))} />
      </Section>

      <Section title="Recent Journeys" icon={Compass}>
        {q.isPending ? (
          <TripGridSkeleton />
        ) : d!.journeys.length === 0 ? (
          <EmptyState icon={<Compass />} title="No public journeys yet" />
        ) : (
          <TripGrid trips={d!.journeys} showAuthor />
        )}
      </Section>

      {(q.isPending || d!.photos.length > 0) && (
        <Section title="Recent Photos">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {q.isPending
              ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
              : d!.photos.map(({ photo, trip }) => (
                  <Link key={photo.id} href={`/trips/${trip.id}`} className="group relative overflow-hidden rounded-lg" aria-label={`Photo from ${trip.title}`}>
                    <Photo photo={photo} className="aspect-square w-full transition duration-300 group-hover:scale-[1.05]" emojiSize="text-3xl" />
                    {trip.author && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        @{trip.author.username}
                      </span>
                    )}
                  </Link>
                ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function CountryStrip({ items, loading }: { items?: { code: string; meta: string }[]; loading: boolean }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
      {loading
        ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32 w-32 shrink-0 sm:w-auto" />)
        : items?.map(({ code, meta }) => {
            const c = getCountry(code);
            if (!c) return null;
            return (
              <Link
                key={code}
                href={`/explore/${code.toLowerCase()}`}
                className="flex w-32 shrink-0 flex-col items-center rounded-2xl border border-border bg-surface px-3 py-4 text-center shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 sm:w-auto"
              >
                <span className="text-4xl" aria-hidden>
                  {c.flag}
                </span>
                <span className="mt-2 w-full truncate text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-muted">{meta}</span>
              </Link>
            );
          })}
    </div>
  );
}

function Section({ title, icon: Icon, children, className }: { title: string; icon?: typeof Compass; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
        {Icon && <Icon className="size-5 text-brand-bright" aria-hidden />}
        {title}
      </h2>
      {children}
    </section>
  );
}
