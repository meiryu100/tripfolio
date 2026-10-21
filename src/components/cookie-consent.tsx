"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/button-class";
import { api, errorMessage } from "@/lib/api-client";
import { CONSENT_COOKIE, COOKIE_DETAILS, isConsent, type Consent } from "@/lib/consent";
import { toast } from "@/lib/ui";

/**
 * The first page the visitor saw, kept in memory only (not in storage) until they accept all cookies:
 * then the server stores it as the sign-up attribution cookie (see src/lib/attribution.ts).
 */
const firstVisit = typeof window === "undefined" ? null : { landing: location.href, referrer: document.referrer };

// "Cookie settings" links reopen the banner after a choice was made.
let reopened = false;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const setReopened = (v: boolean) => {
  reopened = v;
  listeners.forEach((l) => l());
};

const savedChoice = () => document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1];
const getShown = () => reopened || !isConsent(savedChoice());

export const openCookieSettings = () => setReopened(true);

/** Text button for footers and settings that reopens the banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie settings
    </button>
  );
}

export function CookieBanner() {
  // Hidden on the server and until the cookie has been read, so it never flashes for returning visitors.
  const shown = useSyncExternalStore(subscribe, getShown, () => false);
  const [details, setDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  // Onboarding's steps keep their buttons in a bottom bar; the banner waits until the user is through.
  const onboarding = usePathname().startsWith("/onboarding");

  const bannerRef = useRef<HTMLElement>(null);
  const visible = shown && !onboarding;

  // The banner is fixed, so tell the page how tall it is (see `body` in globals.css) and the content
  // underneath can still be scrolled into view.
  useEffect(() => {
    const el = bannerRef.current;
    if (!visible || !el) return;
    const root = document.body.style;
    const update = () => root.setProperty("--cookie-banner-height", `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.removeProperty("--cookie-banner-height");
    };
  }, [visible]);

  if (!visible) return null;

  const choose = async (choice: Consent) => {
    setSaving(true);
    try {
      await api.post("/api/consent", { choice, ...(choice === "all" && firstVisit) });
      setDetails(false);
      setReopened(false);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    // z-45: above the page and the phone tab bar (z-40), below every dialog and sheet (z-50 and up),
    // so it never covers their buttons.
    <section
      ref={bannerRef}
      aria-label="Cookie consent"
      className="animate-fade fixed inset-x-0 bottom-0 z-[45] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-3 shadow-float sm:p-4">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 hidden size-5 shrink-0 text-brand sm:block" aria-hidden />
          <p className="min-w-0 text-sm">
            Essential cookies keep you signed in. With your OK we also note which link brought you here. No ads, no third parties.{" "}
            <button
              type="button"
              onClick={() => setDetails((d) => !d)}
              aria-expanded={details}
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              Cookie details
            </button>
          </p>
        </div>

        {details && (
          <ul className="mt-3 grid gap-2 text-sm">
            {COOKIE_DETAILS.map((c) => (
              <li key={c.name} className="rounded-xl bg-surface-2 px-3 py-2">
                <p className="font-mono text-xs font-semibold">
                  {c.name} <span className="font-sans font-medium text-muted">· {c.necessary ? "essential" : "optional"} · {c.duration}</span>
                </p>
                <p className="text-muted">{c.why}</p>
              </li>
            ))}
          </ul>
        )}
        {details && (
          <p className="mt-3 text-sm text-muted">
            More in our{" "}
            <Link href="/privacy" className="font-semibold text-brand hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
          <button type="button" disabled={saving} onClick={() => choose("all")} className={buttonClass("secondary", "md", "w-full")}>
            Accept all
          </button>
          <button type="button" disabled={saving} onClick={() => choose("essential")} className={buttonClass("secondary", "md", "w-full")}>
            Essential only
          </button>
        </div>
      </div>
    </section>
  );
}
