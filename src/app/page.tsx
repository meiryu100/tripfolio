"use client";

import { Camera, Heart, MapPinned, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { illustration, Photo } from "@/components/photo";
import { buttonClass } from "@/components/ui";
import { useMeQuery } from "@/features/auth/api";
import { WorldMap } from "@/features/map/world-map";
import type { CountryStatus } from "@/lib/types";

const PREVIEW: Record<string, CountryStatus> = Object.fromEntries([
  ...["US", "CA", "MX", "BR", "PE", "GB", "FR", "ES", "IT", "DE", "GR", "TR", "EG", "JP", "TH", "VN", "AU", "IS", "PT", "MA"].map((c) => [c, "visited"]),
  ...["AR", "CL", "NZ", "ZA", "KE", "IN", "NO", "ID", "MN", "CO"].map((c) => [c, "wishlist"]),
]);

const FEATURES = [
  { icon: MapPinned, title: "Countries Visited", body: "Tap a country to paint your map green. Watch your % of the world grow.", color: "text-visited bg-visited-soft" },
  { icon: Heart, title: "Countries Wishlist", body: "Keep a list of where you're going next, right on the same map.", color: "text-wishlist bg-wishlist-soft" },
  { icon: Camera, title: "Travel Photos", body: "Attach photos, dates and notes to every trip — or keep it to a single tap.", color: "text-brand bg-brand-soft" },
  { icon: Users, title: "Social Profiles", body: "Follow friends, explore their maps, and discover your next destination.", color: "text-ai bg-ai-soft" },
];

export default function LandingPage() {
  const me = useMeQuery().data;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        {me ? (
          <Link href="/home" className={buttonClass("primary", "sm")}>
            Open my world
          </Link>
        ) : (
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            Log In
          </Link>
        )}
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-14">
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-muted shadow-soft">
            <Sparkles className="size-4 text-ai" aria-hidden /> Your travel memory, beautifully organized
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Your world.
            <br />
            <span className="text-gradient">Your journeys.</span>
            <br />
            <span className="text-brand">Your memories.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-muted">
            Map every country you&apos;ve been to, keep the stories behind them, and explore the world through other travelers.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={me ? "/home" : "/register"} className={buttonClass("primary", "lg", "min-w-44")}>
              Get Started
            </Link>
            {!me && (
              <Link href="/login" className={buttonClass("secondary", "lg", "min-w-44")}>
                Log In
              </Link>
            )}
          </div>
        </div>

        <div className="relative mt-12">
          <WorldMap statuses={PREVIEW} zoomable={false} className="aspect-[2/1] w-full border border-border shadow-card" />
          <FloatingCard className="top-[8%] left-[3%] hidden sm:flex" emoji="🗻" hue={350} title="Japan Adventure" sub="Mar 12 – Mar 25 · 8 photos" />
          <FloatingCard className="right-[4%] bottom-[18%] hidden md:flex" emoji="🏔️" hue={140} title="Inca Trail" sub="@davidtravel · 83 countries" />
          <div className="absolute top-4 right-4 rounded-2xl border border-border glass px-4 py-3 shadow-card">
            <p className="text-2xl font-semibold text-visited tabular-nums">20</p>
            <p className="text-xs text-muted">Countries · 10.3% of the world</p>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-float">
              <span className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted">Travora · Made for people who collect places.</footer>
    </div>
  );
}

function FloatingCard({ className, emoji, hue, title, sub }: { className: string; emoji: string; hue: number; title: string; sub: string }) {
  return (
    <div className={`absolute items-center gap-3 rounded-2xl border border-border glass p-2 pr-4 shadow-card ${className}`}>
      <Photo photo={illustration(emoji, hue)} className="size-12 rounded-xl" emojiSize="text-2xl" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}
