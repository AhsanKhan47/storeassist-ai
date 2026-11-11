// pnpm ingest — chunk, embed and store docs/*.md in Neon.
//   --dry-run        parse and chunk only; no keys, no network
//   --max-tokens N   chunk size (default 500), e.g. 60 to exercise long-section splitting
//   --force          re-embed every document even if unchanged
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDb, eq, inArray, schema, sql } from "../apps/api/src/db/client.ts";
import { DEFAULT_EMBED_MODEL, embedTexts } from "../apps/api/src/lib/embed.ts";
import { EMBEDDING_DIMENSIONS } from "../apps/api/src/db/schema.ts";
import {
  CHUNKER_VERSION,
  type Chunk,
  chunkDoc,
  estimateTokens,
  normalizeNewlines,
  parseDoc,
} from "./lib/chunk.ts";
import { ROOT, requireEnv, runMain } from "./lib/env.ts";

interface PreparedDoc {
  slug: string;
  title: string;
  hash: string;
  chunks: Chunk[];
}

function readFlags(argv: string[]) {
  const maxIndex = argv.indexOf("--max-tokens");
  const maxTokens = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : 500;
  if (!Number.isInteger(maxTokens) || maxTokens < 20)
    throw new Error("--max-tokens needs a number of 20 or more");
  return { dryRun: argv.includes("--dry-run"), force: argv.includes("--force"), maxTokens };
}

async function prepareDocs(maxTokens: number): Promise<PreparedDoc[]> {
  const docsDir = join(ROOT, "docs");
  const files = (await readdir(docsDir))
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();
  const prepared: PreparedDoc[] = [];
  for (const file of files) {
    const raw = normalizeNewlines(await readFile(join(docsDir, file), "utf8"));
    const doc = parseDoc(raw, file);
    // The hash covers everything that changes the stored vectors, not just the file.
    const hash = createHash("sha256")
      .update(
        `chunker:${CHUNKER_VERSION}|max:${maxTokens}|model:${DEFAULT_EMBED_MODEL}|dims:${EMBEDDING_DIMENSIONS}\n`,
      )
      .update(raw)
      .digest("hex");
    prepared.push({
      slug: doc.slug,
      title: doc.title,
      hash,
      chunks: chunkDoc(doc.body, { maxTokens }),
    });
  }
  return prepared;
}

const embedInput = (doc: PreparedDoc, chunk: Chunk) => `Title: ${doc.title}\n\n${chunk.content}`;

function printDryRun(docs: PreparedDoc[], maxTokens: number) {
  let total = 0;
  let largest = 0;
  for (const doc of docs) {
    const sizes = doc.chunks.map((c) => estimateTokens(c.content));
    const biggest = Math.max(...sizes);
    largest = Math.max(largest, biggest);
    total += doc.chunks.length;
    console.log(
      `${doc.slug.padEnd(26)} ${String(doc.chunks.length).padStart(3)} chunks  largest ~${biggest} tokens`,
    );
  }
  console.log(
    `\n${docs.length} documents, ${total} chunks, largest chunk ~${largest} tokens (limit ${maxTokens}).`,
  );
  const split = docs.flatMap((d) =>
    d.chunks.filter((c) => c.content.includes("\n\n…")).map((c) => `${d.slug}#${c.index}`),
  );
  if (split.length > 0)
    console.log(
      `Chunks carrying overlap from a split section: ${split.length} (e.g. ${split.slice(0, 3).join(", ")})`,
    );
  console.log("Dry run: nothing was embedded or written.");
}

await runMain(async () => {
  const started = Date.now();
  const flags = readFlags(process.argv.slice(2));
  const docs = await prepareDocs(flags.maxTokens);
  if (docs.length === 0) throw new Error("No documents found in docs/.");
  if (flags.dryRun) return printDryRun(docs, flags.maxTokens);

  const db = createDb(requireEnv("DATABASE_URL"));
  const apiKey = requireEnv("GEMINI_API_KEY");
  const existing = await db
    .select({ slug: schema.documents.slug, hash: schema.documents.contentHash })
    .from(schema.documents);
  const storedHash = new Map(existing.map((row) => [row.slug, row.hash]));
  const onDisk = new Set(docs.map((d) => d.slug));
  const missing = existing.map((row) => row.slug).filter((slug) => !onDisk.has(slug));
  const todo = docs.filter((d) => flags.force || storedHash.get(d.slug) !== d.hash);

  // Guard against pruning everything because of a wrong or half-empty docs/ folder.
  if (missing.length > 0 && docs.length < existing.length / 2) {
    throw new Error(
      `Refusing to remove ${missing.length} documents: only ${docs.length} files found in docs/.`,
    );
  }

  let added = 0;
  let updated = 0;
  for (const doc of todo) {
    // Embed first; if this fails, nothing for this document is written.
    const vectors = await embedTexts(
      doc.chunks.map((c) => embedInput(doc, c)),
      "RETRIEVAL_DOCUMENT",
      {
        apiKey,
        onRetry: ({ attempt, waitMs, reason }) =>
          console.log(`  retry ${attempt} in ${Math.round(waitMs / 1000)}s (${reason})`),
      },
    );
    const documentId = sql`(select "id" from "documents" where "slug" = ${doc.slug})`;
    // One transaction: upsert the document (with its new hash), replace its chunks.
    await db.batch([
      db
        .insert(schema.documents)
        .values({ title: doc.title, slug: doc.slug, contentHash: doc.hash })
        .onConflictDoUpdate({
          target: schema.documents.slug,
          set: { title: doc.title, contentHash: doc.hash, updatedAt: sql`now()` },
        }),
      db.delete(schema.chunks).where(eq(schema.chunks.documentId, documentId)),
      db.insert(schema.chunks).values(
        doc.chunks.map((chunk, i) => ({
          documentId,
          chunkIndex: chunk.index,
          heading: chunk.heading,
          content: chunk.content,
          embedding: vectors[i] ?? [],
        })),
      ),
    ]);
    if (storedHash.has(doc.slug)) updated += 1;
    else added += 1;
    console.log(`ok  ${doc.slug} (${doc.chunks.length} chunks)`);
  }

  if (missing.length > 0) {
    await db.delete(schema.documents).where(inArray(schema.documents.slug, missing));
    console.log(`removed ${missing.join(", ")}`);
  }

  const [counts] = await db
    .select({
      documents: sql<number>`(select count(*) from "documents")::int`,
      chunks: sql<number>`count(*)::int`,
    })
    .from(schema.chunks);
  console.log(
    `\nAdded ${added}, updated ${updated}, skipped ${docs.length - todo.length}, removed ${missing.length}.` +
      ` Database now holds ${counts?.documents ?? 0} documents and ${counts?.chunks ?? 0} chunks.` +
      ` (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
});
