import { afterEach, describe, expect, it, vi } from "vitest";
import { MidStreamError, ProvidersUnavailableError, streamChat, type Provider } from "./llm.ts";
import type { LlmMessage } from "./prompt.ts";

const provider = (name: Provider["name"]): Provider => ({
  name,
  url: `https://${name}.test/v1/chat/completions`,
  apiKey: "test-key",
  model: "test-model",
  firstTokenTimeoutMs: 2_000,
  extra: {},
});

const providers = [provider("groq"), provider("gemini")];
const messages: LlmMessage[] = [{ role: "user", content: "Hi" }];

const delta = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

/** A streaming response whose body arrives in the given network-sized pieces. */
function sse(pieces: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const piece = pieces[i++];
      if (piece === undefined) controller.close();
      else controller.enqueue(encoder.encode(piece));
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** Sends one piece of text, then the connection breaks. */
function brokenSse(first: string): Response {
  const encoder = new TextEncoder();
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(encoder.encode(first));
      } else {
        controller.error(new Error("connection reset"));
      }
    },
  });
  return new Response(body, { status: 200 });
}

function mockFetch(byHost: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const host = new URL(typeof input === "string" ? input : input.toString()).host;
    const make = byHost[host];
    if (!make) throw new Error(`unexpected fetch to ${host}`);
    return make();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function collect() {
  let text = "";
  const result = await streamChat(providers, messages, async (piece) => {
    text += piece;
  });
  return { text, ...result };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamChat", () => {
  it("streams from the first provider when it works", async () => {
    mockFetch({ "groq.test": () => sse([delta("Hello"), delta(" there"), "data: [DONE]\n\n"]) });
    const { text, provider: used } = await collect();
    expect(text).toBe("Hello there");
    expect(used).toBe("groq");
  });

  it("falls back to Gemini when Groq rejects the key (401)", async () => {
    mockFetch({
      "groq.test": () => new Response('{"error":{"message":"Invalid API Key"}}', { status: 401 }),
      "gemini.test": () => sse([delta("From Gemini"), "data: [DONE]\n\n"]),
    });
    const { text, provider: used, attempts } = await collect();
    expect(used).toBe("gemini");
    expect(text).toBe("From Gemini");
    expect(attempts[0]).toMatch(/groq: HTTP 401/);
  });

  it("falls back to Gemini when Groq is rate-limited (429)", async () => {
    mockFetch({
      "groq.test": () => new Response("slow down", { status: 429 }),
      "gemini.test": () => sse([delta("ok"), "data: [DONE]\n\n"]),
    });
    expect((await collect()).provider).toBe("gemini");
  });

  it("reports every attempt when all providers fail", async () => {
    mockFetch({
      "groq.test": () => new Response("down", { status: 503 }),
      "gemini.test": () => new Response("down", { status: 500 }),
    });
    const error = await collect().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ProvidersUnavailableError);
    expect((error as ProvidersUnavailableError).attempts).toHaveLength(2);
  });

  it("does not switch provider once text has been sent", async () => {
    const fetchMock = mockFetch({
      "groq.test": () => brokenSse(delta("Half an ans")),
      "gemini.test": () => sse([delta("should not be used")]),
    });
    await expect(collect()).rejects.toBeInstanceOf(MidStreamError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses SSE lines that are split across network pieces", async () => {
    const line = delta("joined");
    mockFetch({
      "groq.test": () =>
        sse([line.slice(0, 15), line.slice(15, 31), line.slice(31), "data: [DONE]\n\n"]),
    });
    expect((await collect()).text).toBe("joined");
  });

  it("treats an empty answer as a failure and tries the next provider", async () => {
    mockFetch({
      "groq.test": () => sse(["data: [DONE]\n\n"]),
      "gemini.test": () => sse([delta("filled"), "data: [DONE]\n\n"]),
    });
    const { provider: used, attempts } = await collect();
    expect(used).toBe("gemini");
    expect(attempts[0]).toMatch(/empty answer/);
  });
});
