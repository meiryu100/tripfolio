import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/server/db";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Database migrated");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
