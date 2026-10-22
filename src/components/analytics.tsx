"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useSyncExternalStore } from "react";
import { CONSENT_EVENT, savedConsent } from "@/lib/consent";

/** The URL without its query, except UTM tags, so sign-in and reset links never leave the site with their tokens. */
function cleanUrl(href: string) {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) if (!key.startsWith("utm_")) url.searchParams.delete(key);
  url.hash = "";
  return url.toString();
}

/** Vercel Web Analytics: cookieless page views (no personal data, nothing stored in the browser). */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: cleanUrl(event.url) };
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// Measurement IDs are public (they're in every page's HTML anyway). NEXT_PUBLIC_GA_MEASUREMENT_ID
// overrides it, e.g. to test locally with another property.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-H4YSTR6P3C";
// Only the live site counts: local runs and Vercel previews would muddy the numbers.
const GA_HOSTS = ["www.trip-folio.com", "trip-folio.com"];
// Pages opened from an email link carry a one-time token in the URL: never load Google there.
const TOKEN_PAGES = ["/reset-password", "/verify-email"];
// GA's own default is 2 years; 13 months is the usual limit for analytics cookies in the EU.
const COOKIE_EXPIRES = 60 * 60 * 24 * 395;

const noSubscribe = () => () => {};
const subscribeConsent = (cb: () => void) => {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
};

/** Removes the _ga cookies, on this host and on the parent domain GA puts them on. */
function deleteGaCookies() {
  const domain = location.hostname.replace(/^www\./, "");
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (!name.startsWith("_ga")) continue;
    for (const d of ["", `; domain=${domain}`, `; domain=.${domain}`]) document.cookie = `${name}=; max-age=0; path=/${d}`;
  }
}

/**
 * Google Analytics 4, only after the visitor chose "Accept all" in the cookie banner (src/lib/consent.ts).
 * Until then not even the script is requested. Page views are sent by hand on each route change
 * with a cleaned URL. Choosing "Essential only" later stops it and deletes its cookies.
 */
function GoogleAnalytics({ id }: { id: string }) {
  const consent = useSyncExternalStore(subscribeConsent, savedConsent, () => undefined);
  const pathname = usePathname();
  const liveSite = useSyncExternalStore(noSubscribe, () => GA_HOSTS.includes(location.hostname) || Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID), () => false);
  const allowed = consent === "all" && liveSite;
  const tokenPage = TOKEN_PAGES.includes(pathname);

  useEffect(() => {
    if (!allowed) {
      if (window.gtag) {
        window.gtag("consent", "update", { analytics_storage: "denied" });
        deleteGaCookies();
      }
      return;
    }
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      // gtag.js only accepts the `arguments` object itself, not an array copy.
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", id, { send_page_view: false, cookie_expires: COOKIE_EXPIRES });
    } else {
      window.gtag("consent", "update", { analytics_storage: "granted" });
    }
  }, [allowed, id]);

  useEffect(() => {
    if (!allowed || tokenPage || !window.gtag) return;
    const page_location = cleanUrl(location.href);
    // Also applies to GA's own automatic events (scrolls, outbound clicks) from here on.
    window.gtag("set", { page_location });
    window.gtag("event", "page_view", { page_location });
  }, [allowed, tokenPage, pathname]);

  if (!allowed || tokenPage) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />;
}

export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <GoogleAnalytics id={GA_ID} />
    </>
  );
}
