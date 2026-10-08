"use client";

import { Check, ChevronRight, Circle, Heart } from "lucide-react";
import { Button, Sheet, SheetClose, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useProfile } from "@/features/social/api";
import { errorMessage } from "@/lib/api-client";
import { getRegion } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { closeRegion, openCountry, pulseCountry, toast, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useSetRegionStatus, useUserRegions } from "./regions-api";

/** Details for one US state, opened from the USA map. */
export function RegionSheet() {
  const sheet = useUI((s) => s.regionSheet);
  return (
    <Sheet open={Boolean(sheet)} onClose={closeRegion} label="State details">
      {sheet && <RegionBody key={sheet.code + sheet.username} code={sheet.code} username={sheet.username} />}
    </Sheet>
  );
}

const OPTIONS: { value: CountryStatus | null; label: string; icon: typeof Check }[] = [
  { value: null, label: "Not visited", icon: Circle },
  { value: "visited", label: "Visited", icon: Check },
  { value: "wishlist", label: "Want to visit", icon: Heart },
];

function useApplyRegion() {
  const me = useMe();
  const mutation = useSetRegionStatus(me.username);
  return (code: string, next: CountryStatus | null) => {
    const name = getRegion(code)?.name ?? code;
    pulseCountry(code);
    mutation.mutate(
      { code, status: next },
      {
        onSuccess: () =>
          toast(
            next === "visited" ? `${name} added to your USA map ✓` : next === "wishlist" ? `${name} added to your wishlist ♡` : `${name} removed`,
            next ? "success" : "info",
          ),
        onError: (e) => toast(errorMessage(e), "error"),
      },
    );
  };
}

function RegionBody({ code, username }: { code: string; username: string }) {
  const region = getRegion(code);
  const me = useMe();
  const isMine = me.username.toLowerCase() === username.toLowerCase();
  const regions = useUserRegions(username);
  const myRegions = useUserRegions(me.username);
  const owner = useProfile(username);
  const apply = useApplyRegion();
  const status = regions.data?.statuses[code] ?? null;
  const myStatus = myRegions.data?.statuses[code] ?? null;

  if (!region) return null;
  return (
    <>
      <div className="flex items-start gap-4 px-6 pt-5 pb-4">
        <span className="bg-aurora flex size-14 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-bold text-white shadow-glow" aria-hidden>
          {region.abbr}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-2xl font-bold tracking-tight">{region.name}</h2>
          <p className="text-sm text-muted">🇺🇸 United States{region.counts ? "" : " · federal district"}</p>
        </div>
        <SheetClose onClick={closeRegion} className="-mt-1 -mr-2" />
      </div>
      <div className="-mt-1 px-6 pb-4">
        <button
          onClick={() => {
            closeRegion();
            openCountry("US", username);
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold transition duration-200 hover:bg-brand-soft hover:text-brand"
        >
          <span aria-hidden>🇺🇸</span> United States — trips & more <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="px-6 pb-6">
        {regions.isPending ? (
          <Skeleton className="h-12" />
        ) : isMine ? (
          <>
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 shadow-pressed">
              {OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = status === value;
                return (
                  <button
                    key={label}
                    role="radio"
                    aria-checked={active}
                    onClick={() => !active && apply(code, value)}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition duration-300",
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
            <p className="mt-3 text-xs text-muted">Marking a state visited also marks the USA visited on your world map.</p>
          </>
        ) : (
          <>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                status === "visited" && "bg-visited-soft text-visited",
                status === "wishlist" && "bg-wishlist-soft text-wishlist",
                !status && "bg-surface-2 text-muted",
              )}
            >
              {status === "visited" ? (
                <>
                  <Check className="size-4" aria-hidden /> {owner.data?.firstName ?? "They"} has been here
                </>
              ) : status === "wishlist" ? (
                <>
                  <Heart className="size-4" aria-hidden /> On {owner.data?.firstName ?? "their"}&apos;s wishlist
                </>
              ) : (
                <>Not on {owner.data?.firstName ?? "their"}&apos;s map yet</>
              )}
            </div>
            <div className="mt-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2">
              <span className="text-sm">
                {myStatus === "visited" ? "You've been here too ✓" : myStatus === "wishlist" ? "On your wishlist ♡" : "Your USA map"}
              </span>
              {!myStatus && (
                <Button size="sm" variant="secondary" onClick={() => apply(code, "wishlist")}>
                  <Heart className="size-4 text-wishlist" /> Want to Visit
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
