/** Phone-sized screen: below Tailwind's `md`, where the bottom tab bar shows. */
export function isPhone() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Where a signed-in user lands (after login, sign-up, onboarding, ...): the map on phones, where
 * it's the first tab and Home isn't in the tab bar, and Home everywhere else.
 */
export function appHome(): "/map" | "/home" {
  return isPhone() ? "/map" : "/home";
}

/** Server-side version for redirects (OAuth callbacks), where only the user agent is known. */
export function appHomeFor(userAgent: string | null): "/map" | "/home" {
  return userAgent && /Mobi|iPhone|iPod|Android.*Mobile/i.test(userAgent) ? "/map" : "/home";
}
