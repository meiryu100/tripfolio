"use client";

import { ArrowRight, Camera, Globe2, Heart, Luggage, MapPinned, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Page } from "@/components/app-shell";
import { Stat, TripGrid, TripGridSkeleton, UserRow, UserRowSkeleton } from "@/components/cards";
import { CountUp, Reveal } from "@/components/motion";
import { CountrySearch } from "@/components/country-search";
import { Button, EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useExplore } from "@/features/explore/api";
import { useUserMap } from "@/features/map/api";
import { MapPanel } from "@/features/map/map-panel";
import { useUserRegions } from "@/features/map/regions-api";
import { ActivityItem } from "@/features/social/activity-item";
import { flatten, useFeed, useProfile } from "@/features/social/api";
import { computeStats, type TravelStats } from "@/features/stats/compute";
import { ByContinent, ContinentChecklist, Milestones, WorldProgress } from "@/features/stats/stats-panel";
import { YearRecapCard } from "@/features/stats/year-recap-card";
import { useUserTrips } from "@/features/trips/api";
import { getCountry } from "@/lib/countries";
import { countVisitedRegions } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { openCountry, openTripEditor } from "@/lib/ui";
import { greeting, plural } from "@/lib/utils";

export default function HomePage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const profile = useProfile(me.username);
  const trips = useUserTrips(me.username, { limit: 4 });
  const stats = computeStats(map.data?.statuses ?? {});
  const recent = flatten(trips.data).slice(0, 4);
  const isEmpty = map.isSuccess && Object.keys(map.data.statuses).length === 0;

  return (
    <Page wide>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-full min-w-0">
          <p className="text-muted [overflow-wrap:anywhere]">
            {/* Client-only page, so local time is safe here. */}
            {greeting()}, {me.firstName}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Welcome back to <span className="text-gradient">your world</span>
          </h1>
        </div>
        <CountrySearch
          className="w-full sm:w-72"
          statuses={map.data?.statuses}
          onPick={(c) => openCountry(c.code, me.username)}
          placeholder="Find a country…"
        />
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Your stats">
        {map.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px]" />)
        ) : (
          <>
            <Reveal index={0}>
              <Stat value={stats.visited} label="Countries Visited" tone="visited" icon={Globe2} />
            </Reveal>
            <Reveal index={1}>
              <Stat value={stats.wishlist} label="Countries to Visit" tone="wishlist" icon={Heart} href="/wishlist" />
            </Reveal>
            <Reveal index={2}>
              <Stat value={profile.data?.counts.trips ?? "–"} label="Trips" icon={Luggage} href="/trips" />
            </Reveal>
            <Reveal index={3}>
              <Stat value={<CountUp value={stats.explored} decimals={1} suffix="%" />} label="of the World" tone="brand" icon={MapPinned} />
            </Reveal>
          </>
        )}
      </section>

      {map.data && <InsightCard statuses={map.data.statuses} explored={stats.explored} username={me.username} />}

      {map.data && !isEmpty && profile.data && (
        <FirstSteps statuses={map.data.statuses} trips={profile.data.counts.trips} following={profile.data.counts.following} />
      )}

      <Reveal as="section" className="relative" aria-label="Your world map">
        <MapPanel
          username={me.username}
          className="aspect-[4/3] w-full border border-border shadow-card sm:aspect-[16/9] lg:aspect-[2/1]"
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-x-0 top-4 hidden justify-center px-4 sm:flex">
            <p className="glass rounded-full px-4 py-2 text-sm font-medium shadow-card">Tap any country to start building your world</p>
          </div>
        )}
      </Reveal>

      {isEmpty && (
        <EmptyState
          className="mt-6"
          icon={<Globe2 />}
          title="Your journey starts here."
          body="Mark your first country and start building your world."
          action={
            <Link href="/explore" className={buttonClass("primary")}>
              Explore the World <ArrowRight className="size-4" />
            </Link>
          }
        />
      )}

      <YearRecapCard className="mt-6" />

      <section className="mt-10" aria-labelledby="recent-trips">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-trips" className="text-xl font-bold">
            Recent Trips
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openTripEditor()}>
              <Plus className="size-4" /> Add
            </Button>
            {recent.length > 0 && (
              <Link href="/trips" className={buttonClass("ghost", "sm")}>
                See all <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
        {trips.isPending ? (
          <TripGridSkeleton count={4} columns={4} />
        ) : trips.isError ? (
          <ErrorState body="We couldn't load your trips." onRetry={() => trips.refetch()} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Camera />}
            title="No trips yet"
            body="Pick a country and add your first memory — dates, photos and notes are all optional."
            action={
              <Button onClick={() => openTripEditor()}>
                <Plus className="size-4" /> Add a trip
              </Button>
            }
          />
        ) : (
          <TripGrid trips={recent} columns={4} />
        )}
      </section>

      {map.data && !isEmpty && <TravelStatsSection stats={stats} photos={profile.data?.counts.photos ?? null} username={me.username} />}

      <FriendsActivity />
    </Page>
  );
}

