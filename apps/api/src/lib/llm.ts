// The only module that talks to chat models. All providers speak the OpenAI-compatible
// chat-completions API, so one streaming client covers Groq, Gemini and Cerebras.
// Order: Groq -> Gemini -> Cerebras (only if its key is set). A provider is skipped only when it
// fails before the first token; once text has been sent, a failure ends the answer with an error.
import { z } from "zod";
import type { ProviderName } from "@storeassist/shared";
import type { Env } from "../env.ts";
import {
  ANSWER_TIMEOUT_MS,
  DEFAULT_CEREBRAS_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GROQ_MODEL,
  MAX_OUTPUT_TOKENS,
  TEMPERATURE,
} from "./config.ts";
import type { LlmMessage } from "./prompt.ts";

export interface Provider {
  name: ProviderName;
  url: string;
  apiKey: string;
  model: string;
  /** Time allowed until the first text arrives before trying the next provider. */
  firstTokenTimeoutMs: number;
  /** Provider-specific request fields. */
  extra: Record<string, unknown>;
}

export function providersFromEnv(env: Env): Provider[] {
  const providers: Provider[] = [
    {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_CHAT_MODEL ?? DEFAULT_GROQ_MODEL,
      firstTokenTimeoutMs: 10_000,
      // gpt-oss is a reasoning model: keep reasoning short and out of the stream.
      extra: { reasoning_effort: "low", include_reasoning: false },
    },
    {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_CHAT_MODEL ?? DEFAULT_GEMINI_MODEL,
      firstTokenTimeoutMs: 15_000,
      extra: {},
    },
  ];
  if (env.CEREBRAS_API_KEY) {
    providers.push({
      name: "cerebras",
      url: "https://api.cerebras.ai/v1/chat/completions",
      apiKey: env.CEREBRAS_API_KEY,
      model: DEFAULT_CEREBRAS_MODEL,
      firstTokenTimeoutMs: 10_000,
      extra: {},
    });
  }
  return providers;
}

/** Every provider failed before sending any text. */
export class ProvidersUnavailableError extends Error {
  readonly attempts: string[];
  constructor(attempts: string[]) {
    super(`All chat providers failed: ${attempts.join("; ")}`);
    this.attempts = attempts;
  }
}

/** A provider failed after part of the answer was already sent. */
export class MidStreamError extends Error {}

const ChunkSchema = z.object({
  choices: z
    .array(z.object({ delta: z.object({ content: z.string().nullish() }).partial() }))
    .optional(),
});

function sanitize(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 200);
}

/** Reads an OpenAI-style SSE body and yields the text deltas. */
async function* readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          continue; // ignore malformed keep-alive lines
        }
        const chunk = ChunkSchema.safeParse(json);
        const text = chunk.success ? chunk.data.choices?.[0]?.delta?.content : undefined;
        if (text) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Streams an answer, calling onDelta for each piece of text. Returns the provider that answered.
 * Throws ProvidersUnavailableError if nobody answered, MidStreamError if an answer broke off.
 */
export async function streamChat(
  providers: Provider[],
  messages: LlmMessage[],
  onDelta: (text: string) => Promise<void>,
): Promise<{ provider: ProviderName; attempts: string[] }> {
  const attempts: string[] = [];

  for (const provider of providers) {
    const controller = new AbortController();
    let firstTokenTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => controller.abort("first-token timeout"),
      provider.firstTokenTimeoutMs,
    );
    const answerTimer = setTimeout(() => controller.abort("answer timeout"), ANSWER_TIMEOUT_MS);
    let sentText = false;

    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${provider.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          stream: true,
          temperature: TEMPERATURE,
          max_tokens: MAX_OUTPUT_TOKENS,
          ...provider.extra,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = res.body ? sanitize(await res.text()) : "no body";
        attempts.push(`${provider.name}: HTTP ${res.status} ${detail}`);
        continue;
      }

      for await (const text of readDeltas(res.body)) {
        if (firstTokenTimer) {
          clearTimeout(firstTokenTimer);
          firstTokenTimer = undefined;
        }
        sentText = true;
        await onDelta(text);
      }
      if (!sentText) {
        attempts.push(`${provider.name}: empty answer`);
        continue;
      }
      attempts.push(`${provider.name}: ok`);
      return { provider: provider.name, attempts };
    } catch (err) {
      const reason = controller.signal.aborted
        ? String(controller.signal.reason)
        : err instanceof Error
          ? err.message
          : String(err);
      if (sentText) throw new MidStreamError(`${provider.name} stopped mid-answer: ${reason}`);
      attempts.push(`${provider.name}: ${sanitize(reason)}`);
    } finally {
      if (firstTokenTimer !== undefined) clearTimeout(firstTokenTimer);
      clearTimeout(answerTimer);
    }
  }
  throw new ProvidersUnavailableError(attempts);
}
