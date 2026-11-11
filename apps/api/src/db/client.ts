import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.ts";

// HTTP driver: works inside Cloudflare Workers, and db.batch() runs as one transaction.
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export type Db = ReturnType<typeof createDb>;

export { schema };

// Re-exported so scripts use the same drizzle-orm copy as the API (one copy, one set of types).
export { cosineDistance, eq, inArray, sql } from "drizzle-orm";
