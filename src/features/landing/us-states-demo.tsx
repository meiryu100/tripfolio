"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { trackClick } from "@/components/analytics";
import { useState } from "react";
import { buttonClass } from "@/components/button-class";
import { RegionMap } from "@/features/map/world-map";
import { ShareDemoMapButton } from "@/features/share/share";
import { countVisitedRegions, US_STATES, withRegionCountries } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveDemoPicks } from "./demo-picks";

const NEXT: Record<string, CountryStatus | undefined> = { none: "visited", visited: "wishlist", wishlist: undefined };

/**
 * "Try it" US states map for /us-states-visited-map: tap a state on the map, or tick it in the
 * list, to cycle visited → want to go → clear. No account needed; the picks carry over to sign-up
 * like the world demo map's. The list is plain HTML, so it also works as a checklist without the map.
 */
export function UsStatesDemo() {
  const [states, setStates] = useState<Record<string, CountryStatus>>({});
  const visited = countVisitedRegions(states, "US");
  const wishlist = Object.values(states).filter((s) => s === "wishlist").length;
  const countries = withRegionCountries({}, states);

  const cycle = (code: string) =>
    setStates((s) => {
      const next = NEXT[s[code] ?? "none"];
      const copy = { ...s };
      if (next) copy[code] = next;
      else delete copy[code];
      return copy;
    });

  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-3 shadow-card backdrop-blur sm:p-4">
      <RegionMap country="US" statuses={states} onSelect={cycle} legend={false} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1" aria-live="polite">
        <p className="text-sm text-muted">Tap a state: once for visited, twice for want to go, three times to clear.</p>
        <p className="font-heading text-lg font-bold tabular-nums">
          {visited} / 50 <span className="font-sans text-sm font-normal text-muted">states · {Math.round((visited / 50) * 100)}%</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
        <Link
          href="/register"
          onClick={() => {
            saveDemoPicks({ ...countries, ...states });
            trackClick("save_map", { states: visited + wishlist });
          }}
          className={buttonClass("primary", "lg", "min-w-56 text-base")}
        >
          {visited + wishlist > 0 ? "Save my map — it's free" : "Make my map — it's free"}
        </Link>
        {visited + wishlist > 0 && <ShareDemoMapButton statuses={countries} regionStatuses={states} />}
        {visited + wishlist > 0 && (
          <button
            onClick={() => {
              setStates({});
              trackClick("start_over");
            }}
            className={buttonClass("ghost", "lg", "text-muted")}
          >
            <RotateCcw className="size-4" aria-hidden /> Start over
          </button>
        )}
      </div>

      <details className="mt-4 border-t border-border pt-4" open>
        <summary className="flex min-h-11 cursor-pointer items-center px-1 font-semibold">All 50 states and DC, A to Z</summary>
        <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {US_STATES.map((s) => {
            const status = states[s.code];
            return (
              <li key={s.code}>
                <button
                  type="button"
                  onClick={() => cycle(s.code)}
                  aria-pressed={status === "visited"}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition hover:bg-surface-2",
                    status === "visited" && "font-semibold text-visited",
                    status === "wishlist" && "font-semibold text-wishlist",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 shrink-0 rounded border border-border",
                      status === "visited" && "border-visited bg-visited",
                      status === "wishlist" && "border-wishlist bg-wishlist",
                    )}
                    aria-hidden
                  />
                  {s.name}
                  {!s.counts && <span className="text-xs font-normal text-muted">(not a state)</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
