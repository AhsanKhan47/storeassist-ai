// Upstash Redis: answer cache and per-IP rate limit (REST, so it works in Workers).
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { MetaEventSchema, ProviderNameSchema } from "@storeassist/shared";
import { z } from "zod";
import type { Env } from "../env.ts";
import {
  CACHE_TTL_SECONDS,
  CACHE_VERSION,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW,
} from "./config.ts";
import { normalizeQuestion } from "./prompt.ts";

export function createRedis(env: Env): Redis {
  return new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
}

// ---- Rate limit ----

export function createRateLimiter(redis: Redis): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
    prefix: "storeassist:rl",
    analytics: false,
  });
}

// ---- Answer cache ----

export const CachedAnswerSchema = z.object({
  answer: z.string().min(1),
  sources: MetaEventSchema.shape.sources,
  isFallback: z.boolean(),
  provider: ProviderNameSchema.nullable(),
});
export type CachedAnswer = z.infer<typeof CachedAnswerSchema>;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cacheKey(question: string): Promise<string> {
  return `storeassist:answer:${CACHE_VERSION}:${await sha256Hex(normalizeQuestion(question))}`;
}

/** Returns the cached answer, or undefined if missing or not in the expected shape. */
export async function getCachedAnswer(
  redis: Redis,
  key: string,
): Promise<CachedAnswer | undefined> {
  const value: unknown = await redis.get(key);
  const parsed = CachedAnswerSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function setCachedAnswer(
  redis: Redis,
  key: string,
  value: CachedAnswer,
): Promise<void> {
  await redis.set(key, value, { ex: CACHE_TTL_SECONDS });
}
