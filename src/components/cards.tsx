"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Images, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { Relationship, Trip, UserSummary } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn, formatDateRange, plural } from "@/lib/utils";
import { TripCover } from "./photo";
import { Avatar, Button, Skeleton } from "./ui";

export function TripCard({ trip, showAuthor }: { trip: Trip; showAuthor?: boolean }) {
  const c = getCountry(trip.countryCode);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="relative overflow-hidden">
        <TripCover
          photo={trip.cover}
          flag={c?.flag ?? "🌍"}
          className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.03]"
        />
        {showAuthor && trip.author && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/55 py-0.5 pr-2.5 pl-0.5 text-xs font-medium text-white backdrop-blur">
            <Avatar user={trip.author} size={20} /> @{trip.author.username}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="flex items-center gap-2 font-semibold">
          <span className="text-lg leading-none" aria-hidden>
            {c?.flag}
          </span>
          <span className="truncate">{trip.title || c?.name}</span>
        </p>
        {trip.cities.length > 0 && (
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden /> {trip.cities.join(" · ")}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
          <span className="truncate">{dates ?? c?.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Images className="size-4" aria-hidden /> {plural(trip.photoCount, "Photo")}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="grid gap-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function TripGrid({ trips, showAuthor, columns = 3 }: { trips: Trip[]; showAuthor?: boolean; columns?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4",
      )}
    >
      {trips.map((t) => (
        <TripCard key={t.id} trip={t} showAuthor={showAuthor} />
      ))}
    </div>
  );
}

export function TripGridSkeleton({ count = 3, columns = 3 }: { count?: number; columns?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3", columns === 4 && "lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Follow / Following / Requested. Keeps its own optimistic state so it works
 * the same in profile headers and long lists.
 */
export function FollowButton({
  user,
  relationship,
  isPrivate,
  size = "sm",
  className,
}: {
  user: Pick<UserSummary, "username" | "firstName">;
  relationship: Relationship;
  isPrivate?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const qc = useQueryClient();
  const [rel, setRel] = useState(relationship);
  const [prevProp, setPrevProp] = useState(relationship);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);
  // Follow server truth when the parent refetches.
  if (prevProp !== relationship) {
    setPrevProp(relationship);
    setRel(relationship);
  }

  const active = rel.following || rel.requested;
  const toggle = async () => {
    const prev = rel;
    setBusy(true);
    setRel(active ? { ...rel, following: false, requested: false, friends: false } : { ...rel, following: !isPrivate, requested: Boolean(isPrivate) });
    try {
      const res = active
        ? await api.delete<{ relationship: Relationship }>(`/api/users/${user.username}/follow`)
        : await api.post<{ relationship: Relationship }>(`/api/users/${user.username}/follow`);
      setRel(res.relationship);
      if (!active) toast(res.relationship.requested ? `Follow request sent to ${user.firstName}` : `Following ${user.firstName} ✓`);
      for (const key of [["profile"], ["follows"], ["explore"], ["feed"], ["friends"], ["map", user.username.toLowerCase()], ["trips", user.username.toLowerCase()]])
        qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      setRel(prev);
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const label = rel.following ? (hover ? "Unfollow" : rel.friends ? "Friends" : "Following") : rel.requested ? (hover ? "Cancel" : "Requested") : rel.followsYou ? "Follow back" : "Follow";

  return (
    <Button
      size={size}
      variant={active ? "secondary" : "primary"}
      className={cn("min-w-26", active && hover && "border-danger/40 text-danger", className)}
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label}
    </Button>
  );
}

export function UserRow({
  user,
  relationship,
  meta,
  isMe,
  action,
}: {
  user: UserSummary;
  relationship?: Relationship;
  meta?: ReactNode;
  isMe?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size={44} />
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm text-muted">
            <span className="truncate">
              @{user.username}
              {meta && <> · {meta}</>}
            </span>
            {relationship?.friends ? (
              <span className="shrink-0 rounded-md bg-visited-soft px-1.5 py-0.5 text-[11px] font-medium text-visited">Friends</span>
            ) : relationship?.followsYou ? (
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px]">Follows you</span>
            ) : null}
          </p>
        </div>
      </Link>
      {action ?? (!isMe && relationship && <FollowButton user={user} relationship={relationship} />)}
    </div>
  );
}

export function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="size-11 rounded-full" />
      <div className="grid flex-1 gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

export function Stat({
  value,
  label,
  href,
  tone,
  icon: Icon,
}: {
  value: ReactNode;
  label: string;
  href?: string;
  tone?: "visited" | "wishlist" | "brand" | "ai";
  icon?: LucideIcon;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-heading text-2xl font-bold tracking-tight tabular-nums sm:text-3xl",
            tone === "visited" && "text-visited",
            tone === "wishlist" && "text-wishlist",
            tone === "brand" && "text-brand",
            tone === "ai" && "text-ai",
          )}
        >
          {value}
        </p>
        {Icon && <Icon className="mt-1 size-5 shrink-0 text-muted/70" aria-hidden />}
      </div>
      <p className="mt-0.5 text-xs text-muted sm:text-sm">{label}</p>
    </>
  );
  const cls = "rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card";
  return href ? (
    <Link href={href} className={cn(cls, "transition duration-200 hover:-translate-y-0.5 hover:border-brand/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function BackLink({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-1 mb-4 flex min-h-11 items-center gap-1.5 rounded-lg px-1 py-1 text-[15px] font-medium text-muted transition hover:text-fg"
    >
      <ArrowLeft className="size-5" aria-hidden /> {label}
    </button>
  );
}

/** "Load more" for infinite lists. */
export function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  if (!hasMore) return null;
  return (
    <div className="mt-6 flex justify-center">
      <Button variant="secondary" onClick={onClick} loading={loading}>
        Load more
      </Button>
    </div>
  );
}
