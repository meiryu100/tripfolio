import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { travoraPool?: Pool; travoraDb?: DB };

function connectionString() {
  return process.env.DATABASE_URL?.trim() || "postgres://travora:travora@localhost:5432/travora";
}

export const pool = globalForDb.travoraPool ?? new Pool({ connectionString: connectionString(), max: 10 });
export const db: DB = globalForDb.travoraDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.travoraPool = pool;
  globalForDb.travoraDb = db;
}

export { schema };