function TravelStatsSection({ stats, photos, username }: { stats: TravelStats; photos: number | null; username: string }) {
  const regions = useUserRegions(username);
  const usStates = countVisitedRegions(regions.data?.statuses ?? {}, "US");
  return (
    <Reveal as="section" className="mt-10" aria-labelledby="travel-stats">
      <h2 id="travel-stats" className="mb-3 text-xl font-bold">
        My Travel Stats
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <WorldProgress stats={stats} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat value={stats.visited} label="Countries" tone="visited" />
            <Stat value={`${stats.continentsVisited} / 7`} label="Continents" />
            <Stat value={`${usStates} / 50`} label="US states" />
            <Stat value={photos ?? "–"} label="Photos" />
            <Stat value={stats.wishlist} label="On Wishlist" tone="wishlist" />
          </div>
          <Milestones stats={stats} />
        </div>
        <div className="grid content-start gap-4">
          <ContinentChecklist stats={stats} />
          <ByContinent stats={stats} />
        </div>
      </div>
    </Reveal>
  );
}

function FriendsActivity() {
  const feed = useFeed();
  const items = flatten(feed.data).slice(0, 4);
  if (feed.isPending || items.length === 0) return null;
  return (
    <Reveal as="section" className="mt-10" aria-labelledby="friends-activity">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="friends-activity" className="text-xl font-bold">
          From people you follow
        </h2>
        <Link href="/friends" className={buttonClass("ghost", "sm")}>
          Open feed <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => (
          <ActivityItem key={a.id} activity={a} compact />
        ))}
      </div>
    </Reveal>
  );
}

/**
 * Next steps for a new traveler who has marked countries: add the first trip (prefilled with a
 * country they visited) and follow a few travelers. Each half hides once it's done.
 */
function FirstSteps({ statuses, trips, following }: { statuses: Record<string, CountryStatus>; trips: number | null; following: number }) {
  const needsTrip = trips === 0;
  const needsFollows = following < 3;
  const country = useMemo(() => {
    const codes = Object.keys(statuses);
    const code = codes.find((c) => statuses[c] === "visited") ?? codes[0];
    return code ? getCountry(code) : undefined;
  }, [statuses]);
  if (!needsTrip && !needsFollows) return null;

  return (
    <Reveal as="section" className="mb-5 grid gap-4 lg:grid-cols-2" aria-label="Your next steps">
      {needsTrip && (
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-surface p-5 shadow-card">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand">
              <Camera className="size-4" /> Your first trip
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              {country ? (
                <>
                  Add your trip to {country.flag} {country.name}
                </>
              ) : (
                "Add your first trip"
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">Dates, cities, a few photos — add as much or as little as you like.</p>
          </div>
          <div>
            <Button onClick={() => openTripEditor({ country: country?.code })}>
              <Plus className="size-4" /> Add a trip
            </Button>
          </div>
        </div>
      )}
      {needsFollows && <FollowSuggestions />}
    </Reveal>
  );
}

function FollowSuggestions() {
  const me = useMe();
  const q = useExplore();
  const people = q.data?.suggestions.slice(0, 3) ?? [];
  if (q.isError || (q.isSuccess && people.length === 0)) return null;
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Follow 3 travelers</h2>
        <Link href="/explore" className={buttonClass("ghost", "sm")}>
          More <ArrowRight className="size-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">See where they&apos;ve been and get ideas for your next trip.</p>
      <div className="mt-2 divide-y divide-border">
        {q.isPending
          ? Array.from({ length: 3 }, (_, i) => <UserRowSkeleton key={i} />)
          : people.map((u) => (
              <UserRow key={u.id} user={u} relationship={u.relationship} isMe={u.id === me.id} meta={u.visited ? plural(u.visited, "country", "countries") : undefined} />
            ))}
      </div>
    </div>
  );
}

/** AI-native context card: a short read of your map with one next step. */
function InsightCard({ statuses, explored, username }: { statuses: Record<string, CountryStatus>; explored: number; username: string }) {
  const insight = useMemo(() => {
    const regions = new Map<string, number>();
    const wishlist: string[] = [];
    for (const [code, status] of Object.entries(statuses)) {
      const c = getCountry(code);
      if (!c) continue;
      if (status === "visited") regions.set(c.continent, (regions.get(c.continent) ?? 0) + 1);
      else wishlist.push(code);
    }
    const top = [...regions.entries()].sort((a, b) => b[1] - a[1])[0];
    return { top, next: wishlist[0] ? getCountry(wishlist[0]) : undefined, total: Object.keys(statuses).length };
  }, [statuses]);

  if (insight.total === 0) return null;
  const { top, next } = insight;
  return (
    <section aria-label="Insight" className="context-card animate-rise mb-5 flex items-center gap-x-3 gap-y-3 rounded-r-2xl px-4 py-3.5 sm:flex-wrap sm:gap-x-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ai shadow-soft" aria-hidden>
        <Sparkles className="size-4.5" />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed">
        {top ? (
          <>
            You&apos;ve explored <strong>{explored.toFixed(1)}%</strong> of the world, mostly in <strong>{top[0]}</strong>.
          </>
        ) : (
          <>Your wishlist is taking shape.</>
        )}
        {next && (
          <>
            {" "}
            Next on your wishlist:{" "}
            <strong>
              {next.flag} {next.name}
            </strong>
            .
          </>
        )}
      </p>
      {next && (
        <button
          onClick={() => openCountry(next.code, username)}
          className="min-h-11 w-min shrink-0 rounded-xl px-2 text-center text-xs leading-tight font-semibold text-ai transition duration-200 hover:bg-surface sm:w-auto sm:px-3 sm:text-sm"
        >
          Open {next.name}
        </button>
      )}
    </section>
  );
}
