// pnpm run search "<question>" — prints the 5 closest chunks with scores (1 = same meaning).
// Use "pnpm run search", not "pnpm search": the latter is pnpm's built-in npm registry search.
//   --limit N   number of results (default 5)
//   --json      machine-readable output
import { cosineDistance, createDb, eq, schema, sql } from "../apps/api/src/db/client.ts";
import { embedTexts } from "../apps/api/src/lib/embed.ts";
import { requireEnv, runMain } from "./lib/env.ts";

await runMain(async () => {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : 5;
  const question = argv
    .filter((arg, i) => !arg.startsWith("--") && !(limitIndex >= 0 && i === limitIndex + 1))
    .join(" ")
    .trim();
  if (!question) throw new Error('Usage: pnpm run search "your question"');
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("--limit must be 1-20");

  const db = createDb(requireEnv("DATABASE_URL"));
  const [vector] = await embedTexts([question], "RETRIEVAL_QUERY", {
    apiKey: requireEnv("GEMINI_API_KEY"),
  });
  if (!vector) throw new Error("No embedding returned for the question.");

  const distance = cosineDistance(schema.chunks.embedding, vector);
  const rows = await db
    .select({
      slug: schema.documents.slug,
      heading: schema.chunks.heading,
      content: schema.chunks.content,
      score: sql<number>`1 - (${distance})`,
    })
    .from(schema.chunks)
    .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
    .orderBy(distance)
    .limit(limit);

  if (json) {
    console.log(
      JSON.stringify({ question, results: rows.map((r) => ({ ...r, score: Number(r.score) })) }),
    );
    return;
  }
  console.log(`\nQ: ${question}\n`);
  rows.forEach((row, i) => {
    const snippet = row.content
      .replace(/^## .*\n+/, "")
      .replace(/\s+/g, " ")
      .slice(0, 120);
    console.log(
      `#${i + 1}  ${Number(row.score).toFixed(3)}  ${row.slug} > ${row.heading ?? "(intro)"}`,
    );
    console.log(`    ${snippet}${snippet.length === 120 ? "..." : ""}`);
  });
});
