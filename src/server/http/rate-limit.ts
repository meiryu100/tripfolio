import "server-only";
import { HttpError } from "./errors";

/**
 * Fixed-window in-memory limiter. Fine for a single instance; swap for Redis
 * (same interface) when running more than one server.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface Limit {
  /** Requests allowed per window. */
  max: number;
  /** Window length in seconds. */
  window: number;
}

export const LIMITS = {
  auth: { max: 10, window: 60 }, // login / register / reset per IP
  upload: { max: 60, window: 60 },
  write: { max: 120, window: 60 },
  read: { max: 600, window: 60 },
} satisfies Record<string, Limit>;

export function rateLimit(key: string, limit: Limit) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.window * 1000 });
    if (buckets.size > 50_000) sweep(now);
    return;
  }
  bucket.count++;
  if (bucket.count > limit.max) {
    const retry = Math.ceil((bucket.resetAt - now) / 1000);
    throw new HttpError("RATE_LIMITED", `Too many requests. Try again in ${retry}s.`);
  }
}

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
