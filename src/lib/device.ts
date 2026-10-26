/**
 * Phone, tablet or computer, from the browser's user agent. Kept in step with the backfill in
 * drizzle/0013_signup_device.sql. iPads on iPadOS 13+ say "Macintosh" by default, so they count
 * as computers; nothing in the user agent tells them apart.
 */
export type Device = "mobile" | "tablet" | "desktop";

export function deviceFromUserAgent(userAgent: string | null | undefined): Device | null {
  if (!userAgent) return null;
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export const DEVICE_LABEL: Record<Device | "unknown", string> = {
  mobile: "טלפון",
  tablet: "טאבלט",
  desktop: "מחשב (web)",
  unknown: "לא ידוע",
};
