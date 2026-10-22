/**
 * Cookie consent. The visitor's choice lives in a first-party cookie, `tf_consent_v2`, for 12 months, so
 * src/proxy.ts can read it. Only `all` allows the optional cookies: sign-up attribution (`tf_src`, see
 * src/lib/attribution.ts) and Google Analytics (src/components/analytics.tsx). Sign-in and the theme
 * are strictly necessary and never depend on it.
 */

// "_v2" since Google Analytics joined the optional cookies: a choice made before that didn't cover
// it, so everyone is asked once more.
export const CONSENT_COOKIE = "tf_consent_v2";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type Consent = "all" | "essential";

/** Fired on window after the visitor saves a choice, so Google Analytics can start or stop at once. */
export const CONSENT_EVENT = "tf-consent-change";

/** The saved choice, read from the cookie in the browser (undefined before a choice or on the server). */
export function savedConsent(): Consent | undefined {
  if (typeof document === "undefined") return undefined;
  const v = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1];
  return isConsent(v) ? v : undefined;
}

export const isConsent = (v: string | undefined | null): v is Consent => v === "all" || v === "essential";

/** Every cookie and browser-storage key the site uses, for the "Cookie details" list. */
export const COOKIE_DETAILS = [
  { name: "tv_session", why: "Keeps you signed in.", duration: "Up to 30 days", necessary: true },
  { name: "tripfolio-theme", why: "Remembers light or dark mode (stored in this browser).", duration: "Until you clear it", necessary: true },
  { name: "tf_consent_v2", why: "Remembers your cookie choice.", duration: "12 months", necessary: true },
  { name: "tf_src", why: "Remembers which link brought you here when you sign up. No ads, no third parties.", duration: "30 days", necessary: false },
  { name: "_ga, _ga_*", why: "Google Analytics: counts visits and how the site is used, without identifying you. No ads.", duration: "13 months", necessary: false },
] as const;
