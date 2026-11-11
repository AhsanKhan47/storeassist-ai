// pnpm db:migrate — applies the SQL files in apps/api/drizzle to Neon.
import { join } from "node:path";
import { runMigrations } from "../apps/api/src/db/migrate.ts";
import { ROOT, requireEnv, runMain } from "./lib/env.ts";

await runMain(async () => {
  const started = Date.now();
  console.log("Applying migrations from apps/api/drizzle ...");
  await runMigrations(requireEnv("DATABASE_URL"), join(ROOT, "apps", "api", "drizzle"));
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
});
