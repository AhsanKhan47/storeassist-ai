// Tunable numbers for the chat path. Phase 6 re-tunes RELEVANCE_CUTOFF from the eval report.

/**
 * Best search score needed to answer instead of falling back. From the Phase 3 measurements
 * (planning/plans/phase-3.md): answerable test questions scored >= 0.709, not-covered ones <= 0.638.
 */
export const RELEVANCE_CUTOFF = 0.67;

/** Number of excerpts given to the model and returned as sources. */
export const TOP_K = 5;

/** Per-IP limit: requests per window (sliding). Counts every request, cache hits included. */
export const RATE_LIMIT_REQUESTS = 10;
export const RATE_LIMIT_WINDOW = "60 s";

/** Answer cache. Bump the version to invalidate every cached answer at once. */
export const CACHE_VERSION = "v1";
export const CACHE_TTL_SECONDS = 24 * 60 * 60;

/** Request body size limit for /api/chat. */
export const MAX_BODY_BYTES = 8 * 1024;

/** Embedding the question on the request path: fail fast instead of retrying for minutes. */
export const QUERY_EMBED_TIMEOUT_MS = 5_000;
export const QUERY_EMBED_MAX_RETRIES = 0;

/** Model output settings. */
export const TEMPERATURE = 0.2;
export const MAX_OUTPUT_TOKENS = 400;

/** Whole-answer time limit, after which the stream ends with an error. */
export const ANSWER_TIMEOUT_MS = 30_000;

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_CEREBRAS_MODEL = "gpt-oss-120b";
