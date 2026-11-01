import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";

/** Most distinct paths one bot can add per day; the rest are counted under OTHER_PATH. */
const MAX_PATHS_PER_BOT_PER_DAY = 500;
const OTHER_PATH = "other";

/**
 * Count one crawler request (called from src/proxy.ts after the response is sent). One row per
 * day × bot × path, so the table stays small however often a bot comes back. A fake crawler
 * (the user agent is not verified) can't grow it without limit: once a bot has
 * MAX_PATHS_PER_BOT_PER_DAY paths today, new paths are folded into "other". Never throws:
 * a failed write must not affect the visitor.
 */
export async function recordBotVisit(bot: string, rawPath: string) {
  let path = normalizePath(rawPath);
  try {
    const [{ paths }] = await db
      .select({ paths: sql<number>`count(*)::int` })
      .from(schema.botVisits)
      .where(and(eq(schema.botVisits.day, sql`current_date`), eq(schema.botVisits.bot, bot)));
    if (paths >= MAX_PATHS_PER_BOT_PER_DAY) {
      const [known] = await db
        .select({ path: schema.botVisits.path })
        .from(schema.botVisits)
        .where(and(eq(schema.botVisits.day, sql`current_date`), eq(schema.botVisits.bot, bot), eq(schema.botVisits.path, path)))
        .limit(1);
      if (!known) path = OTHER_PATH;
    }
    await db
      .insert(schema.botVisits)
      .values({ day: sql`current_date`, bot, path })
      .onConflictDoUpdate({
        target: [schema.botVisits.day, schema.botVisits.bot, schema.botVisits.path],
        set: { hits: sql`${schema.botVisits.hits} + 1`, lastSeenAt: sql`now()` },
      });
  } catch (err) {
    console.error("Bot visit not recorded:", err);
  }
}

function normalizePath(path: string) {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return clean.slice(0, 200).toLowerCase();
}
