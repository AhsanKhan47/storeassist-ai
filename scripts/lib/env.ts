// Environment helpers for scripts. Values come from apps/api/.dev.vars via `node --env-file`.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const SECRET_KEYS = [
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "CEREBRAS_API_KEY",
];

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to apps/api/.dev.vars (copy apps/api/.dev.vars.example first).`,
    );
  }
  return value;
}

function secretValues(): string[] {
  const values = new Set<string>();
  for (const key of SECRET_KEYS) {
    const value = process.env[key];
    if (value && value.length >= 6) values.add(value);
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.password.length >= 6) {
        values.add(parsed.password);
        values.add(decodeURIComponent(parsed.password));
      }
    } catch {
      // not a URL; the whole value is already covered
    }
  }
  return [...values].sort((a, b) => b.length - a.length);
}

/** Replaces every secret value from the environment with [redacted]. */
export function redact(text: string): string {
  let out = text;
  for (const secret of secretValues()) out = out.split(secret).join("[redacted]");
  return out;
}

function describe(err: unknown): string {
  const lines: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current && depth < 4; depth += 1) {
    lines.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return lines.join("\n  caused by: ");
}

/** Runs a script's main function and prints any error with secrets removed. */
export async function runMain(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (err) {
    console.error(`\nError: ${redact(describe(err))}`);
    process.exitCode = 1;
  }
}
