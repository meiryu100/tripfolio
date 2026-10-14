"use client";

import { ArrowRight, Check, Heart, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Page } from "@/components/app-shell";
import { CountrySearch } from "@/components/country-search";
import { EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useApplyStatus } from "@/features/map/country-sheet";
import { useUserMap } from "@/features/map/api";
import { useSetRegionStatus, useUserRegions } from "@/features/map/regions-api";
import { CONTINENTS } from "@/features/stats/compute";
import { getCountry } from "@/lib/countries";
import { getRegion } from "@/lib/regions";
import type { Country } from "@/lib/types";
import { openCountry, openRegion } from "@/lib/ui";
import { plural } from "@/lib/utils";

/** One card on the page: a country or a US state. */
interface WishItem {
  code: string;
  name: string;
  flag: string;
  sub: string;
  isRegion: boolean;
  continent: string;
}

export default function WishlistPage() {
  const me = useMe();
  const map = useUserMap(me.username);
  const regions = useUserRegions(me.username);
  const setRegion = useSetRegionStatus(me.username);
  const { apply } = useApplyStatus();

  const groups = useMemo(() => {
    const items: WishItem[] = Object.entries(map.data?.statuses ?? {})
      .filter(([, s]) => s === "wishlist")
      .map(([code]) => getCountry(code))
      .filter((c): c is Country => Boolean(c))
      .map((c) => ({ code: c.code, name: c.name, flag: c.flag, sub: c.capital || c.subregion, isRegion: false, continent: c.continent }));
    const states: WishItem[] = Object.entries(regions.data?.statuses ?? {})
      .filter(([, s]) => s === "wishlist")
      .map(([code]) => getRegion(code))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ code: r.code, name: `USA - ${r.name}`, flag: "🇺🇸", sub: "State", isRegion: true, continent: "North America" }));
    const list = [...items, ...states].sort((a, b) => a.name.localeCompare(b.name));
    return {
      states: states.length,
      groups: CONTINENTS.map((name) => ({ name, items: list.filter((i) => i.continent === name) })).filter((g) => g.items.length),
    };
  }, [map.data, regions.data]);
  const total = groups.groups.reduce((n, g) => n + g.items.length, 0);
  const countryCount = total - groups.states;
  const subtitle = !total
    ? "Where do you want to go next?"
    : groups.states
      ? `${countryCount ? `${plural(countryCount, "country", "countries")} and ` : ""}${plural(groups.states, "state")} you want to visit`
      : `${plural(total, "country", "countries")} you want to visit`;

  return (
    <Page wide title="Wishlist" subtitle={subtitle}>
      <CountrySearch
        className="mb-6 max-w-md"
        statuses={map.data?.statuses}
        onPick={(c) => (map.data?.statuses[c.code] ? openCountry(c.code, me.username) : apply(c.code, "wishlist"))}
        placeholder="Add a country to your wishlist…"
      />

      {map.isPending || regions.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : map.isError || regions.isError ? (
        <ErrorState
          body="We couldn't load your wishlist."
          onRetry={() => {
            map.refetch();
            regions.refetch();
          }}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Your wishlist is empty"
          body="Search above, or tap a country on your map and choose “Want to Visit”."
          action={
            <Link href="/explore" className={buttonClass("primary")}>
              Find inspiration <ArrowRight className="size-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8">
          {groups.groups.map((g) => (
            <section key={g.name} aria-labelledby={`wl-${g.name}`}>
              <h2 id={`wl-${g.name}`} className="mb-3 text-lg font-bold">
                {g.name} <span className="text-sm font-normal text-muted">· {g.items.length}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((c) => (
                  <li key={c.code} className="animate-rise flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card">
                    <button onClick={() => (c.isRegion ? openRegion(c.code, me.username) : openCountry(c.code, me.username))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="text-4xl leading-none" aria-hidden>
                        {c.flag}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{c.name}</span>
                        <span className="block truncate text-sm text-muted">{c.sub}</span>
                      </span>
                    </button>
                    <button
                      onClick={() => (c.isRegion ? setRegion.mutate({ code: c.code, status: "visited" }) : apply(c.code, "visited"))}
                      aria-label={`Mark ${c.name} as visited`}
                      title="Mark as visited"
                      className="flex size-11 items-center justify-center rounded-xl text-visited transition duration-200 hover:bg-visited-soft"
                    >
                      <Check className="size-5" />
                    </button>
                    <button
                      onClick={() => (c.isRegion ? setRegion.mutate({ code: c.code, status: null }) : apply(c.code, null))}
                      aria-label={`Remove ${c.name} from wishlist`}
                      title="Remove"
                      className="flex size-11 items-center justify-center rounded-xl text-muted transition duration-200 hover:bg-surface-2 hover:text-danger"
                    >
                      <X className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
