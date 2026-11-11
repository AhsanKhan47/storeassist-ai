// POST /api/chat — the request flow from planning/plans/phase-4.md:
// validate -> rate limit -> cache -> embed -> search -> cutoff/fallback -> stream -> cache + log.
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import {
  ChatRequestSchema,
  type ChatStreamEvent,
  type ErrorCode,
  type ErrorResponse,
  type ProviderName,
  type Source,
} from "@storeassist/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createDb } from "../db/client.ts";
import { parseEnv, type Bindings, type Env } from "../env.ts";
import {
  MAX_BODY_BYTES,
  QUERY_EMBED_MAX_RETRIES,
  QUERY_EMBED_TIMEOUT_MS,
  TOP_K,
} from "../lib/config.ts";
import { embedTexts } from "../lib/embed.ts";
import {
  MidStreamError,
  ProvidersUnavailableError,
  providersFromEnv,
  streamChat,
} from "../lib/llm.ts";
import {
  FALLBACK_ANSWER,
  buildMessages,
  normalizeCitations,
  shouldFallback,
} from "../lib/prompt.ts";
import {
  cacheKey,
  createRateLimiter,
  createRedis,
  getCachedAnswer,
  setCachedAnswer,
  type CachedAnswer,
} from "../lib/redis.ts";
import { chunkBody, searchChunks } from "../lib/search.ts";

type AppEnv = { Bindings: Bindings };
type Outcome = "answer" | "fallback" | "cache" | "rate_limited" | "invalid" | "busy" | "error";

const BUSY_MESSAGE = "Our assistant is busy right now. Please try again in a moment.";

export const chat = new Hono<AppEnv>();

function jsonError(
  c: Context<AppEnv>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
) {
  const body: ErrorResponse = { error: { code, message } };
  return c.json(body, status);
}

async function send(stream: SSEStreamingApi, event: ChatStreamEvent): Promise<void> {
  await stream.writeSSE({ event: event.event, data: JSON.stringify(event.data) });
}

/** Streams a complete reply (cached or fallback) as meta -> delta -> done. */
function streamWhole(
  c: Context<AppEnv>,
  reply: {
    answer: string;
    sources: Source[];
    isFallback: boolean;
    cached: boolean;
    provider: ProviderName | null;
  },
) {
  return streamSSE(c, async (stream) => {
    await send(stream, {
      event: "meta",
      data: { sources: reply.sources, isFallback: reply.isFallback, cached: reply.cached },
    });
    await send(stream, { event: "delta", data: { text: reply.answer } });
    await send(stream, { event: "done", data: { provider: reply.provider } });
  });
}

chat.post(
  "/",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => jsonError(c, 413, "invalid_request", "Request body is too large."),
  }),
  async (c) => {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    // One structured line per request. No question text and no IP address.
    const log = (outcome: Outcome, fields: Record<string, unknown> = {}) =>
      console.log(
        JSON.stringify({ requestId, route: "chat", outcome, ms: Date.now() - started, ...fields }),
      );

    let env: Env;
    try {
      env = parseEnv(c.env);
    } catch (err) {
      log("error", { detail: err instanceof Error ? err.message : "env error" });
      return jsonError(c, 500, "internal", "The server is not configured correctly.");
    }

    // 1. Validate
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      log("invalid", { detail: "body is not JSON" });
      return jsonError(c, 400, "invalid_request", "Request body must be JSON.");
    }
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? ` (${issue.path.join(".")})` : "";
      log("invalid", { detail: issue?.message });
      return jsonError(c, 400, "invalid_request", `${issue?.message ?? "Invalid request"}${where}`);
    }
    const { messages } = parsed.data;
    const question = messages.at(-1)?.content ?? "";

    // 2. Rate limit (fails closed: if Redis is down, the request is refused with 503 busy)
    const redis = createRedis(env);
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    try {
      const result = await createRateLimiter(redis).limit(ip);
      c.executionCtx.waitUntil(result.pending);
      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        c.header("Retry-After", String(retryAfter));
        log("rate_limited", { retryAfter });
        return jsonError(
          c,
          429,
          "rate_limited",
          `Too many messages. Please wait ${retryAfter} seconds and try again.`,
        );
      }
    } catch (err) {
      // Without a working limiter anyone could drain the model quota, so refuse instead.
      log("busy", {
        stage: "ratelimit",
        detail: err instanceof Error ? err.message.slice(0, 200) : "redis error",
      });
      return jsonError(c, 503, "busy", BUSY_MESSAGE);
    }

    // 3. Cache (single-turn questions only: follow-up answers depend on history)
    const key = messages.length === 1 ? await cacheKey(question) : undefined;
    if (key) {
      const cached = await getCachedAnswer(redis, key).catch(() => undefined);
      if (cached) {
        log("cache", { provider: cached.provider, isFallback: cached.isFallback });
        return streamWhole(c, { ...cached, cached: true });
      }
    }
    const saveToCache = (value: CachedAnswer) => {
      if (key) c.executionCtx.waitUntil(setCachedAnswer(redis, key, value).catch(() => undefined));
    };

    // 4–5. Embed the question and search
    let sources: Source[];
    try {
      const [vector] = await embedTexts([question], "RETRIEVAL_QUERY", {
        apiKey: env.GEMINI_API_KEY,
        maxRetries: QUERY_EMBED_MAX_RETRIES,
        timeoutMs: QUERY_EMBED_TIMEOUT_MS,
      });
      if (!vector) throw new Error("no embedding returned");
      const hits = await searchChunks(createDb(env.DATABASE_URL), vector, TOP_K);
      sources = hits.map((hit, i) => ({
        index: i + 1,
        title: hit.title,
        slug: hit.slug,
        heading: hit.heading,
        excerpt: chunkBody(hit.content),
        score: Math.round(hit.score * 1000) / 1000,
      }));
    } catch (err) {
      log("busy", {
        stage: "retrieval",
        detail: err instanceof Error ? err.message.slice(0, 200) : "",
      });
      return jsonError(c, 503, "busy", BUSY_MESSAGE);
    }
    const topScore = sources[0]?.score;

    // 6. Relevance cutoff: no model call
    if (shouldFallback(topScore)) {
      const reply = { answer: FALLBACK_ANSWER, sources: [], isFallback: true, provider: null };
      saveToCache(reply);
      log("fallback", { topScore });
      return streamWhole(c, { ...reply, cached: false });
    }

    // 7–9. Grounded answer, streamed
    return streamSSE(c, async (stream) => {
      await send(stream, { event: "meta", data: { sources, isFallback: false, cached: false } });
      let answer = "";
      try {
        const { provider, attempts } = await streamChat(
          providersFromEnv(env),
          buildMessages(messages, sources),
          async (piece) => {
            const text = normalizeCitations(piece);
            answer += text;
            await send(stream, { event: "delta", data: { text } });
          },
        );
        await send(stream, { event: "done", data: { provider } });
        saveToCache({ answer, sources, isFallback: false, provider });
        log("answer", { provider, topScore, attempts, chars: answer.length });
      } catch (err) {
        if (err instanceof ProvidersUnavailableError) {
          log("busy", { stage: "llm", topScore, attempts: err.attempts });
          await send(stream, { event: "error", data: { code: "busy", message: BUSY_MESSAGE } });
        } else {
          const detail = err instanceof Error ? err.message.slice(0, 200) : "";
          log("error", {
            stage: "llm",
            topScore,
            detail,
            midStream: err instanceof MidStreamError,
          });
          await send(stream, {
            event: "error",
            data: { code: "internal", message: "The answer was interrupted. Please try again." },
          }).catch(() => undefined);
        }
      }
    });
  },
);
