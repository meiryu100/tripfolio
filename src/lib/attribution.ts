/**
 * Sign-up attribution: where a new user first came from. On the first page view that carries UTM
 * tags or comes from another site, src/proxy.ts stores them in a cookie (first touch wins, 30 days);
 * sign-up copies them onto the user (services/users → createUser). Only the referring site's host is
 * kept, never the full URL.
 */

export const ATTRIBUTION_COOKIE = "tf_src";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30;

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

const clean = (v: string | null | undefined) => {
  const s = v?.trim().toLowerCase().slice(0, 64);
  return s && /^[a-z0-9._~+\-/ ]+$/.test(s) ? s : undefined;
};

const OWN_HOSTS = /(^|\.)(trip-folio\.com|vercel\.app|localhost)$/;

/** What to remember about this visit, or null if it says nothing about where they came from. */
export function attributionFrom(url: URL, referer: string | null): Attribution | null {
  const p = url.searchParams;
  let referrer: string | undefined;
  try {
    const host = referer ? new URL(referer).hostname.replace(/^www\./, "") : "";
    if (host && !OWN_HOSTS.test(host)) referrer = clean(host);
  } catch {
    // Not a URL; ignore.
  }
  const a: Attribution = {
    source: clean(p.get("utm_source")),
    medium: clean(p.get("utm_medium")),
    campaign: clean(p.get("utm_campaign")),
    referrer,
  };
  return a.source || a.referrer ? a : null;
}

export const encodeAttribution = (a: Attribution) => JSON.stringify(a); // the cookie API URL-encodes it

export function decodeAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const pick = (k: string) => (typeof v[k] === "string" ? clean(v[k] as string) : undefined);
    return { source: pick("source"), medium: pick("medium"), campaign: pick("campaign"), referrer: pick("referrer") };
  } catch {
    return {};
  }
}
