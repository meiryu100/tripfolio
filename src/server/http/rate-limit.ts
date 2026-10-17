import "server-only";
import { lt, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError } from "./errors";

export interface Limit {
  /** Requests allowed per window. */
  max: number;
  /** Window length in seconds. */
  window: number;
  /**
   * Count in the database, shared by every server instance (Vercel runs many), instead of in
   * this instance's memory. For the few requests worth guessing at: sign-in, sign-up, reset.
   */
  shared?: boolean;
}

export const LIMITS = {
  auth: { max: 10, window: 60, shared: true }, // login / register / reset per IP
  upload: { max: 60, window: 60 },
  write: { max: 120, window: 60 },
  read: { max: 600, window: 60 },
} satisfies Record<string, Limit>;

/** Per account, on top of the per-IP limit: slows password guessing spread over many IPs. */
export const ACCOUNT_LIMITS = {
  login: { max: 10, window: 15 * 60, shared: true },
  /** Sign-up / verification / reset emails to one address. */
  email: { max: 5, window: 60 * 60, shared: true },
} satisfies Record<string, Limit>;

export async function rateLimit(key: string, limit: Limit) {
  const { count, resetAt } = limit.shared ? await countShared(key, limit) : countLocal(key, limit);
  if (count > limit.max) {
    const retry = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    throw new HttpError("RATE_LIMITED", `Too many requests. Try again in ${formatWait(retry)}.`);
  }
}

const formatWait = (s: number) => (s < 90 ? `${s}s` : `${Math.ceil(s / 60)} minutes`);

// ─── In memory: per instance, for high-volume buckets ─────────────────────────

const buckets = new Map<string, { count: number; resetAt: number }>();

function countLocal(key: string, limit: Limit) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + limit.window * 1000 };
    buckets.set(key, fresh);
    if (buckets.size > 50_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    return fresh;
  }
  bucket.count++;
  return bucket;
}

// ─── Shared: one atomic upsert per request ────────────────────────────────────

async function countShared(key: string, limit: Limit) {
  const t = schema.rateLimits;
  const expired = sql`${t.resetAt} <= now()`;
  const [row] = await db
    .insert(t)
    .values({ key, count: 1, resetAt: sql`now() + make_interval(secs => ${limit.window})` })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${t.count} + 1 END`,
        resetAt: sql`CASE WHEN ${expired} THEN excluded.reset_at ELSE ${t.resetAt} END`,
      },
    })
    .returning({ count: t.count, resetAt: t.resetAt });
  // Now and then, drop windows that have ended so the table stays small.
  if (Math.random() < 0.01) await db.delete(t).where(lt(t.resetAt, sql`now() - interval '1 hour'`));
  return { count: row.count, resetAt: row.resetAt.getTime() };
}
