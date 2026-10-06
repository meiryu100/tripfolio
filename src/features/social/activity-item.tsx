"use client";

import { Camera, Check, Heart } from "lucide-react";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { Avatar } from "@/components/ui";
import { getCountry } from "@/lib/countries";
import type { Activity } from "@/lib/types";
import { cn, formatDateRange, plural, timeAgo } from "@/lib/utils";

const META = {
  COUNTRY_VISITED: { icon: Check, tone: "bg-visited-soft text-visited", verb: "visited" },
  COUNTRY_WISHLISTED: { icon: Heart, tone: "bg-wishlist-soft text-wishlist", verb: "wants to visit" },
  TRIP_ADDED: { icon: Camera, tone: "bg-ai-soft text-ai", verb: "added a trip to" },
} as const;

export function ActivityItem({ activity: a, compact }: { activity: Activity; compact?: boolean }) {
  const c = getCountry(a.countryCode);
  const { icon: Icon, tone, verb } = META[a.type];
  const trip = a.trip;
  return (
    <article className="animate-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-start gap-3 p-4">
        <Link href={`/u/${a.user.username}`} className="relative shrink-0" aria-label={`${a.user.firstName}'s profile`}>
          <Avatar user={a.user} size={42} />
          <span className={cn("absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2 ring-surface", tone)} aria-hidden>
            <Icon className="size-3" strokeWidth={2.5} />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="leading-snug">
            <Link href={`/u/${a.user.username}`} className="font-semibold hover:underline">
              {a.user.firstName} {a.user.lastName}
            </Link>{" "}
            <span className="text-muted">{verb}</span>{" "}
            <Link href={`/explore/${a.countryCode.toLowerCase()}`} className="font-semibold hover:underline">
              {c?.flag} {c?.name ?? a.countryCode}
            </Link>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            <time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
          </p>
        </div>
      </div>

      {trip && (
        <Link href={`/trips/${trip.id}`} className="group block border-t border-border">
          {trip.cover && !compact && (
            <div className="overflow-hidden">
              <Photo photo={trip.cover} size="full" className="aspect-[16/9] w-full transition duration-500 group-hover:scale-[1.02]" emojiSize="text-7xl" />
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
            {trip.cover && compact && <Photo photo={trip.cover} className="size-12 shrink-0 rounded-xl" emojiSize="text-xl" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold group-hover:underline">{trip.title || c?.name}</p>
              <p className="truncate text-sm text-muted">
                {[formatDateRange(trip.startDate, trip.endDate), trip.cities.join(" · "), trip.photoCount ? plural(trip.photoCount, "photo") : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </Link>
      )}
    </article>
  );
}
