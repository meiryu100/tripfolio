"use client";

import { Share2 } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { useMe } from "@/features/auth/api";
import { useUserMap } from "@/features/map/api";
import { getCountry, SOVEREIGN_CODES } from "@/lib/countries";
import type { CountryStatus, Profile } from "@/lib/types";
import { toast } from "@/lib/ui";

/**
 * "Compare" on someone else's profile: the countries you've both been to, the ones only one of you
 * has, and the wishlist you share. Counts the 195 sovereign countries only, like every other count.
 */
const SOVEREIGN = new Set(SOVEREIGN_CODES);

function codes(statuses: Record<string, CountryStatus> | undefined, status: CountryStatus) {
  return new Set(Object.entries(statuses ?? {}).flatMap(([code, s]) => (s === status && SOVEREIGN.has(code) ? [code] : [])));
}

const byName = (a: string, b: string) => (getCountry(a)?.name ?? a).localeCompare(getCountry(b)?.name ?? b);

export function CompareMaps({ profile }: { profile: Profile }) {
  const me = useMe();
  const mine = useUserMap(me.username);
  const theirs = useUserMap(profile.username);

  if (mine.isPending || theirs.isPending) return <Skeleton className="h-64" />;

  const myVisited = codes(mine.data?.statuses, "visited");
  const theirVisited = codes(theirs.data?.statuses, "visited");
  const both = [...myVisited].filter((c) => theirVisited.has(c)).sort(byName);
  const onlyMe = [...myVisited].filter((c) => !theirVisited.has(c)).sort(byName);
  const onlyThem = [...theirVisited].filter((c) => !myVisited.has(c)).sort(byName);
  const theirWishlist = profile.canView.wishlist ? codes(theirs.data?.statuses, "wishlist") : new Set<string>();
  const dreams = [...codes(mine.data?.statuses, "wishlist")].filter((c) => theirWishlist.has(c)).sort(byName);
  const name = profile.firstName;

  async function share() {
    const url = `${window.location.origin}/u/${profile.username}`;
    const text = `${me.firstName} and ${name} have both been to ${both.length} ${both.length === 1 ? "country" : "countries"}. Compare your map on Tripfolio:`;
    try {
      if (navigator.share) await navigator.share({ title: "Our travel maps", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast("Copied — paste it anywhere ✓");
      }
    } catch {
      // The person closed the share sheet.
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Count label="Both of you" value={both.length} />
        <Count label="Only you" value={onlyMe.length} />
        <Count label={`Only ${name}`} value={onlyThem.length} />
      </div>

      <Group title="You've both been to" codes={both} empty={`No country in common yet — ${name} might have ideas for you.`} />
      <Group title={`Only ${name} has been to`} codes={onlyThem} empty={`You've been everywhere ${name} has.`} />
      <Group title="Only you have been to" codes={onlyMe} empty={`${name} has been everywhere you have.`} />
      {profile.canView.wishlist && <Group title="On both your wishlists" codes={dreams} empty="No shared dream destination yet." />}

      <div>
        <Button variant="secondary" onClick={share}>
          <Share2 className="size-4" /> Share our comparison
        </Button>
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-soft">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 truncate text-xs text-muted sm:text-sm">{label}</div>
    </div>
  );
}

function Group({ title, codes, empty }: { title: string; codes: string[]; empty: string }) {
  return (
    <section>
      <h3 className="mb-2 font-semibold">
        {title} <span className="text-muted tabular-nums">· {codes.length}</span>
      </h3>
      {codes.length ? (
        <ul className="flex flex-wrap gap-2">
          {codes.map((code) => {
            const c = getCountry(code);
            return (
              <li key={code} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm">
                <span aria-hidden>{c?.flag}</span>
                {c?.name ?? code}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
