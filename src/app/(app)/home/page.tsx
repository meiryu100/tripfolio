"use client";

import { ArrowRight, Camera, Globe2, Heart, Luggage, MapPinned, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Page } from "@/components/app-shell";
import { Stat, TripGrid, TripGridSkeleton } from "@/components/cards";
import { CountrySearch } from "@/components/country-search";
import { Button, EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { MapSkeleton, WorldMap } from "@/features/map/world-map";
import { ActivityItem } from "@/features/social/activity-item";
import { flatten, useFeed, useProfile } from "@/features/social/api";
import { computeStats, type TravelStats } from "@/features/stats/compute";
import { ByContinent, ContinentChecklist, Milestones, WorldProgress } from "@/features/stats/stats-panel";
import { useUserTrips } from "@/features/trips/api";
import { getCountry } from "@/lib/countries";
import type { CountryStatus } from "@/lib/types";
import { openCountry, openTripEditor, useUI } from "@/lib/ui";
import { greeting } from "@/lib/utils";

export default function HomePage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const profile = useProfile(me.username);
  const trips = useUserTrips(me.username, { limit: 4 });
  const selected = useUI((s) => (s.countrySheet?.username === me.username ? s.countrySheet.code : null));
  const stats = useMemo(() => computeStats(map.data?.statuses ?? {}), [map.data]);
  const recent = flatten(trips.data).slice(0, 4);
  const isEmpty = map.isSuccess && stats.visited === 0 && stats.wishlist === 0;

  return (
    <Page wide>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">
            {/* Client-only page, so local time is safe here. */}
            {greeting()}, {me.firstName}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome back to your world</h1>
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
            <Stat value={stats.visited} label="Countries Visited" tone="visited" icon={Globe2} />
            <Stat value={stats.wishlist} label="Countries to Visit" tone="wishlist" icon={Heart} href="/wishlist" />
            <Stat value={profile.data?.counts.trips ?? "–"} label="Trips" icon={Luggage} href="/trips" />
            <Stat value={`${stats.explored.toFixed(1)}%`} label="of the World" tone="brand" icon={MapPinned} />
          </>
        )}
      </section>

      {map.data && <InsightCard statuses={map.data.statuses} explored={stats.explored} username={me.username} />}

      <section className="relative" aria-label="Your world map">
        {map.isPending ? (
          <MapSkeleton />
        ) : map.isError ? (
          <ErrorState body="We couldn't load your map." onRetry={() => map.refetch()} />
        ) : (
          <WorldMap
            statuses={map.data.statuses}
            photoCountries={map.data.photoCountries}
            selected={selected}
            onSelect={(code) => openCountry(code, me.username)}
            className="aspect-[4/3] w-full border border-border shadow-card sm:aspect-[16/9] lg:aspect-[2/1]"
          />
        )}
        {isEmpty && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
            <p className="glass rounded-full px-4 py-2 text-sm font-medium shadow-card">Tap any country to start building your world</p>
          </div>
        )}
      </section>

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

      {map.data && !isEmpty && <TravelStatsSection stats={stats} photos={profile.data?.counts.photos ?? null} />}

      <FriendsActivity />
    </Page>
  );
}

function TravelStatsSection({ stats, photos }: { stats: TravelStats; photos: number | null }) {
  return (
    <section className="mt-10" aria-labelledby="travel-stats">
      <h2 id="travel-stats" className="mb-3 text-xl font-bold">
        My Travel Stats
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <WorldProgress stats={stats} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={stats.visited} label="Countries" tone="visited" />
            <Stat value={`${stats.continentsVisited} / 7`} label="Continents" />
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
    </section>
  );
}

function FriendsActivity() {
  const feed = useFeed();
  const items = flatten(feed.data).slice(0, 4);
  if (feed.isPending || items.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="friends-activity">
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
    </section>
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
    <section aria-label="Insight" className="context-card animate-rise mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-r-2xl px-4 py-3.5">
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
          className="min-h-11 rounded-xl px-3 text-sm font-semibold text-ai transition duration-200 hover:bg-surface"
        >
          Open {next.name}
        </button>
      )}
    </section>
  );
}
