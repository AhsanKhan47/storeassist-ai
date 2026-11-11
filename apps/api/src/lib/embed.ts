// The only module that talks to Gemini embeddings. Plain fetch, so it runs the same in
// Node (scripts) and in a Cloudflare Worker. Swap providers by replacing this file.
import { z } from "zod";
import { EMBEDDING_DIMENSIONS } from "../db/schema.ts";

export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbedConfig {
  apiKey: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
  maxRetries?: number;
  /** Per-attempt timeout. Default 30 s (ingestion); the chat path uses a short one. */
  timeoutMs?: number;
  onRetry?: (info: { attempt: number; waitMs: number; reason: string }) => void;
}

export const DEFAULT_EMBED_MODEL = "gemini-embedding-001";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 5;
const MAX_WAIT_MS = 90_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const ResponseSchema = z.object({
  embeddings: z.array(z.object({ values: z.array(z.number()) })),
});

class EmbedError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Gemini only returns unit-length vectors at 3072 dimensions; at 768 we normalize ourselves. */
export function normalize(vector: number[]): number[] {
  let sumOfSquares = 0;
  for (const x of vector) sumOfSquares += x * x;
  const length = Math.sqrt(sumOfSquares);
  if (length === 0) throw new EmbedError("Received an all-zero embedding.", false);
  return vector.map((x) => x / length);
}

function errorMessage(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    const message = z.object({ error: z.object({ message: z.string() }) }).safeParse(parsed);
    if (message.success) return message.data.error.message.slice(0, 300);
  } catch {
    // not JSON; fall through
  }
  return body.slice(0, 300);
}

/** How long the server asked us to wait: Retry-After header, or retryDelay ("34s") in the body. */
function requestedDelayMs(res: Response, body: string): number | undefined {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, MAX_WAIT_MS);
  const match = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (match?.[1]) return Math.min(Math.ceil(Number(match[1]) * 1000) + 500, MAX_WAIT_MS);
  return undefined;
}

function parseEmbeddings(json: unknown, expected: number, dimensions: number): number[][] {
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success)
    throw new EmbedError("Unexpected response shape from the embeddings API.", false);
  const { embeddings } = parsed.data;
  if (embeddings.length !== expected) {
    throw new EmbedError(
      `Asked for ${expected} embeddings but received ${embeddings.length}.`,
      false,
    );
  }
  return embeddings.map(({ values }) => {
    if (values.length !== dimensions) {
      throw new EmbedError(
        `Expected ${dimensions} dimensions but received ${values.length}. The outputDimensionality setting may be ignored.`,
        false,
      );
    }
    return normalize(values);
  });
}

async function embedBatch(
  texts: string[],
  taskType: EmbedTaskType,
  config: EmbedConfig,
): Promise<number[][]> {
  const model = config.model ?? DEFAULT_EMBED_MODEL;
  const dimensions = config.dimensions ?? EMBEDDING_DIMENSIONS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const body = JSON.stringify({
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: dimensions,
    })),
  });

  for (let attempt = 0; ; attempt += 1) {
    let reason = "";
    let waitMs = Math.min(MAX_WAIT_MS, 2_000 * 2 ** attempt);
    try {
      // The key goes in a header, never in the URL, so it cannot show up in logs or errors.
      const res = await fetch(`${ENDPOINT}/models/${model}:batchEmbedContents`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey },
        body,
        signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
      });
      if (res.ok) return parseEmbeddings(await res.json(), texts.length, dimensions);
      const text = await res.text();
      reason = `HTTP ${res.status}: ${errorMessage(text)}`;
      if (!RETRYABLE_STATUS.has(res.status)) throw new EmbedError(reason, false);
      waitMs = requestedDelayMs(res, text) ?? waitMs;
    } catch (err) {
      if (err instanceof EmbedError && !err.retryable) throw err;
      if (!reason) reason = `network error: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (attempt >= maxRetries) {
      throw new Error(
        `Embedding request failed after ${attempt + 1} attempts. Last error: ${reason}`,
      );
    }
    config.onRetry?.({ attempt: attempt + 1, waitMs, reason });
    await sleep(waitMs);
  }
}

/** Embeds texts in order. Use RETRIEVAL_DOCUMENT for stored chunks and RETRIEVAL_QUERY for questions. */
export async function embedTexts(
  texts: string[],
  taskType: EmbedTaskType,
  config: EmbedConfig,
): Promise<number[][]> {
  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    if (start > 0) await sleep(500);
    vectors.push(...(await embedBatch(texts.slice(start, start + batchSize), taskType, config)));
  }
  return vectors;
}
