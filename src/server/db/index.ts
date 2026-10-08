import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

// Reuse one connection pool across hot reloads in development. The Drizzle
// client is cheap and is rebuilt on every reload so it always sees the current schema.
const globalForDb = globalThis as unknown as { tripfolioPool?: Pool };

function connectionString() {
  return process.env.DATABASE_URL?.trim() || "postgres://tripfolio:tripfolio@localhost:5432/tripfolio";
}

export const pool = globalForDb.tripfolioPool ?? new Pool({ connectionString: connectionString(), max: 10 });
export const db: DB = drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") globalForDb.tripfolioPool = pool;

export { schema };
