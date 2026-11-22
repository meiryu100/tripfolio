"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { UserRow, UserRowSkeleton } from "@/components/cards";
import { buttonClass } from "@/components/button-class";
import { useMe } from "@/features/auth/api";
import { useExplore } from "@/features/explore/api";
import { cn, plural } from "@/lib/utils";

/** Three real travelers to follow, ranked by the countries they share with you. */
export function FollowSuggestions({ className }: { className?: string }) {
  const me = useMe();
  const q = useExplore();
  const people = q.data?.suggestions.slice(0, 3) ?? [];
  if (q.isError || (q.isSuccess && people.length === 0)) return null;
  return (
    <div className={cn("rounded-3xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Follow 3 travelers</h2>
        <Link href="/explore" className={buttonClass("ghost", "sm")}>
          More <ArrowRight className="size-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">See where they&apos;ve been and get ideas for your next trip.</p>
      <div className="mt-2 divide-y divide-border">
        {q.isPending
          ? Array.from({ length: 3 }, (_, i) => <UserRowSkeleton key={i} />)
          : people.map((u) => (
              <UserRow key={u.id} user={u} relationship={u.relationship} isMe={u.id === me.id} meta={u.visited ? plural(u.visited, "country", "countries") : undefined} />
            ))}
      </div>
    </div>
  );
}
