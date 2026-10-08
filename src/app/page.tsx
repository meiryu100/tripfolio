"use client";

import { ArrowRight, Camera, Compass, Globe2, MapPinned, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CountUp, Parallax, Reveal } from "@/components/motion";
import { illustration, Photo } from "@/components/photo";
import { Avatar, buttonClass } from "@/components/ui";
import { useMeQuery } from "@/features/auth/api";
import { useExplore } from "@/features/explore/api";
import { WorldMap } from "@/features/map/world-map";
import { getCountry } from "@/lib/countries";
import type { CountryStatus } from "@/lib/types";

const PREVIEW: Record<string, CountryStatus> = Object.fromEntries([
  ...["US", "CA", "MX", "BR", "PE", "GB", "FR", "ES", "IT", "DE", "GR", "TR", "EG", "JP", "TH", "VN", "AU", "IS", "PT", "MA"].map((c) => [c, "visited"]),
  ...["AR", "CL", "NZ", "ZA", "KE", "IN", "NO", "ID", "MN", "CO"].map((c) => [c, "wishlist"]),
]);

const STORY = [
  {
    icon: MapPinned,
    kicker: "01 · Map it",
    title: "Paint the world you've seen",
    body: "Tap a country and it lights up. Visited in green, dreams in orange — and a live count of how much of the planet you've explored.",
  },
  {
    icon: Camera,
    kicker: "02 · Remember it",
    title: "Keep every trip, not just the country",
    body: "Dates, cities, photos and the story you'll want to tell. Go back to Japan three times? That's three trips on one country.",
  },
  {
    icon: Users,
    kicker: "03 · Share it",
    title: "Discover the world through friends",
    body: "Follow travelers, explore their maps, and find your next destination in the places they loved.",
  },
];

