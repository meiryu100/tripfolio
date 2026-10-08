"use client";

import { CalendarDays, Camera, Globe2, Link2, Lock, MapPin, Settings, UserCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FollowButton, LoadMore, TripGrid, TripGridSkeleton } from "@/components/cards";
import { Photo } from "@/components/photo";
import { Avatar, EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useUserMap } from "@/features/map/api";
import { MapPanel } from "@/features/map/map-panel";
import { flatten } from "@/features/social/api";
import { computeStats } from "@/features/stats/compute";
import { ContinentChecklist, Milestones, WorldProgress } from "@/features/stats/stats-panel";
import { useUserPhotos, useUserTrips } from "@/features/trips/api";
import { getCountry } from "@/lib/countries";
import type { Profile } from "@/lib/types";

import { cn } from "@/lib/utils";

type Tab = "world" | "trips" | "photos";

export function ProfileView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("world");
  const canSeeAnything = profile.canView.visited || profile.canView.wishlist || profile.canView.trips;
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "world", label: "World", show: profile.canView.visited || profile.canView.wishlist },
    { id: "trips", label: "Trips", show: profile.canView.trips },
    { id: "photos", label: "Photos", show: profile.canView.photos },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const active = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id;

  return (
    <div>
      <ProfileHeader profile={profile} />

      {!canSeeAnything ? (
        <EmptyState
          className="mt-10"
          icon={<Lock />}
          title={profile.isPrivate ? "This account is private" : `${profile.firstName} keeps their travels to themselves`}
          body={
            profile.isPrivate
              ? profile.relationship.requested
                ? `Your request is waiting for ${profile.firstName} to approve it.`
                : `Follow ${profile.firstName} to see their world map and trips. They'll need to approve your request.`
              : undefined
          }
        />
      ) : (
        <>
          <div role="tablist" aria-label="Profile sections" className="mt-8 grid border-b border-border" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px min-h-12 border-b-2 text-sm font-semibold transition duration-200",
                  active === t.id ? "border-brand text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-5">
            {active === "world" && <WorldTab profile={profile} />}
            {active === "trips" && <TripsTab profile={profile} />}
            {active === "photos" && <PhotosTab profile={profile} />}
          </div>
        </>
      )}
    </div>
  );
}

