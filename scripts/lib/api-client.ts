// Node client for POST /api/chat, shared by `pnpm run chat` and `pnpm eval`.
// Reads the Server-Sent Events reply and validates every event with the shared schemas.
import {
  DeltaEventSchema,
  DoneEventSchema,
  ErrorResponseSchema,
  MetaEventSchema,
  StreamErrorEventSchema,
  type ChatMessage,
  type MetaEvent,
} from "../../packages/shared/src/chat.ts";

export interface ApiResult {
  status: number;
  ms: number;
  meta?: MetaEvent;
  answer: string;
  provider?: string | null;
  error?: string;
  /** Seconds, from the Retry-After header of a 429. */
  retryAfter?: number;
}

/** Parses an SSE body into (event, data) pairs as they arrive. */
async function* readEvents(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
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
      if (data.length) yield { event, data: JSON.parse(data.join("\n")) as unknown };
    }
  }
}

export async function askApi(
  baseUrl: string,
  messages: ChatMessage[],
  onDelta?: (text: string) => void,
): Promise<ApiResult> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return {
      status: 0,
      ms: Date.now() - started,
      answer: "",
      error: `cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)})`,
    };
  }
  const result: ApiResult = { status: res.status, ms: 0, answer: "" };

  if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const json: unknown = await res.json().catch(() => undefined);
    const parsed = ErrorResponseSchema.safeParse(json);
    result.error = parsed.success
      ? `${parsed.data.error.code}: ${parsed.data.error.message}`
      : `unexpected response (HTTP ${res.status})`;
    const retryAfter = Number(res.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) result.retryAfter = retryAfter;
    result.ms = Date.now() - started;
    return result;
  }

  for await (const { event, data } of readEvents(res.body)) {
    if (event === "meta") result.meta = MetaEventSchema.parse(data);
    else if (event === "delta") {
      const { text } = DeltaEventSchema.parse(data);
      result.answer += text;
      onDelta?.(text);
    } else if (event === "done") result.provider = DoneEventSchema.parse(data).provider;
    else if (event === "error") {
      const err = StreamErrorEventSchema.parse(data);
      result.error = `${err.code}: ${err.message}`;
    }
  }
  result.ms = Date.now() - started;
  return result;
}
