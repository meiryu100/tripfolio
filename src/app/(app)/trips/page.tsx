"use client";

import { CalendarDays, Luggage, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Page } from "@/components/app-shell";
import { LoadMore, TripGrid, TripGridSkeleton } from "@/components/cards";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { flatten, useProfile } from "@/features/social/api";
import { useUserTrips } from "@/features/trips/api";
import { getCountry } from "@/lib/countries";
import type { Trip } from "@/lib/types";
import { openTripEditor } from "@/lib/ui";
import { cn, plural } from "@/lib/utils";

type Filter = "all" | "recent" | "country";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "country", label: "By Country" },
];

export default function TripsPage() {
  const me = useMe();
  const profile = useProfile(me.username);
  const query = useUserTrips(me.username, { limit: 24 });
  const trips = flatten(query.data);
  const [filter, setFilter] = useState<Filter>("all");

  const recent = useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const iso = cutoff.toISOString().slice(0, 10);
    return trips.filter((t) => (t.startDate ?? t.endDate ?? t.createdAt.slice(0, 10)) >= iso);
  }, [trips]);

  const byCountry = useMemo(() => {
    const groups = new Map<string, Trip[]>();
    for (const t of trips) groups.set(t.countryCode, [...(groups.get(t.countryCode) ?? []), t]);
    return [...groups.entries()].sort(
      (a, b) => b[1].length - a[1].length || (getCountry(a[0])?.name ?? "").localeCompare(getCountry(b[0])?.name ?? ""),
    );
  }, [trips]);

  const total = profile.data?.counts.trips ?? trips.length;

  return (
    <Page
      wide
      title="My Trips"
      subtitle={total ? `${plural(total, "trip")} · your travel journal` : "Your travel journal"}
      actions={
        <Button onClick={() => openTripEditor()}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Add Trip</span>
        </Button>
      }
    >
      {query.isPending ? (
        <TripGridSkeleton count={6} />
      ) : query.isError ? (
        <ErrorState body="We couldn't load your trips." onRetry={() => query.refetch()} />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={<Luggage />}
          title="You haven't added any trips yet"
          body="Trips hold your dates, photos and memories. Only the country is required."
          action={
            <Button onClick={() => openTripEditor()}>
              <Plus className="size-4" /> Add your first trip
            </Button>
          }
        />
      ) : (
        <>
          <div role="tablist" aria-label="Filter trips" className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition duration-200",
                  filter === f.id ? "bg-brand text-brand-fg shadow-soft" : "border border-border bg-surface text-muted shadow-soft hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filter === "country" ? (
            <div className="grid gap-8">
              {byCountry.map(([code, list]) => {
                const c = getCountry(code);
                return (
                  <section key={code}>
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                      <span className="text-2xl" aria-hidden>
                        {c?.flag}
                      </span>{" "}
                      {c?.name}
                      <span className="text-sm font-normal text-muted">· {plural(list.length, "trip")}</span>
                    </h2>
                    <TripGrid trips={list} />
                  </section>
                );
              })}
            </div>
          ) : filter === "recent" && recent.length === 0 ? (
            <EmptyState icon={<CalendarDays />} title="No trips in the last 12 months" body="Your older adventures are under All." />
          ) : (
            <TripGrid trips={filter === "recent" ? recent : trips} />
          )}
          <LoadMore hasMore={Boolean(query.hasNextPage)} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
        </>
      )}
    </Page>
  );
}
