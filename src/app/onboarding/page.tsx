"use client";

import { ArrowRight, Camera, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CountrySearch } from "@/components/country-search";
import { Logo } from "@/components/logo";
import { Button, FormError, Input, Spinner } from "@/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { meKey, useMeQuery } from "@/features/auth/api";
import { clearDemoPicks, parseDemoPicks, readDemoPicksRaw } from "@/features/landing/demo-picks";
import { ImportSheet } from "@/features/import/import-sheet";
import { setStatuses } from "@/features/map/api";
import { WorldMap } from "@/features/map/world-map";
import { completeOnboarding, useSaveAboutYou } from "@/features/settings/api";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import { regionCountLabel } from "@/lib/regions";
import type { CountryStatus, Me } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { aboutYouSchema } from "@/lib/validation";
import mark from "../../../public/brand/tripfolio-mark.png";
import { appHome } from "@/lib/app-home";

// Welcome → visited → wishlist → "when did you go?" (only with visited countries) → about you. The map
// comes first and the name form last (and can be skipped): people who see the map mark countries, while
// a form up front lost some before the map.
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
  const [importing, setImporting] = useState(false);
  // Countries they colored on the landing page's demo map before signing up.
  const demo = parseDemoPicks(useSyncExternalStore(noSubscribe, readDemoPicksRaw, () => null));
  const demoCount = demo.visited.length + demo.wishlist.length;
  const demoStateCount = demo.states.length;
  const demoSummary = [
    demoCount && `${demoCount} ${demoCount === 1 ? "country" : "countries"}`,
    demoStateCount && regionCountLabel(demo.states.map((s) => s.code)),
  ]
    .filter(Boolean)
    .join(" and ");

  useEffect(() => {
    if (isPending) return;
    if (!me) router.replace("/login");
    else if (me.onboarded && step === 0) router.replace(appHome());
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
      setStep(afterStep(step, visited.length > 0));
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
      router.replace(appHome());
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
        {step === 0 && (
          <Centered>
            <Image src={mark} alt="" priority className="animate-float h-32 w-auto drop-shadow-xl" />
            <h1 className="mt-6 text-4xl font-bold tracking-tight">
              Welcome to Tripfolio{hasName(me) ? `, ${me.firstName}` : ""} 🌎
            </h1>
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
            onImport={() => setImporting(true)}
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
            onSkip={() => setStep(afterStep(2, visited.length > 0))}
          />
        )}

        {step === 3 && <YearsStep codes={visited} onDone={() => setStep(4)} />}

        {step === 4 && <AboutYouStep me={me} onDone={finish} finishing={saving} />}

      </main>

      <ImportSheet
        open={importing}
        onClose={() => setImporting(false)}
        username={me.username}
        onImported={(codes) => setVisited((v) => [...v, ...codes.filter((c) => !v.includes(c))])}
      />
    </div>
  );
}

/** The step after `step`; the years step is skipped when nothing was marked as visited. */
const afterStep = (step: Step, hasVisited: boolean): Step => (step === 2 && !hasVisited ? 4 : (Math.min(4, step + 1) as Step));

/** One optional trip year per visited country; each year becomes a trip "Country YEAR", like the year chips. */
function YearsStep({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [years, setYears] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const thisYear = new Date().getFullYear();
  const options = Array.from({ length: thisYear - 1979 }, (_, i) => thisYear - i);
  const picked = Object.keys(years).length;

  const save = async () => {
    setSaving(true);
    try {
      for (const [code, year] of Object.entries(years)) {
        await api.post("/api/trips", {
          countryCode: code,
          title: `${getCountry(code)?.name ?? code} ${year}`,
          description: "",
          cities: [],
          startDate: `${year}-01-01`,
          endDate: null,
          photoIds: [],
        });
      }
      await Promise.all([qc.invalidateQueries({ queryKey: ["trips"] }), qc.invalidateQueries({ queryKey: ["country"] })]);
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade mx-auto flex w-full max-w-md flex-1 flex-col">
      <h1 className="text-3xl font-semibold tracking-tight">When did you go?</h1>
      <p className="mt-1 text-muted">Pick a year for any country you like. It adds a trip to your profile. You can skip this.</p>
      <ul className="mt-4 grid gap-1.5">
        {codes.map((code) => {
          const c = getCountry(code);
          return (
            <li key={code} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
              <span aria-hidden className="text-xl leading-none">
                {c?.flag}
              </span>
              <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{c?.name ?? code}</span>
              <select
                aria-label={`Year you went to ${c?.name ?? code}`}
                value={years[code] ?? ""}
                disabled={saving}
                onChange={(e) =>
                  setYears((y) => {
                    const next = { ...y };
                    if (e.target.value) next[code] = Number(e.target.value);
                    else delete next[code];
                    return next;
                  })
                }
                className="h-9 rounded-xl border border-border bg-surface px-2 text-sm text-fg"
              >
                <option value="">No trip</option>
                {options.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 glass -mx-4 px-4 pt-4 pb-3 sm:-mx-6 sm:px-6">
        <Button variant="ghost" size="lg" onClick={onDone} disabled={saving}>
          Skip
        </Button>
        <Button size="lg" className="min-w-40" onClick={picked ? save : onDone} loading={saving}>
          {picked ? `Continue · ${picked}` : "Continue"} <ArrowRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}

/** Sign-up gives people without a name yet the placeholder "Traveler" (see services/auth.ts). */
const hasName = (me: Me) => !(me.firstName === "Traveler" && !me.lastName);

function AboutYouStep({ me, onDone, finishing }: { me: Me; onDone: () => void; finishing: boolean }) {
  const save = useSaveAboutYou();
  const [form, setForm] = useState({
    firstName: hasName(me) ? me.firstName : "",
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
          <h1 className="text-3xl font-semibold tracking-tight">Last thing: about you</h1>
          <p className="mt-2 text-muted">This is how friends will find you on Tripfolio. You can change it any time in Edit Profile.</p>
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
        <Button type="submit" size="lg" loading={save.isPending || finishing}>
          Explore My World <ArrowRight className="size-5" />
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending || finishing}>
          Skip for now
        </Button>
      </form>
    </Centered>
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
  onImport,
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
  /** Shows the "fill from photos" card (visited step only). */
  onImport?: () => void;
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

      {onImport && (
        <button
          onClick={onImport}
          className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-border bg-brand-soft px-4 py-2.5 text-left font-medium text-brand transition hover:shadow-soft"
        >
          <Camera className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Fill your map from your photos
            <span className="block text-xs font-normal text-muted">Read on your device, nothing is uploaded</span>
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </button>
      )}

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
