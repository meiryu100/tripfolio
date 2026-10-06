"use client";

import { Check, Compass, Heart, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { BackLink, TripGrid, TripGridSkeleton } from "@/components/cards";
import { Avatar, Button, EmptyState, ErrorState, NotFound, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useCountryDetail } from "@/features/explore/api";
import { useApplyStatus } from "@/features/map/country-sheet";
import { useUserMap } from "@/features/map/api";
import { ApiError } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { UserSummary } from "@/lib/types";
import { openTripEditor } from "@/lib/ui";
import { plural } from "@/lib/utils";

export default function CountryPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const country = getCountry(code);
  const me = useMe();
  const detail = useCountryDetail(country ? code : undefined);
  // Status comes from the (optimistically updated) map, so buttons react instantly.
  const myStatus = useUserMap(me.username).data?.statuses[code] ?? null;
  const { apply } = useApplyStatus();

  if (!country || (detail.error instanceof ApiError && detail.error.status === 404))
    return (
      <Page>
        <NotFound title="Country not found" />
      </Page>
    );

  const d = detail.data;
  return (
    <Page wide back={<BackLink fallback="/explore" label="Explore" />}>
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-6 text-[11rem] leading-none opacity-[0.08] select-none">
          {country.flag}
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="text-7xl leading-none drop-shadow-sm" aria-hidden>
            {country.flag}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{country.name}</h1>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {country.capital && <Fact label="Capital" value={country.capital} />}
              <Fact label="Continent" value={country.continent} />
              {country.subregion && <Fact label="Region" value={country.subregion} />}
            </dl>
            {d && (
              <p className="mt-2 text-sm text-muted">
                {plural(d.travelers.visited, "traveler has", "travelers have")} been here · {d.travelers.wishlist} want to go
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {myStatus === "visited" ? (
              <>
                <span className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-visited-soft px-4 text-sm font-semibold text-visited">
                  <Check className="size-4" aria-hidden /> Visited
                </span>
                <Button onClick={() => openTripEditor({ country: code })}>
                  <Plus className="size-4" /> Add Trip
                </Button>
              </>
            ) : (
              <>
                <Button variant="visited" onClick={() => apply(code, "visited")}>
                  <Check className="size-4" /> Mark as Visited
                </Button>
                <Button
                  variant={myStatus === "wishlist" ? "wishlist" : "secondary"}
                  onClick={() => apply(code, myStatus === "wishlist" ? null : "wishlist")}
                  aria-pressed={myStatus === "wishlist"}
                >
                  <Heart className={myStatus === "wishlist" ? "size-4 fill-current" : "size-4 text-wishlist"} />
                  {myStatus === "wishlist" ? "On your wishlist" : "Want to Visit"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {detail.isError ? (
        <div className="mt-8">
          <ErrorState onRetry={() => detail.refetch()} />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid content-start gap-10">
            {d && d.myTrips.length > 0 && (
              <Section title="Your Trips">
                <TripGrid trips={d.myTrips} columns={2} />
              </Section>
            )}
            <Section title={`Journeys in ${country.name}`} icon={Compass}>
              {!d ? (
                <TripGridSkeleton columns={2} count={2} />
              ) : d.journeys.length === 0 ? (
                <EmptyState icon={<Compass />} title="No public journeys yet" body={`Be the first to share a trip to ${country.name}.`} />
              ) : (
                <TripGrid trips={d.journeys} columns={2} showAuthor />
              )}
            </Section>
          </div>
          <Section title="People You Follow" icon={Users}>
            {!d ? (
              <Skeleton className="h-40" />
            ) : d.following.visited.length + d.following.wishlist.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                No one you follow has {country.name} on their map yet.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                {d.following.visited.map((u) => (
                  <Person key={`v${u.id}`} user={u}>
                    visited {country.name}
                  </Person>
                ))}
                {d.following.wishlist.map((u) => (
                  <Person key={`w${u.id}`} user={u} wish>
                    wants to visit {country.name}
                  </Person>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </Page>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{label}:</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Person({ user, wish, children }: { user: UserSummary; wish?: boolean; children: ReactNode }) {
  return (
    <li>
      <Link href={`/u/${user.username}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition duration-200 hover:bg-surface-2">
        <Avatar user={user} size={36} />
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{user.firstName}</span> {children}
        </span>
        {wish ? <Heart className="size-4 text-wishlist" aria-hidden /> : <Check className="size-4 text-visited" aria-hidden />}
      </Link>
    </li>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Compass; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
        {Icon && <Icon className="size-5 text-brand-bright" aria-hidden />}
        {title}
      </h2>
      {children}
    </section>
  );
}
