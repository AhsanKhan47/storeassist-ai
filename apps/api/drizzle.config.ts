import { defineConfig } from "drizzle-kit";

// Only used to generate SQL (pnpm db:generate). Migrations are applied by scripts/migrate.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
