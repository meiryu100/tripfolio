"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Sheet, SheetClose } from "@/components/ui";
import { setStatuses, useUserMap } from "@/features/map/api";
import { regionsKey, useUserRegions } from "@/features/map/regions-api";
import { api, errorMessage } from "@/lib/api-client";
import { getCountry } from "@/lib/countries";
import { getRegion } from "@/lib/regions";
import { toast } from "@/lib/ui";
import { cn, plural } from "@/lib/utils";
import { type Found, type PhotoScan, scanPhotos } from "./read-photos";

const month = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const when = (f: Found) => (month(f.first) === month(f.last) ? month(f.first) : `${month(f.first)} · ${month(f.last)}`);

type Phase = "pick" | "reading" | "review" | "saving";

/** Fill the map from photos: reads each photo's location and date on this device, then lets the user choose what to add. */
export function ImportSheet({
  open,
  onClose,
  username,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  /** Called with the country codes that were added (onboarding shows them in its own list). */
  onImported?: (codes: string[]) => void;
}) {
  const qc = useQueryClient();
  const map = useUserMap(username);
  const regions = useUserRegions(username);
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [scan, setScan] = useState<PhotoScan | null>(null);
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const visited = (code: string) => map.data?.statuses[code] === "visited";
  const regionVisited = (code: string) => regions.data?.statuses[code] === "visited";

  const close = () => {
    if (phase === "reading" || phase === "saving") return;
    setPhase("pick");
    setScan(null);
    setSkipped(new Set());
    onClose();
  };

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setPhase("reading");
    setDone(0);
    setScan({ total: files.length, noLocation: 0, countries: {}, regions: {} });
    try {
      const result = await scanPhotos(files, (s, n) => {
        setScan({ ...s, countries: { ...s.countries }, regions: { ...s.regions } });
        setDone(n);
      });
      setScan(result);
      setSkipped(new Set());
      setPhase("review");
    } catch (e) {
      toast(errorMessage(e), "error");
      setPhase("pick");
    }
  };

  const toggle = (code: string) =>
    setSkipped((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  // Home country first (most photos), then by photo count.
  const countryRows = Object.entries(scan?.countries ?? {}).sort((a, b) => b[1].count - a[1].count);
  const regionsOf = (country: string) =>
    Object.entries(scan?.regions ?? {})
      .filter(([code]) => code.startsWith(`${country}-`))
      .sort((a, b) => b[1].count - a[1].count);
  const pickedCountries = countryRows.filter(([code]) => !visited(code) && !skipped.has(code)).map(([code]) => code);
  const pickedRegions = countryRows.flatMap(([code]) =>
    skipped.has(code) ? [] : regionsOf(code).filter(([r]) => !regionVisited(r) && !skipped.has(r)).map(([r]) => r),
  );
  const addCount = new Set([...pickedCountries, ...pickedRegions.map((r) => r.slice(0, 2))]).size;

  const save = async () => {
    setPhase("saving");
    try {
      if (pickedCountries.length) await setStatuses(pickedCountries, "visited");
      for (const regionCode of pickedRegions) await api.post("/api/me/regions", { regionCode, status: "VISITED" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["map"] }),
        qc.invalidateQueries({ queryKey: regionsKey(username) }),
        qc.invalidateQueries({ queryKey: ["profile", username.toLowerCase()] }),
      ]);
      toast(`Added ${plural(addCount, "country", "countries")} to your map`);
      onImported?.([...new Set([...pickedCountries, ...pickedRegions.map((r) => r.slice(0, 2))])]);
      setPhase("pick");
      setScan(null);
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
      setPhase("review");
    }
  };

  return (
    <Sheet open={open} onClose={close} label="Fill your map from your photos">
      <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:px-6 sm:pt-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Fill your map from your photos</h2>
          <p className="mt-1 text-sm text-muted">We read where and when each photo was taken, on your device. Nothing is uploaded or saved until you add it.</p>
        </div>
        <SheetClose onClick={close} className="-mt-1 -mr-2 shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <input
          ref={input}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {phase === "pick" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span aria-hidden className="flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand">
              <Camera className="size-8" />
            </span>
            <p className="max-w-xs text-muted">Pick photos from your trips — the more the better. Photos without a location are skipped.</p>
            <Button size="lg" onClick={() => input.current?.click()}>
              Choose photos
            </Button>
          </div>
        )}

        {phase === "reading" && scan && (
          <div className="py-10 text-center" role="status">
            <p className="font-medium">
              Reading {plural(scan.total, "photo")}… found {plural(Object.keys(scan.countries).length, "country", "countries")}
            </p>
            <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round((done / scan.total) * 100)}%` }} />
            </div>
          </div>
        )}

        {(phase === "review" || phase === "saving") && scan && (
          <>
            {countryRows.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-medium">We couldn&apos;t find a location in those photos.</p>
                <p className="mt-1 text-sm text-muted">Some apps and settings remove location from photos. Try photos straight from your camera roll.</p>
                <Button variant="secondary" className="mt-4" onClick={() => setPhase("pick")}>
                  Choose other photos
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Found {plural(countryRows.length, "country", "countries")} in {plural(scan.total - scan.noLocation, "photo")}
                  {scan.noLocation > 0 && ` · ${plural(scan.noLocation, "photo")} had no location`}
                </p>
                <ul className="grid gap-1.5">
                  {countryRows.map(([code, found], i) => (
                    <li key={code}>
                      <Row
                        flag={getCountry(code)?.flag}
                        name={getCountry(code)?.name ?? code}
                        note={`${when(found)} · ${plural(found.count, "photo")}`}
                        badge={i === 0 ? "Home" : undefined}
                        state={visited(code) ? "have" : skipped.has(code) ? "off" : "on"}
                        onToggle={() => toggle(code)}
                      />
                      {regionsOf(code).map(([r, rf]) => (
                        <div key={r} className="mt-1.5 ml-6">
                          <Row
                            name={getRegion(r)?.name ?? r}
                            note={`${when(rf)} · ${plural(rf.count, "photo")}`}
                            state={regionVisited(r) ? "have" : skipped.has(code) || skipped.has(r) ? "off" : "on"}
                            disabled={skipped.has(code)}
                            onToggle={() => toggle(r)}
                          />
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      {(phase === "review" || phase === "saving") && countryRows.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
          <Button variant="ghost" onClick={close} disabled={phase === "saving"}>
            Cancel
          </Button>
          <Button onClick={save} loading={phase === "saving"} disabled={addCount === 0}>
            {addCount ? `Add ${plural(addCount, "country", "countries")} to my map` : "Nothing new to add"}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Row({
  flag,
  name,
  note,
  badge,
  state,
  disabled,
  onToggle,
}: {
  flag?: string;
  name: string;
  note: string;
  badge?: string;
  state: "on" | "off" | "have";
  disabled?: boolean;
  onToggle: () => void;
}) {
  const have = state === "have";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={have || state === "on"}
      disabled={have || disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl border border-border px-3 py-2 text-left transition",
        state === "on" ? "bg-visited-soft" : "bg-surface",
        (have || disabled) && "opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border", state !== "off" ? "border-transparent bg-brand text-brand-fg" : "border-border")}
      >
        {state !== "off" && <Check className="size-4" />}
      </span>
      {flag && (
        <span aria-hidden className="text-xl leading-none">
          {flag}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium [overflow-wrap:anywhere]">
          {name}
          {badge && <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{badge}</span>}
        </span>
        <span className="block text-xs text-muted">{have ? `On your map · ${note}` : note}</span>
      </span>
    </button>
  );
}
