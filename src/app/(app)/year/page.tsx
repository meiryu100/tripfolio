"use client";

import { CalendarDays, Camera, Globe2, MapPin, Plus, Share2, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { CountUp, Reveal } from "@/components/motion";
import { Button, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { flatten } from "@/features/social/api";
import { computeStats } from "@/features/stats/compute";
import { recapYear, yearInTravel } from "@/features/stats/year-in-travel";
import { useUserTrips } from "@/features/trips/api";
import { getCountry } from "@/lib/countries";
import { openTripEditor, toast } from "@/lib/ui";
import { plural } from "@/lib/utils";

/** "Your 2026 in travel": a recap of the year's dated trips, to look at and share (backlog #18). */

// Fixed when the page's module loads, so render stays pure.
const YEAR = recapYear(new Date());

export default function YearInTravelPage() {
  const me = useMe();
  const query = useUserTrips(me.username, { limit: 60 });
  const map = useUserMap(me.username);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // The recap needs every trip, not just the first page.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const trips = flatten(query.data);
  const recap = useMemo(() => yearInTravel(trips, YEAR), [trips]);
  const world = computeStats(map.data?.statuses ?? {});
  const loading = query.isPending || hasNextPage || map.isPending;

  async function share() {
    const text = `My ${YEAR} in travel: ${plural(recap.countries.length, "country", "countries")}, ${plural(recap.trips.length, "trip")}${
      recap.newCountries.length ? `, ${recap.newCountries.length} new` : ""
    }. ${world.explored.toFixed(1)}% of the world so far. See my map on Tripfolio:`;
    const url = `${window.location.origin}/u/${me.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `My ${YEAR} in travel`, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("Copied — paste it anywhere ✓");
      }
    } catch {
      // The person closed the share sheet.
    }
  }

  return (
    <Page title={`Your ${YEAR} in travel`} subtitle="Every dated trip of the year, in one place.">
      {query.isError || map.isError ? (
        <ErrorState body="We couldn't load your year." onRetry={() => (query.isError ? query.refetch() : map.refetch())} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : recap.trips.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
          <Sparkles className="mx-auto size-10 text-brand" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold">No {YEAR} trips with dates yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Add the trips you took this year, with their dates, and your recap fills itself in: countries, new places, days on the road.
          </p>
          <Button className="mt-6" onClick={() => openTripEditor()}>
            <Plus className="size-4" /> Add a {YEAR} trip
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <Reveal className="bg-aurora relative overflow-hidden rounded-3xl p-8 text-white shadow-float">
            <p className="text-sm font-semibold tracking-wide uppercase opacity-90">{YEAR}</p>
            <p className="mt-2 text-6xl font-bold tracking-tight tabular-nums">
              <CountUp value={recap.countries.length} />
            </p>
            <p className="mt-1 text-xl font-semibold">{recap.countries.length === 1 ? "country this year" : "countries this year"}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-3xl" aria-label="Countries">
              {recap.countries.map((c) => (
                <span key={c} title={getCountry(c)?.name}>
                  {getCountry(c)?.flag}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card icon={<Sparkles />} label="New countries" value={recap.newCountries.length}>
              {recap.newCountries.length ? recap.newCountries.map((c) => getCountry(c)?.name ?? c).join(", ") : "Places you'd been before"}
            </Card>
            <Card icon={<CalendarDays />} label="Trips" value={recap.trips.length}>
              {plural(recap.days, "day")} on the road
            </Card>
            <Card icon={<Timer />} label="Longest trip" value={recap.longest?.days ?? 0} unit="days">
              {recap.longest ? (
                <Link href={`/trips/${recap.longest.trip.id}`} className="text-brand hover:underline">
                  {getCountry(recap.longest.trip.countryCode)?.flag} {recap.longest.trip.title}
                </Link>
              ) : null}
            </Card>
            <Card icon={<MapPin />} label="Cities" value={recap.cities}>
              across {plural(recap.continents.length, "continent")}
            </Card>
            <Card icon={<Camera />} label="Photos" value={recap.photos}>
              kept from this year&apos;s trips
            </Card>
            <Card icon={<Globe2 />} label="Of the world, all time" value={Number(world.explored.toFixed(1))} unit="%">
              {world.visited} / 195 countries
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={share}>
              <Share2 className="size-4" /> Share my year
            </Button>
            <Link href="/trips" className={buttonClass("secondary")}>
              All my trips
            </Link>
          </div>
        </div>
      )}
    </Page>
  );
}

function Card({ icon, label, value, unit, children }: { icon: ReactNode; label: string; value: number; unit?: string; children?: ReactNode }) {
  return (
    <Reveal className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-4xl font-bold tabular-nums">
        <CountUp value={value} decimals={Number.isInteger(value) ? 0 : 1} />
        {unit && <span className="ml-1 text-xl font-semibold text-muted">{unit}</span>}
      </p>
      {children && <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{children}</p>}
    </Reveal>
  );
}
