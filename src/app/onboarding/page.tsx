"use client";

import { ArrowRight, Globe2, PartyPopper, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CountrySearch } from "@/components/country-search";
import { Logo } from "@/components/logo";
import { Button, Spinner } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { meKey, useMeQuery } from "@/features/auth/api";
import { setStatuses } from "@/features/map/api";
import { WorldMap } from "@/features/map/world-map";
import { completeOnboarding } from "@/features/settings/api";
import { errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { CountryStatus, Me } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

export default function OnboardingPage() {
  const { data: me, isPending } = useMeQuery();
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [visited, setVisited] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!me) router.replace("/login");
    else if (me.onboarded && step === 0) router.replace("/home");
  }, [isPending, me, router, step]);

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="scale-125" />
      </div>
    );
  }

  const next = async () => {
    setSaving(true);
    try {
      if (step === 1 && visited.length) await setStatuses(visited, "visited");
      if (step === 2 && wishlist.length) await setStatuses(wishlist, "wishlist");
      setStep((s) => Math.min(3, s + 1) as Step);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };
  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      qc.setQueryData<Me | null>(meKey, (m) => (m ? { ...m, onboarded: true } : m));
      qc.invalidateQueries({ queryKey: ["map"] });
      router.replace("/home");
    } catch (e) {
      toast(errorMessage(e), "error");
      setSaving(false);
    }
  };

  const total = visited.length + wishlist.filter((c) => !visited.includes(c)).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo href="#" />
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-brand" : i < step ? "w-1.5 bg-brand/50" : "w-1.5 bg-border")} />
          ))}
        </div>
        {step < 3 ? (
          <button onClick={finish} className="text-sm font-medium text-muted hover:text-fg">
            Skip all
          </button>
        ) : (
          <span className="w-12" />
        )}
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 sm:px-6">
        {step === 0 && (
          <Centered>
            <HeroBadge><Globe2 className="size-10" /></HeroBadge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight">Welcome to Travora, {me.firstName} 🌎</h1>
            <p className="mt-3 max-w-md text-lg text-muted">
              Let&apos;s paint your map. It takes about a minute — and you can skip anything.
            </p>
            <Button size="lg" className="mt-8 min-w-48" onClick={next}>
              Let&apos;s go <ArrowRight className="size-5" />
            </Button>
          </Centered>
        )}

        {step === 1 && (
          <PickStep
            title="Tell us where you've been."
            subtitle="Tap every country you've visited."
            status="visited"
            selected={visited}
            setSelected={setVisited}
            locked={[]}
            onNext={next}
            saving={saving}
            onSkip={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <PickStep
            title="Where do you want to go next?"
            subtitle="Pick the places on your wishlist."
            status="wishlist"
            selected={wishlist}
            setSelected={setWishlist}
            locked={visited}
            onNext={next}
            saving={saving}
            onSkip={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Centered>
            <HeroBadge><PartyPopper className="size-10" /></HeroBadge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight">You&apos;re ready to explore.</h1>
            <p className="mt-3 text-lg text-muted">
              {total > 0
                ? `You've added ${total} ${total === 1 ? "country" : "countries"} to your world.`
                : "Your map is a blank canvas — tap any country to start."}
            </p>
            <Button size="lg" className="mt-8 min-w-56" onClick={finish} loading={saving}>
              Explore My World <ArrowRight className="size-5" />
            </Button>
          </Centered>
        )}
      </main>
    </div>
  );
}

function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-bright to-ai text-white shadow-float">
      {children}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade flex flex-1 flex-col items-center justify-center py-12 text-center">{children}</div>;
}

function PickStep({
  title,
  subtitle,
  status,
  selected,
  setSelected,
  locked,
  onNext,
  onSkip,
  saving,
}: {
  title: string;
  subtitle: string;
  status: CountryStatus;
  selected: string[];
  setSelected: (fn: (s: string[]) => string[]) => void;
  locked: string[];
  onNext: () => void;
  onSkip: () => void;
  saving: boolean;
}) {
  const statuses = useMemo(() => {
    const m: Record<string, CountryStatus> = {};
    locked.forEach((c) => (m[c] = "visited"));
    selected.forEach((c) => (m[c] = status));
    return m;
  }, [selected, locked, status]);

  const toggle = (code: string) => {
    if (locked.includes(code)) return;
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  };

  return (
    <div className="animate-fade flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted">{subtitle}</p>
        </div>
        <CountrySearch
          className="w-full sm:w-72"
          statuses={statuses}
          onPick={(c) => {
            if (!selected.includes(c.code)) toggle(c.code);
          }}
          placeholder="Search, e.g. Japan"
        />
      </div>

      <WorldMap statuses={statuses} onSelect={toggle} className="aspect-[4/3] w-full border border-border sm:aspect-[2/1]" legend={false} />

      <div className="mt-4 flex min-h-10 flex-wrap gap-2">
        {selected.length === 0 ? (
          <p className="text-sm text-muted">Nothing selected yet.</p>
        ) : (
          selected.map((code) => {
            const c = getCountry(code);
            return (
              <button
                key={code}
                onClick={() => toggle(code)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full py-1 pr-2 pl-2.5 text-sm font-medium",
                  status === "visited" ? "bg-visited-soft text-visited" : "bg-wishlist-soft text-wishlist",
                )}
              >
                {c?.flag} {c?.name} <X className="size-3.5" aria-label="Remove" />
              </button>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 glass -mx-4 px-4 pt-4 pb-3 sm:-mx-6 sm:px-6">
        <Button variant="ghost" size="lg" onClick={onSkip}>
          Skip
        </Button>
        <Button size="lg" className="min-w-40" onClick={onNext} loading={saving}>
          {selected.length ? `Continue · ${selected.length}` : "Continue"} <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
