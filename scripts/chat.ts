// pnpm run chat "<question>" — sends one question to the chat API and prints the streamed answer.
//   --url URL     API base URL (default http://localhost:8787)
//   --repeat N    send the same question N times (rate-limit check); prints one line per request
// Needs the API running: pnpm --filter @storeassist/api dev
import {
  DeltaEventSchema,
  DoneEventSchema,
  ErrorResponseSchema,
  MetaEventSchema,
  StreamErrorEventSchema,
  type MetaEvent,
} from "../packages/shared/src/chat.ts";
import { runMain } from "./lib/env.ts";

interface Result {
  status: number;
  ms: number;
  meta?: MetaEvent;
  answer: string;
  provider?: string | null;
  error?: string;
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
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

async function ask(url: string, question: string, live: boolean): Promise<Result> {
  const started = Date.now();
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });
  const result: Result = { status: res.status, ms: 0, answer: "" };

  if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
    const json: unknown = await res.json().catch(() => undefined);
    const parsed = ErrorResponseSchema.safeParse(json);
    result.error = parsed.success
      ? `${parsed.data.error.code}: ${parsed.data.error.message}`
      : `unexpected response (HTTP ${res.status})`;
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) result.error += ` [Retry-After ${retryAfter}s]`;
    result.ms = Date.now() - started;
    return result;
  }

  for await (const { event, data } of readEvents(res.body)) {
    if (event === "meta") result.meta = MetaEventSchema.parse(data);
    else if (event === "delta") {
      const { text } = DeltaEventSchema.parse(data);
      result.answer += text;
      if (live) process.stdout.write(text);
    } else if (event === "done") result.provider = DoneEventSchema.parse(data).provider;
    else if (event === "error") {
      const err = StreamErrorEventSchema.parse(data);
      result.error = `${err.code}: ${err.message}`;
    }
  }
  result.ms = Date.now() - started;
  return result;
}

await runMain(async () => {
  const argv = process.argv.slice(2);
  const url = (flag(argv, "--url") ?? "http://localhost:8787").replace(/\/$/, "");
  const repeat = Number(flag(argv, "--repeat") ?? 1);
  const question = argv
    .filter((arg, i) => !arg.startsWith("--") && !["--url", "--repeat"].includes(argv[i - 1] ?? ""))
    .join(" ")
    .trim();
  if (!question) throw new Error('Usage: pnpm run chat "your question" [--repeat N] [--url URL]');
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 30)
    throw new Error("--repeat must be 1-30");

  if (repeat > 1) {
    for (let i = 1; i <= repeat; i += 1) {
      const r = await ask(url, question, false);
      const what =
        r.error ??
        `${r.meta?.isFallback ? "fallback" : "answer"}${r.meta?.cached ? ", cached" : ""}`;
      console.log(
        `#${String(i).padStart(2)}  HTTP ${r.status}  ${String(r.ms).padStart(5)} ms  ${what}`,
      );
    }
    return;
  }

  console.log(`\nQ: ${question}\n`);
  const r = await ask(url, question, true);
  if (r.error && !r.answer) console.log(`Error: ${r.error}`);
  console.log("\n");
  if (r.error && r.answer) console.log(`Error after partial answer: ${r.error}`);
  if (r.meta?.sources.length) {
    console.log("Sources:");
    for (const s of r.meta.sources) {
      console.log(`  [${s.index}] ${s.score.toFixed(3)}  ${s.slug} > ${s.heading ?? "(intro)"}`);
    }
  }
  const flags = r.meta ? `fallback=${r.meta.isFallback}  cached=${r.meta.cached}  ` : "";
  console.log(`\nHTTP ${r.status}  ${flags}provider=${r.provider ?? "none"}  ${r.ms} ms`);
});
