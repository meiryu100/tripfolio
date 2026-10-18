"use client";

import { ArrowRight, PartyPopper, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CountrySearch } from "@/components/country-search";
import { Logo } from "@/components/logo";
import { Button, FormError, Input, Spinner } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { meKey, useMeQuery } from "@/features/auth/api";
import { clearDemoPicks, parseDemoPicks, readDemoPicksRaw } from "@/features/landing/demo-picks";
import { setStatuses } from "@/features/map/api";
import { WorldMap } from "@/features/map/world-map";
import { completeOnboarding, useSaveAboutYou } from "@/features/settings/api";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import type { CountryStatus, Me } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { aboutYouSchema } from "@/lib/validation";
import mark from "../../../public/brand/tripfolio-mark.png";

type Step = 0 | 1 | 2 | 3 | 4;
const STEPS = [0, 1, 2, 3, 4];

const noSubscribe = () => () => {};

export default function OnboardingPage() {
  const { data: me, isPending } = useMeQuery();
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [visited, setVisited] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // Countries they colored on the landing page's demo map before signing up.
  const demo = parseDemoPicks(useSyncExternalStore(noSubscribe, readDemoPicksRaw, () => null));
  const demoCount = demo.visited.length + demo.wishlist.length;
  const demoStateCount = demo.states.length;
  const demoSummary = [
    demoCount && `${demoCount} ${demoCount === 1 ? "country" : "countries"}`,
    demoStateCount && `${demoStateCount} ${demoStateCount === 1 ? "state" : "states"}`,
  ]
    .filter(Boolean)
    .join(" and ");

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
      if (step === 2 && visited.length) await setStatuses(visited, "visited");
      if (step === 3 && wishlist.length) await setStatuses(wishlist, "wishlist");
      setStep((s) => Math.min(4, s + 1) as Step);
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

  const start = async () => {
    if (demoCount || demo.states.length) {
      setVisited(demo.visited);
      setWishlist(demo.wishlist);
      clearDemoPicks();
      // States aren't shown in the pick steps, so they're saved right away.
      setSaving(true);
      try {
        for (const { code, status } of demo.states) {
          await api.post("/api/me/regions", { regionCode: code, status: status === "visited" ? "VISITED" : "WANT_TO_VISIT" });
        }
      } catch (e) {
        toast(errorMessage(e), "error");
      }
    }
    next();
  };

  const total = visited.length + wishlist.filter((c) => !visited.includes(c)).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo href="#" />
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-brand" : i < step ? "w-1.5 bg-brand/50" : "w-1.5 bg-border")} />
          ))}
        </div>
        {step > 0 && step < 4 ? (
          <button onClick={finish} className="text-sm font-medium text-muted hover:text-fg">
            Skip all
          </button>
        ) : (
          <span className="w-12" />
        )}
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 sm:px-6">
        {step === 0 && <AboutYouStep me={me} onDone={() => setStep(1)} />}

        {step === 1 && (
          <Centered>
            <Image src={mark} alt="" priority className="animate-float h-32 w-auto drop-shadow-xl" />
            <h1 className="mt-6 text-4xl font-bold tracking-tight">Welcome to Tripfolio, {me.firstName} 🌎</h1>
            <p className="mt-3 max-w-md text-lg text-muted">
              {demoCount || demoStateCount
                ? `We kept the ${demoSummary} you colored. Check them and add the rest — it takes about a minute.`
                : "Let's paint your map. It takes about a minute — and you can skip anything."}
            </p>
            <Button size="lg" className="mt-8 min-w-48" onClick={start}>
              Let&apos;s go <ArrowRight className="size-5" />
            </Button>
          </Centered>
        )}

        {step === 2 && (
          <PickStep
            title="Tell us where you've been."
            subtitle="Tap every country you've visited."
            status="visited"
            selected={visited}
            setSelected={setVisited}
            locked={[]}
            onNext={next}
            saving={saving}
            onSkip={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <PickStep
            title="Where do you want to go next?"
            subtitle="Pick the places on your wishlist."
            status="wishlist"
            selected={wishlist}
            setSelected={setWishlist}
            locked={visited}
            onNext={next}
            saving={saving}
            onSkip={() => setStep(4)}
          />
        )}

        {step === 4 && (
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

function AboutYouStep({ me, onDone }: { me: Me; onDone: () => void }) {
  const save = useSaveAboutYou();
  // "Traveler" is the placeholder sign-up gives people who haven't told us their name yet.
  const [form, setForm] = useState({
    firstName: me.firstName === "Traveler" && !me.lastName ? "" : me.firstName,
    lastName: me.lastName,
    username: me.username,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: "firstName" | "lastName") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = aboutYouSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    save.mutate(parsed.data, {
      onSuccess: onDone,
      onError: (err) => {
        if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
        else setFormError(errorMessage(err));
      },
    });
  };

  return (
    <Centered>
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4 text-left" noValidate>
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">First, about you</h1>
          <p className="mt-2 text-muted">This is how friends will find you on Tripfolio.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} />
          <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} />
        </div>
        <Input
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
          error={errors.username}
          hint="Lowercase letters, numbers, dots and underscores"
        />
        <FormError message={formError} />
        <Button type="submit" size="lg" loading={save.isPending}>
          Continue <ArrowRight className="size-5" />
        </Button>
      </form>
    </Centered>
  );
}

function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="flex size-20 items-center justify-center rounded-3xl bg-aurora text-white shadow-float">
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
