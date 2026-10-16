/**
 * Only allow `?next=` redirects back into this site (never to another one).
 * Browsers read `/\host` and `/<tab>/host` like `//host`, so a prefix check isn't enough:
 * resolve the URL and keep it only if it stays on our origin.
 */
export function safeNext(next: string | null, origin: string): string | null {
  if (!next || !next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) return null;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}
