"use client";

import { Check, ChevronRight, Circle, Heart } from "lucide-react";
import { Button, Sheet, SheetClose, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useProfile } from "@/features/social/api";
import { errorMessage } from "@/lib/api-client";
import { getRegion, REGION_COUNTRIES } from "@/lib/regions";
import type { CountryStatus } from "@/lib/types";
import { closeRegion, openCountry, pulseCountry, toast, useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useSetRegionStatus, useUserRegions } from "./regions-api";

/** Details for one region (a US state, Canadian province, ...), opened from a map. */
export function RegionSheet() {
  const sheet = useUI((s) => s.regionSheet);
  const region = sheet ? getRegion(sheet.code) : undefined;
  return (
    <Sheet open={Boolean(sheet)} onClose={closeRegion} label={`${region?.kind ?? "Region"} details`}>
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
    const region = getRegion(code);
    const name = region?.name ?? code;
    const label = REGION_COUNTRIES[region?.country ?? "US"].label;
    pulseCountry(code);
    mutation.mutate(
      { code, status: next },
      {
        onSuccess: () =>
          toast(
            next === "visited" ? `${name} added to your ${label} map ✓` : next === "wishlist" ? `${name} added to your wishlist ♡` : `${name} removed`,
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
  const country = REGION_COUNTRIES[region.country];
  return (
    <>
      <div className="flex items-start gap-4 px-6 pt-5 pb-4">
        <span className="bg-aurora flex size-14 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-bold text-white shadow-glow" aria-hidden>
          {region.abbr}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-2xl font-bold tracking-tight">{region.name}</h2>
          <p className="text-sm text-muted">
            {country.flag} {country.name}
            {region.kind === "State" ? "" : ` · ${region.kind.toLowerCase()}`}
          </p>
        </div>
        <SheetClose onClick={closeRegion} className="-mt-1 -mr-2" />
      </div>
      <div className="-mt-1 px-6 pb-4">
        <button
          onClick={() => {
            closeRegion();
            openCountry(region.country, username);
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold transition duration-200 hover:bg-brand-soft hover:text-brand"
        >
          <span aria-hidden>{country.flag}</span> {country.name} — trips & more <ChevronRight className="size-4" aria-hidden />
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
            <p className="mt-3 text-xs text-muted">Marking a {country.noun} visited also marks {country.inSentence} visited on your world map.</p>
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
                {myStatus === "visited" ? "You've been here too ✓" : myStatus === "wishlist" ? "On your wishlist ♡" : `Your ${country.label} map`}
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
