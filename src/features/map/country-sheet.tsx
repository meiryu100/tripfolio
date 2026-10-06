"use client";

import { CalendarDays, Check, ChevronRight, Circle, Compass, Heart, Images, Plus } from "lucide-react";
import Link from "next/link";
import { TripCover } from "@/components/photo";
import { Avatar, Button, Sheet, SheetClose, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useCountryDetail } from "@/features/explore/api";
import { flatten, useProfile } from "@/features/social/api";
import { useUserTrips } from "@/features/trips/api";
import { errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { CountryStatus, Trip, UserSummary } from "@/lib/types";
import { closeCountry, openTripEditor, pulseCountry, toast, useUI } from "@/lib/ui";
import { cn, formatDateRange, plural } from "@/lib/utils";
import { useSetCountryStatus, useUserMap } from "./api";

export function CountrySheet() {
  const sheet = useUI((s) => s.countrySheet);
  return (
    <Sheet open={Boolean(sheet)} onClose={closeCountry} label="Country details">
      {sheet && <CountrySheetBody key={sheet.code + sheet.username} code={sheet.code} username={sheet.username} />}
    </Sheet>
  );
}

/** Change the viewer's status for a country, with toast + map highlight. */
export function useApplyStatus() {
  const me = useMe();
  const mutation = useSetCountryStatus(me.username);
  return {
    pending: mutation.isPending,
    apply(code: string, next: CountryStatus | null) {
      const name = getCountry(code)?.name ?? code;
      pulseCountry(code);
      mutation.mutate(
        { code, status: next },
        {
          onSuccess: () => {
            if (next === "visited") toast(`${name} added to your world ✓`);
            else if (next === "wishlist") toast(`${name} added to your wishlist ♡`);
            else toast(`${name} removed from your map`, "info");
          },
          onError: (e) => toast(errorMessage(e), "error"),
        },
      );
    },
  };
}

function CountrySheetBody({ code, username }: { code: string; username: string }) {
  const country = getCountry(code);
  const me = useMe();
  const isMine = me.username.toLowerCase() === username.toLowerCase();

  if (!country) return null;
  return (
    <>
      <div className="flex items-start gap-4 px-6 pt-5 pb-4">
        <span className="text-6xl leading-none drop-shadow-sm" aria-hidden>
          {country.flag}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-2xl font-bold tracking-tight">{country.name}</h2>
          <p className="text-sm text-muted">
            {country.capital && `${country.capital} · `}
            {country.continent}
          </p>
        </div>
        <SheetClose onClick={closeCountry} className="-mt-1 -mr-2" />
      </div>

      <div className="overflow-y-auto px-6 pb-6">
        {isMine ? <MyCountry code={code} name={country.name} /> : <TheirCountry code={code} username={username} />}
        <PeopleYouFollow code={code} exclude={isMine ? undefined : username} />
        <Link
          href={`/explore/${code.toLowerCase()}`}
          onClick={closeCountry}
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <Compass className="size-4" aria-hidden /> Discover {country.name}
        </Link>
      </div>
    </>
  );
}

const OPTIONS: { value: CountryStatus | null; label: string; icon: typeof Check }[] = [
  { value: null, label: "Not visited", icon: Circle },
  { value: "visited", label: "Visited", icon: Check },
  { value: "wishlist", label: "Want to visit", icon: Heart },
];

function MyCountry({ code, name }: { code: string; name: string }) {
  const me = useMe();
  const map = useUserMap(me.username);
  const tripsQuery = useUserTrips(me.username, { country: code });
  const trips = flatten(tripsQuery.data);
  const status = map.data?.statuses[code] ?? null;
  const { apply } = useApplyStatus();
  const locked = trips.length > 0;

  if (map.isPending) return <Skeleton className="h-28" />;

  if (!status && !locked) {
    return (
      <div className="animate-rise">
        <p className="mb-4 text-muted">Add to your journey</p>
        <div className="grid gap-2.5">
          <Button size="lg" variant="visited" onClick={() => apply(code, "visited")}>
            <Check className="size-5" /> Mark as Visited
          </Button>
          <Button size="lg" variant="secondary" onClick={() => apply(code, "wishlist")}>
            <Heart className="size-5 text-wishlist" /> Want to Visit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 shadow-pressed">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = status === value;
          const disabled = locked && value !== "visited";
          return (
            <button
              key={label}
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={disabled ? "Countries with trips stay visited" : undefined}
              onClick={() => !active && apply(code, value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition duration-200 disabled:opacity-40",
                active && value === "visited" && "bg-visited text-on-status shadow-soft",
                active && value === "wishlist" && "bg-wishlist text-on-status shadow-soft",
                active && value === null && "bg-surface text-fg shadow-soft",
                !active && "text-muted hover:text-fg",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
      {locked && <p className="mt-2 text-xs text-muted">Countries with trips stay visited.</p>}

      <h3 className="mt-6 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Your trips</h3>
      {tripsQuery.isPending ? (
        <Skeleton className="h-20" />
      ) : trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
          {status === "visited" ? `Add dates, photos and a memory from ${name}.` : "Planning to go? Add a trip once you've been."}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {trips.map((t, i) => (
            <TripRow key={t.id} trip={t} index={trips.length > 1 ? trips.length - i : undefined} />
          ))}
        </div>
      )}

      <Button
        size="lg"
        variant={trips.length ? "secondary" : "primary"}
        className="mt-4 w-full"
        onClick={() => openTripEditor({ country: code })}
      >
        <Plus className="size-5" /> {trips.length ? "Add Another Trip" : "Add Trip"}
      </Button>
    </div>
  );
}

function TheirCountry({ code, username }: { code: string; username: string }) {
  const me = useMe();
  const profile = useProfile(username);
  const theirMap = useUserMap(username);
  const myMap = useUserMap(me.username);
  const tripsQuery = useUserTrips(username, { country: code });
  const trips = flatten(tripsQuery.data);
  const { apply } = useApplyStatus();
  const name = profile.data?.firstName ?? "They";
  const status = theirMap.data?.statuses[code];
  const myStatus = myMap.data?.statuses[code];

  if (theirMap.isPending) return <Skeleton className="h-24" />;

  return (
    <div>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
          status === "visited" && "bg-visited-soft text-visited",
          status === "wishlist" && "bg-wishlist-soft text-wishlist",
          !status && "bg-surface-2 text-muted",
        )}
      >
        {status === "visited" && (
          <>
            <Check className="size-4" aria-hidden /> {name} has been here
          </>
        )}
        {status === "wishlist" && (
          <>
            <Heart className="size-4" aria-hidden /> On {name}&apos;s wishlist
          </>
        )}
        {!status && <>Not on {name}&apos;s map yet</>}
      </div>

      {trips.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{name}&apos;s trips</h3>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {trips.map((t) => (
              <TripRow key={t.id} trip={t} />
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2">
        <span className="text-sm">
          {myStatus === "visited" ? "You've been here too ✓" : myStatus === "wishlist" ? "On your wishlist ♡" : "Your map"}
        </span>
        {!myStatus && (
          <Button size="sm" variant="secondary" onClick={() => apply(code, "wishlist")}>
            <Heart className="size-4 text-wishlist" /> Want to Visit
          </Button>
        )}
      </div>
    </div>
  );
}

/** Social discovery: who you follow has been here / wants to go. */
function PeopleYouFollow({ code, exclude }: { code: string; exclude?: string }) {
  const { data } = useCountryDetail(code);
  if (!data) return null;
  const drop = (list: UserSummary[]) => list.filter((u) => u.username.toLowerCase() !== exclude?.toLowerCase());
  const visited = drop(data.following.visited);
  const wishlist = drop(data.following.wishlist);
  if (!visited.length && !wishlist.length) return null;
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">People you follow</h3>
      <ul className="grid gap-1">
        {visited.slice(0, 4).map((u) => (
          <PersonLine key={`v${u.id}`} user={u} text="visited" tone="visited" />
        ))}
        {wishlist.slice(0, 4).map((u) => (
          <PersonLine key={`w${u.id}`} user={u} text="wants to visit" tone="wishlist" />
        ))}
      </ul>
    </section>
  );
}

function PersonLine({ user, text, tone }: { user: UserSummary; text: string; tone: "visited" | "wishlist" }) {
  return (
    <li>
      <Link
        href={`/u/${user.username}`}
        onClick={closeCountry}
        className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-sm transition duration-200 hover:bg-surface-2"
      >
        <Avatar user={user} size={28} />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{user.firstName}</span> {text}
        </span>
        <span className={cn("size-2 rounded-full", tone === "visited" ? "bg-visited" : "bg-wishlist")} aria-hidden />
      </Link>
    </li>
  );
}

function TripRow({ trip, index }: { trip: Trip; index?: number }) {
  const flag = getCountry(trip.countryCode)?.flag ?? "🌍";
  const dates = formatDateRange(trip.startDate, trip.endDate, true);
  return (
    <Link
      href={`/trips/${trip.id}`}
      onClick={closeCountry}
      className="group flex gap-3 rounded-2xl border border-border p-2.5 transition duration-200 hover:border-brand/40 hover:bg-surface-2"
    >
      <TripCover photo={trip.cover} flag={flag} className="size-16 shrink-0 rounded-xl text-2xl" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate font-semibold">
          {index !== undefined && <span className="mr-1.5 text-xs font-medium text-muted">#{index}</span>}
          {trip.title || getCountry(trip.countryCode)?.name}
        </p>
        {dates && (
          <p className="flex items-center gap-1 text-sm text-muted">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden /> {dates}
          </p>
        )}
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted">
          <Images className="size-3.5 shrink-0" aria-hidden />
          <span className="shrink-0 whitespace-nowrap">{plural(trip.photoCount, "photo")}</span>
          {trip.description && <span className="min-w-0 truncate italic">· “{trip.description}”</span>}
        </p>
      </div>
      <ChevronRight className="size-5 self-center text-muted transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
