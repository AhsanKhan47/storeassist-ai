// Kept apart from client.ts: the migrator reads files from disk, so the Worker must never import it.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

export async function runMigrations(databaseUrl: string, migrationsFolder: string): Promise<void> {
  await migrate(drizzle(neon(databaseUrl)), { migrationsFolder });
}
