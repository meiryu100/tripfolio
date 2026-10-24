import { sql } from "drizzle-orm";
import { db, schema } from "../db";

/**
 * Count one crawler request (called from src/proxy.ts after the response is sent). One row per
 * day × bot × path, so the table stays small however often a bot comes back. Never throws:
 * a failed write must not affect the visitor.
 */
export async function recordBotVisit(bot: string, rawPath: string) {
  const path = normalizePath(rawPath);
  try {
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
