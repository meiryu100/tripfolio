"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { isRecapSeason, recapYear } from "./year-in-travel";

// Fixed when the module loads, so render stays pure.
const NOW = new Date();
const SHOW = isRecapSeason(NOW);
const YEAR = recapYear(NOW);

/** Points to /year in December and January only (the rest of the year the page is still reachable by URL). */
export function YearRecapCard({ className = "" }: { className?: string }) {
  if (!SHOW) return null;
  return (
    <Link
      href="/year"
      className={`bg-aurora group flex items-center gap-3 rounded-2xl px-5 py-4 text-white shadow-float transition hover:brightness-105 ${className}`}
    >
      <Sparkles className="size-6 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Your {YEAR} in travel is ready</span>
        <span className="block text-sm opacity-90">Countries, new places and days on the road — see it and share it.</span>
      </span>
      <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
