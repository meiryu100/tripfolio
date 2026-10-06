"use client";

import { Bell, Camera, UserCheck, UserMinus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Page } from "@/components/app-shell";
import { LoadMore, UserRowSkeleton } from "@/components/cards";
import { Avatar, EmptyState, ErrorState } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { flatten, useMarkNotificationsRead, useNotifications } from "@/features/social/api";
import { getCountry } from "@/lib/countries";
import type { AppNotification } from "@/lib/types";
import { cn, dayBucket, timeAgo } from "@/lib/utils";

const META: Record<AppNotification["type"], { icon: typeof Bell; tone: string }> = {
  FOLLOW: { icon: UserPlus, tone: "bg-brand-soft text-brand" },
  FOLLOW_REQUEST: { icon: UserPlus, tone: "bg-ai-soft text-ai" },
  FOLLOW_ACCEPTED: { icon: UserCheck, tone: "bg-visited-soft text-visited" },
  UNFOLLOW: { icon: UserMinus, tone: "bg-surface-2 text-muted" },
  TRIP: { icon: Camera, tone: "bg-wishlist-soft text-wishlist" },
};

function describe(n: AppNotification) {
  switch (n.type) {
    case "FOLLOW":
      return "started following you.";
    case "FOLLOW_REQUEST":
      return "asked to follow you.";
    case "FOLLOW_ACCEPTED":
      return "accepted your follow request.";
    case "UNFOLLOW":
      return "unfollowed you.";
    case "TRIP": {
      const c = n.trip ? getCountry(n.trip.countryCode) : undefined;
      return `added a new trip${c ? ` to ${c.flag} ${c.name}` : ""}.`;
    }
  }
}

function hrefFor(n: AppNotification) {
  if (n.type === "TRIP" && n.trip) return `/trips/${n.trip.id}`;
  if (n.type === "FOLLOW_REQUEST") return "/friends";
  return `/u/${n.actor.username}`;
}

export default function NotificationsPage() {
  const q = useNotifications();
  return (
    <Page title="Notifications">
      {q.isPending ? (
        Array.from({ length: 5 }, (_, i) => <UserRowSkeleton key={i} />)
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : flatten(q.data).length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="No notifications yet"
          body="When someone follows you or a friend shares a trip, you'll see it here."
          action={
            <Link href="/explore" className="text-sm font-semibold text-brand hover:underline">
              Find travelers to follow
            </Link>
          }
        />
      ) : (
        <NotificationList items={flatten(q.data)} hasMore={Boolean(q.hasNextPage)} loadingMore={q.isFetchingNextPage} onMore={() => q.fetchNextPage()} />
      )}
    </Page>
  );
}

function NotificationList({
  items,
  hasMore,
  loadingMore,
  onMore,
}: {
  items: AppNotification[];
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
}) {
  const me = useMe();
  const { mutate } = useMarkNotificationsRead();
  // Snapshot what was unread on arrival so it stays highlighted after we mark it read.
  const [unread] = useState(() => new Set(items.filter((n) => !n.read).map((n) => n.id)));
  useEffect(() => {
    if (me.unreadNotifications > 0) mutate();
  }, [me.unreadNotifications, mutate]);

  const groups = new Map<string, AppNotification[]>();
  for (const n of items) {
    const b = dayBucket(n.createdAt);
    groups.set(b, [...(groups.get(b) ?? []), n]);
  }

  return (
    <div className="grid gap-6">
      {[...groups.entries()].map(([label, list]) => (
        <section key={label} aria-labelledby={`n-${label}`}>
          <h2 id={`n-${label}`} className="mb-2 text-sm font-semibold text-muted">
            {label}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            {list.map((n) => {
              const { icon: Icon, tone } = META[n.type];
              const isNew = unread.has(n.id);
              return (
                <li key={n.id} className="border-b border-border last:border-0">
                  <Link
                    href={hrefFor(n)}
                    className={cn("flex min-h-16 items-center gap-3 px-4 py-3 transition duration-200 hover:bg-surface-2", isNew && "bg-brand-soft/60")}
                  >
                    <span className="relative shrink-0">
                      <Avatar user={n.actor} size={44} />
                      <span className={cn("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-surface", tone)} aria-hidden>
                        <Icon className="size-3" strokeWidth={2.5} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p>
                        <span className="font-semibold">{n.actor.firstName}</span> {describe(n)}
                      </p>
                      <p className="text-sm text-muted">
                        <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                      </p>
                    </div>
                    {isNew && <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label="New" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <LoadMore hasMore={hasMore} loading={loadingMore} onClick={onMore} />
    </div>
  );
}