function ProfileHeader({ profile: p }: { profile: Profile }) {
  const joined = new Date(p.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <header className="flex flex-col items-center text-center">
      <span className="bg-aurora animate-rise rounded-full p-1 shadow-glow">
        <Avatar user={p} size={104} className="ring-4 ring-surface" />
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {p.firstName} {p.lastName}
      </h1>
      <p className="mt-0.5 flex flex-wrap items-center justify-center gap-2 text-muted">
        @{p.username}
        {p.isPrivate && <Lock className="size-3.5" aria-label="Private profile" />}
        {!p.isMe && p.relationship.friends && (
          <span className="inline-flex items-center gap-1 rounded-md bg-visited-soft px-1.5 py-0.5 text-xs font-medium text-visited">
            <UserCheck className="size-3" aria-hidden /> Following each other
          </span>
        )}
        {!p.isMe && !p.relationship.friends && p.relationship.followsYou && (
          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs">Follows you</span>
        )}
      </p>
      {p.bio && <p className="mt-3 max-w-md text-[17px]">{p.bio}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
        {p.location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {p.location}
          </span>
        )}
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-1 text-brand hover:underline">
            <Link2 className="size-3.5" aria-hidden /> {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" aria-hidden /> Joined {joined}
        </span>
      </div>

      <dl className="mt-6 grid w-full max-w-lg grid-cols-4 gap-1 rounded-2xl border border-border bg-surface p-1.5 shadow-card">
        <Count value={p.counts.visited} label="Countries" tone="text-visited" />
        <Count value={p.counts.wishlist} label="Wishlist" tone="text-wishlist" />
        <Count value={p.counts.followers} label="Followers" href={`/u/${p.username}/followers`} />
        <Count value={p.counts.following} label="Following" href={`/u/${p.username}/following`} />
      </dl>

      <div className="mt-5 flex gap-2">
        {p.isMe ? (
          <>
            <Link href="/profile/edit" className={buttonClass("secondary", "md", "min-w-36")}>
              Edit Profile
            </Link>
            <Link href="/settings" aria-label="Settings" className={buttonClass("secondary", "md", "px-3")}>
              <Settings className="size-4.5" />
            </Link>
          </>
        ) : (
          <FollowButton user={p} relationship={p.relationship} isPrivate={p.isPrivate} size="md" className="min-w-40" />
        )}
      </div>
    </header>
  );
}

function Count({ value, label, href, tone }: { value: number | null; label: string; href?: string; tone?: string }) {
  const inner = (
    <>
      <dd className={cn("font-heading text-2xl font-bold tabular-nums", tone)}>{value ?? <Lock className="mx-auto my-1.5 size-4 text-muted" aria-label="Hidden" />}</dd>
      <dt className="text-xs text-muted sm:text-sm">{label}</dt>
    </>
  );
  const cls = "flex flex-col-reverse items-center rounded-xl py-2";
  return href ? (
    <Link href={href} className={cn(cls, "transition duration-200 hover:bg-surface-2")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function WorldTab({ profile }: { profile: Profile }) {
  const map = useUserMap(profile.username);
  const trips = useUserTrips(profile.canView.trips ? profile.username : undefined, { limit: 5 });
  const stats = useMemo(() => computeStats(map.data?.statuses ?? {}), [map.data]);
  const recent = flatten(trips.data).slice(0, 5);

  return (
    <div className="grid gap-6">
      <MapPanel username={profile.username} className="aspect-[4/3] w-full border border-border shadow-card sm:aspect-[16/9] lg:aspect-[2/1]" />

      {map.data && profile.canView.visited && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <WorldProgress stats={stats} own={profile.isMe} />
          <Milestones stats={stats} />
          <ContinentChecklist stats={stats} className="md:col-span-2 lg:col-span-1" />
        </div>
      )}

      {profile.canView.trips && (
        <section aria-labelledby="profile-recent">
          <h2 id="profile-recent" className="mb-3 text-xl font-bold">
            Recent Trips
          </h2>
          {trips.isPending ? (
            <Skeleton className="h-40" />
          ) : recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted">No trips yet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              {recent.map((t) => {
                const c = getCountry(t.countryCode);
                return (
                  <li key={t.id}>
                    <Link href={`/trips/${t.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2.5 transition duration-200 hover:bg-surface-2">
                      {t.cover ? (
                        <Photo photo={t.cover} className="size-12 shrink-0 rounded-xl" emojiSize="text-xl" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl" aria-hidden>
                          {c?.flag}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {c?.flag} {c?.name}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {[t.title, t.cities.join(" · ")].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {t.startDate && (
                        <span className="shrink-0 text-sm text-muted">
                          {new Date(t.startDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function TripsTab({ profile }: { profile: Profile }) {
  const q = useUserTrips(profile.username, { limit: 12 });
  const trips = flatten(q.data);
  if (q.isPending) return <TripGridSkeleton count={6} />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!trips.length)
    return <EmptyState icon={<Globe2 />} title={profile.isMe ? "You haven't added any trips yet" : `${profile.firstName} hasn't shared any trips yet`} />;
  return (
    <>
      <TripGrid trips={trips} />
      <LoadMore hasMore={Boolean(q.hasNextPage)} loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()} />
    </>
  );
}

function PhotosTab({ profile }: { profile: Profile }) {
  const q = useUserPhotos(profile.username);
  const items = flatten(q.data);
  if (q.isPending)
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!items.length) return <EmptyState icon={<Camera />} title="No photos yet" />;
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4 lg:grid-cols-5">
        {items.map(({ photo, trip }) => (
          <Link key={photo.id} href={`/trips/${trip.id}`} className="group relative overflow-hidden rounded-lg" aria-label={`${trip.title || getCountry(trip.countryCode)?.name} photo`}>
            <Photo photo={photo} className="aspect-square w-full transition duration-300 group-hover:scale-[1.04]" emojiSize="text-3xl" />
            <span className="absolute bottom-1 left-1 text-base drop-shadow" aria-hidden>
              {getCountry(trip.countryCode)?.flag}
            </span>
          </Link>
        ))}
      </div>
      <LoadMore hasMore={Boolean(q.hasNextPage)} loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()} />
    </>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="size-26 rounded-full" />
      <Skeleton className="mt-4 h-8 w-48" />
      <Skeleton className="mt-2 h-5 w-28" />
      <Skeleton className="mt-6 h-20 w-full max-w-lg" />
      <Skeleton className="mt-8 aspect-[16/9] w-full" />
    </div>
  );
}

