/**
 * Cookie consent. The visitor's choice lives in a first-party cookie, `tf_consent`, for 12 months, so
 * src/proxy.ts can read it. Only `all` allows the optional attribution cookie (`tf_src`, see
 * src/lib/attribution.ts); sign-in and the theme are strictly necessary and never depend on it.
 */

export const CONSENT_COOKIE = "tf_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type Consent = "all" | "essential";

export const isConsent = (v: string | undefined | null): v is Consent => v === "all" || v === "essential";

/** Every cookie and browser-storage key the site uses, for the "Cookie details" list. */
export const COOKIE_DETAILS = [
  { name: "tv_session", why: "Keeps you signed in.", duration: "Up to 30 days", necessary: true },
  { name: "tripfolio-theme", why: "Remembers light or dark mode (stored in this browser).", duration: "Until you clear it", necessary: true },
  { name: "tf_consent", why: "Remembers your cookie choice.", duration: "12 months", necessary: true },
  { name: "tf_src", why: "Remembers which link brought you here when you sign up. No ads, no third parties.", duration: "30 days", necessary: false },
] as const;
