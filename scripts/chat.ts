// pnpm run chat "<question>" — sends one question to the chat API and prints the streamed answer.
//   --url URL     API base URL (default http://localhost:8787)
//   --repeat N    send the same question N times (rate-limit check); prints one line per request
// Needs the API running: pnpm dev
import { askApi, type ApiResult } from "./lib/api-client.ts";
import { runMain } from "./lib/env.ts";

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function ask(url: string, question: string, live: boolean): Promise<ApiResult> {
  const result = await askApi(
    url,
    [{ role: "user", content: question }],
    live ? (text) => process.stdout.write(text) : undefined,
  );
  if (result.error && result.retryAfter) result.error += ` [Retry-After ${result.retryAfter}s]`;
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