export default function LandingPage() {
  const me = useMeQuery().data;
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          {me ? (
            <Link href="/home" className={buttonClass("primary", "sm")}>
              Open my world
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                Log In
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero: headline + parallax layers (map, floating cards, stats) ── */}
      <section className="relative mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
        <div className="animate-rise relative z-10 mx-auto max-w-3xl text-center">
          <p className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted shadow-soft">
            <Sparkles className="size-4 text-ai" aria-hidden /> Your travel memory, beautifully mapped
          </p>
          <h1 className="text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl">
            Your world.
            <br />
            <span className="text-gradient">Your journeys.</span>
            <br />
            Your memories.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted sm:text-xl">
            Map every country you&apos;ve been to, keep the stories behind them, and explore the world through other travelers.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={me ? "/home" : "/register"} className={buttonClass("primary", "lg", "min-w-48 text-base")}>
              Start your map <ArrowRight className="size-5" />
            </Link>
            {!me && (
              <Link href="/login" className={buttonClass("secondary", "lg", "min-w-48 text-base")}>
                I have an account
              </Link>
            )}
          </div>
        </div>

        <div className="relative mt-16">
          <Parallax speed={-0.05}>
            <div className="aurora-border rounded-[2rem] p-1.5 shadow-float">
              <WorldMap statuses={PREVIEW} zoomable={false} className="aspect-[2/1] w-full rounded-[1.6rem]" />
            </div>
          </Parallax>

          <Parallax speed={-0.14} className="absolute top-[6%] -left-2 hidden sm:block lg:-left-10">
            <FloatingTrip emoji="🗻" hue={350} title="Autumn in Japan" sub="Nov 8 – Nov 21 · 3 photos" flag="🇯🇵" />
          </Parallax>
          <Parallax speed={-0.22} className="absolute right-0 bottom-[12%] hidden md:block lg:-right-10">
            <FloatingTrip emoji="🏔️" hue={140} title="Andes & Machu Picchu" sub="@daniel.wanders" flag="🇵🇪" delay />
          </Parallax>
          <Parallax speed={-0.1} className="absolute -top-6 right-4 sm:right-10">
            <div className="glass animate-float rounded-3xl border border-border px-5 py-4 shadow-float">
              <p className="font-heading text-3xl font-bold text-visited">
                <CountUp value={20} />
              </p>
              <p className="text-xs text-muted">
                countries · <CountUp value={10.3} decimals={1} suffix="%" /> of the world
              </p>
            </div>
          </Parallax>
        </div>
      </section>

      {/* ── Story: three steps, alternating, revealed on scroll ── */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-3">
        {STORY.map(({ icon: Icon, kicker, title, body }, i) => (
          <Reveal key={title} index={i} className="lift rounded-3xl border border-border bg-surface/80 p-7 shadow-card backdrop-blur">
            <span className="bg-aurora flex size-12 items-center justify-center rounded-2xl text-white shadow-glow" aria-hidden>
              <Icon className="size-6" />
            </span>
            <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-brand uppercase">{kicker}</p>
            <h2 className="mt-2 text-2xl font-bold">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </Reveal>
        ))}
      </section>

      <CommunityStrip signedIn={Boolean(me)} />

      {/* ── Closing call to action ── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal className="bg-aurora relative overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white shadow-float sm:px-12">
          <Globe2 className="mx-auto size-12 opacity-90" aria-hidden />
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold sm:text-5xl">Where will your map go next?</h2>
          <p className="mx-auto mt-3 max-w-lg text-lg text-white/90">It takes a minute to start. Your first country is one tap away.</p>
          <Link
            href={me ? "/home" : "/register"}
            className="shine mt-8 inline-flex h-13 items-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-[#0c4a6e] shadow-float transition duration-300 hover:-translate-y-0.5"
          >
            {me ? "Open my world" : "Create your free account"} <ArrowRight className="size-5" />
          </Link>
        </Reveal>
      </section>

      <footer className="pb-10 text-center text-sm text-muted">Tripfolio · Made for people who collect places.</footer>
    </div>
  );
}

function FloatingTrip({ emoji, hue, title, sub, flag, delay }: { emoji: string; hue: number; title: string; sub: string; flag: string; delay?: boolean }) {
  return (
    <div
      className="glass animate-float flex items-center gap-3 rounded-3xl border border-border p-2.5 pr-5 shadow-float"
      style={delay ? { animationDelay: "-3s" } : undefined}
    >
      <Photo photo={illustration(emoji, hue)} className="size-14 rounded-2xl" emojiSize="text-2xl" />
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden>{flag}</span> {title}
        </p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

/** Real journeys from the community — social proof with real photos. */
function CommunityStrip({ signedIn }: { signedIn: boolean }) {
  const { data } = useExplore();
  // One trip per traveler, so the strip shows a variety of people and places.
  const seen = new Set<string>();
  const trips = (data?.journeys ?? []).filter((t) => t.cover && !seen.has(t.userId) && seen.add(t.userId)).slice(0, 6);
  if (!trips.length) return null;
  return (
    <section className="pb-24" aria-labelledby="community">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">From the community</p>
            <h2 id="community" className="mt-2 text-3xl font-bold sm:text-4xl">
              Real trips, <span className="text-gradient">real travelers</span>
            </h2>
          </div>
          <Link href={signedIn ? "/explore" : "/register"} className={buttonClass("secondary")}>
            <Compass className="size-4" /> Explore journeys
          </Link>
        </Reveal>
      </div>
      <div className="no-scrollbar mx-auto flex max-w-6xl snap-x gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
        {trips.map((t, i) => {
          const c = getCountry(t.countryCode);
          return (
            <Reveal key={t.id} index={i} className="w-72 shrink-0 snap-start">
              <div className="lift group relative overflow-hidden rounded-3xl shadow-card">
                <Photo photo={t.cover} size="full" className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.06]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                    <span aria-hidden>{c?.flag}</span> {c?.name}
                  </p>
                  <p className="mt-1 font-heading text-xl leading-tight font-bold">{t.title}</p>
                  {t.author && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/90">
                      <Avatar user={t.author} size={24} /> @{t.author.username}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
