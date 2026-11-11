// Browser side of POST /api/chat: sends the conversation and reads the Server-Sent Events reply.
// Everything coming back is checked against the shared Zod schemas.
import {
  DeltaEventSchema,
  DoneEventSchema,
  ErrorResponseSchema,
  MetaEventSchema,
  StreamErrorEventSchema,
  type ChatMessage,
  type MetaEvent,
  type ProviderName,
} from "@storeassist/shared";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);

export type FailureKind = "rate_limited" | "busy" | "network" | "internal";

/** A failure the UI can show: a kind (for styling) and a message written for the customer. */
export class ChatFailure extends Error {
  readonly kind: FailureKind;
  constructor(kind: FailureKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface StreamHandlers {
  onMeta: (meta: MetaEvent) => void;
  onDelta: (text: string) => void;
  onDone: (provider: ProviderName | null) => void;
}

const NETWORK_MESSAGE = "Can't reach the assistant. Check your connection and try again.";
const SLOW_MESSAGE = "The assistant is taking too long to answer. Please try again in a moment.";

/** No response at all within this time means the API is stuck: stop waiting. */
const FIRST_RESPONSE_MS = 20_000;
/** Once streaming, give up if nothing new arrives for this long. */
const IDLE_MS = 30_000;

interface RawEvent {
  event: string;
  data: unknown;
}

/** Splits an SSE byte stream into events. Uses a reader loop (async iteration is missing in Safari). */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<RawEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        let event = "message";
        const data: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (data.length > 0) yield { event, data: JSON.parse(data.join("\n")) as unknown };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function failureFromResponse(res: Response): Promise<ChatFailure> {
  const json: unknown = await res.json().catch(() => undefined);
  const parsed = ErrorResponseSchema.safeParse(json);
  const message = parsed.success ? parsed.data.error.message : undefined;
  const code = parsed.success ? parsed.data.error.code : undefined;
  if (res.status === 429 || code === "rate_limited") {
    return new ChatFailure("rate_limited", message ?? "Too many messages. Please wait a moment.");
  }
  if (code === "busy") {
    return new ChatFailure("busy", message ?? "The assistant is busy. Please try again.");
  }
  return new ChatFailure("internal", message ?? "Something went wrong. Please try again.");
}

/**
 * Streams one answer. Calls the handlers as events arrive and resolves when the answer is complete.
 * Throws ChatFailure for anything the customer should see; rethrows an AbortError if cancelled.
 */
export async function streamAnswer(
  messages: ChatMessage[],
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  // Our own controller, so a stuck API can be cut off without confusing it with a user cancel.
  const request = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, ms);
  };
  const cancel = () => request.abort();
  signal.addEventListener("abort", cancel);
  arm(FIRST_RESPONSE_MS);

  try {
    return await streamWith(request.signal);
  } catch (err) {
    if (signal.aborted) throw err;
    if (timedOut) throw new ChatFailure("busy", SLOW_MESSAGE);
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }

  async function streamWith(requestSignal: AbortSignal): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: requestSignal,
      });
    } catch (err) {
      if (requestSignal.aborted) throw err;
      throw new ChatFailure("network", NETWORK_MESSAGE);
    }

    const isStream = res.headers.get("content-type")?.includes("text/event-stream") ?? false;
    if (!res.ok || !res.body || !isStream) throw await failureFromResponse(res);
    arm(IDLE_MS);

    let finished = false;
    try {
      for await (const { event, data } of readEvents(res.body)) {
        arm(IDLE_MS);
        if (event === "meta") handlers.onMeta(MetaEventSchema.parse(data));
        else if (event === "delta") handlers.onDelta(DeltaEventSchema.parse(data).text);
        else if (event === "done") {
          finished = true;
          handlers.onDone(DoneEventSchema.parse(data).provider);
        } else if (event === "error") {
          const err = StreamErrorEventSchema.parse(data);
          throw new ChatFailure(err.code === "busy" ? "busy" : "internal", err.message);
        }
      }
    } catch (err) {
      if (err instanceof ChatFailure) throw err;
      if (requestSignal.aborted) throw err;
      throw new ChatFailure("network", NETWORK_MESSAGE);
    }
    if (!finished) throw new ChatFailure("network", NETWORK_MESSAGE);
  }
}
