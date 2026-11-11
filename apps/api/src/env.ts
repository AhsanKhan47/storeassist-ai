// Worker bindings (from apps/api/.dev.vars locally, `wrangler secret put` in production).
// Validated once per request; an error names the missing variable, never a value.
import { z } from "zod";

const required = z.string().trim().min(1);
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const EnvSchema = z.object({
  DATABASE_URL: required,
  UPSTASH_REDIS_REST_URL: required,
  UPSTASH_REDIS_REST_TOKEN: required,
  GROQ_API_KEY: required,
  GEMINI_API_KEY: required,
  CEREBRAS_API_KEY: optional,
  ALLOWED_ORIGIN: required,
  GROQ_CHAT_MODEL: optional,
  GEMINI_CHAT_MODEL: optional,
});
export type Env = z.infer<typeof EnvSchema>;

/** What Hono sees as c.env: raw strings, checked by parseEnv. */
export type Bindings = Record<string, string | undefined>;

export class EnvError extends Error {}

export function parseEnv(bindings: Bindings): Env {
  const result = EnvSchema.safeParse(bindings);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new EnvError(`Missing or empty environment variables: ${names}`);
  }
  return result.data;
}
