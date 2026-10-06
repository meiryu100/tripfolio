"use client";

import { Check, Crown, Flag, Globe2, Mountain, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TravelStats } from "./compute";
import { WORLD_TOTAL } from "./compute";

const MILESTONE_ICONS = { flag: Flag, plane: Plane, globe: Globe2, mountain: Mountain, crown: Crown } as const;

/** "27 / 195 countries" progress with an encouraging line. */
export function WorldProgress({ stats, className, own = true }: { stats: TravelStats; className?: string; own?: boolean }) {
  const pct = stats.explored;
  return (
    <section aria-label="World progress" className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{own ? "Your World" : "Their World"}</p>
          <p className="font-heading text-2xl font-bold tracking-tight">
            {stats.sovereignVisited} <span className="text-muted">/ {WORLD_TOTAL} countries</span>
          </p>
        </div>
        <p className="font-heading text-3xl font-bold text-gradient tabular-nums">{pct.toFixed(1)}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Share of the world explored"
        className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2 shadow-pressed"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-bright to-ai transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(pct, pct > 0 ? 1.5 : 0)}%` }}
        />
      </div>
      <p className="mt-2.5 text-sm text-muted">
        {pct === 0
          ? "Your journey starts here."
          : stats.nextMilestone
            ? `${stats.nextMilestone.remaining} more to reach ${stats.nextMilestone.label}. Keep exploring.`
            : "Legendary. Keep exploring."}
      </p>
    </section>
  );
}

export function ContinentChecklist({ stats, className }: { stats: TravelStats; className?: string }) {
  return (
    <section aria-label="Continents" className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-semibold">Continents</h3>
        <span className="text-sm text-muted tabular-nums">{stats.continentsVisited} / 7</span>
      </div>
      <ul className="grid gap-2">
        {stats.continents.map((c) => {
          const done = c.visited > 0;
          const pct = c.total ? Math.min(100, (c.visited / c.total) * 100) : 0;
          return (
            <li key={c.name} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-2.5 gap-y-1">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  done ? "bg-visited text-on-status" : "bg-surface-2 shadow-pressed",
                )}
                aria-hidden
              >
                {done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={cn("text-sm", done ? "font-semibold" : "text-muted")}>
                {c.name}
                <span className="sr-only">{done ? ", visited" : ", not visited yet"}</span>
              </span>
              <span className="text-sm text-muted tabular-nums">
                {c.visited}
                {c.name !== "Antarctica" && <span className="text-muted/70"> / {c.total}</span>}
              </span>
              <div className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full bg-visited-fill transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Milestones({ stats, className }: { stats: TravelStats; className?: string }) {
  return (
    <section aria-label="Travel milestones" className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <h3 className="mb-3 font-semibold">Travel Milestones</h3>
      <ul className="grid grid-cols-5 gap-2">
        {stats.milestones.map((m) => {
          const Icon = MILESTONE_ICONS[m.icon as keyof typeof MILESTONE_ICONS];
          return (
            <li key={m.count} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl transition duration-300",
                  m.reached
                    ? "bg-gradient-to-br from-brand-bright to-ai text-white shadow-float"
                    : "bg-surface-2 text-muted/60 shadow-pressed",
                )}
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <span className={cn("text-[11px] leading-tight", m.reached ? "font-semibold" : "text-muted")}>
                {m.label}
                <span className="sr-only">{m.reached ? " — reached" : " — not yet"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Countries by continent, as a compact bar list (only continents with visits). */
export function ByContinent({ stats, className }: { stats: TravelStats; className?: string }) {
  const rows = stats.continents.filter((c) => c.visited > 0).sort((a, b) => b.visited - a.visited);
  const max = Math.max(1, ...rows.map((r) => r.visited));
  if (!rows.length) return null;
  return (
    <section aria-label="Countries by continent" className={cn("rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>
      <h3 className="mb-3 font-semibold">Countries by Continent</h3>
      <ul className="grid gap-2.5">
        {rows.map((r) => (
          <li key={r.name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span
                className="block h-full rounded-full bg-gradient-to-r from-brand-bright to-brand transition-[width] duration-700"
                style={{ width: `${(r.visited / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-semibold tabular-nums">{r.visited}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
