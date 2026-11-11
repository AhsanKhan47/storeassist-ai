# Phase 3 — Data layer and ingestion

Status: Done (2026-11-11)

## Goal

Every `docs/*.md` file is chunked, embedded with Gemini and stored in Neon, and `pnpm run search "<question>"`
prints the closest chunks with scores. No chat API and no UI yet; this phase builds the "library" that
Phase 4 will search.

## Before building (Ahsan does)

`apps/api/.dev.vars` already exists. It needs two values, which Ahsan pastes himself and never shares in chat:

- `DATABASE_URL`: the Neon **pooled** connection string (host contains `-pooler`)
- `GEMINI_API_KEY`

Claude never opens `.dev.vars`. Claude can test everything except the two network steps (`db:migrate`,
`ingest`, `search`) without keys, using `--dry-run`.

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| Embedding model | `gemini-embedding-001`, 768 dimensions | Matches `vector(768)` in `DESIGN.md`. Google says vectors below 3072 dimensions must be normalized by the caller, so `embed.ts` does that |
| Gemini client | Plain `fetch` to the REST API, no SDK | One small module, no dependency, runs unchanged in Node now and in the Worker in Phase 4 |
| Task types | `RETRIEVAL_DOCUMENT` for chunks, `RETRIEVAL_QUERY` for questions | Google's recommended pairing for search |
| Database driver | Drizzle with `neon-http` | Built for Workers. `db.batch()` runs several statements as one transaction, which gives the "replace a document's chunks atomically" rule |
| Chunking | Split at each `##` heading; a section over ~500 tokens is split by paragraph with ~50 tokens of overlap | Matches `DESIGN.md`. Tokens are estimated as characters ÷ 4 |
| Embedded text | `Title: <doc title>` + the chunk (heading and body) | The title gives each small chunk its context. The stored `content` excludes the title line |
| Skip rule | `content_hash` = sha256 of the file (line endings normalized) plus chunker version, model and dimensions | Changing the chunker or model forces a re-embed instead of leaving stale vectors |
| Extra column | `chunks.heading` (nullable text) | Not in `DESIGN.md`. Phase 4 needs the section name to show sources. Small deviation, say if you object |
| Env loading | `node --env-file=apps/api/.dev.vars` | Node 26 reads the file itself, so no `dotenv` package |

## Tasks

1. **Dependencies.** `drizzle-orm` and `@neondatabase/serverless` in `apps/api`; `drizzle-kit` as a dev
   dependency. No other packages.
2. **Schema** in `apps/api/src/db/schema.ts` (no relative imports, so scripts can import it directly):
   - `documents`: `id`, `title`, `slug` (unique), `content_hash`, `updated_at`
   - `chunks`: `id`, `document_id` (foreign key, cascade delete), `chunk_index`, `heading`, `content`,
     `embedding vector(768)` (required), unique on (`document_id`, `chunk_index`)
   - HNSW index on `embedding` with `vector_cosine_ops`
3. **`apps/api/src/db/client.ts`:** `createDb(databaseUrl)` returns a Drizzle instance. Used by the
   scripts now and by the Worker in Phase 4.
4. **Migration.** `drizzle.config.ts`, then generate `apps/api/drizzle/0000_*.sql`. A
   `create extension if not exists vector;` line is added at the top of that file, which is harmless since
   the extension already exists.
5. **`apps/api/src/lib/embed.ts`:** `embedTexts(texts, taskType, config)` calls `batchEmbedContents`, sends
   `outputDimensionality: 768`, normalizes each vector to length 1, and retries 429 and 5xx with
   exponential backoff (honoring `Retry-After`, up to 5 tries). Requests hold at most 50 texts, with a
   short pause between them.
6. **`scripts/lib/chunk.ts`:** `parseDoc()` (frontmatter, title, slug) and `chunkDoc()` (rules above).
   Pure functions, no network.
7. **`scripts/ingest.ts`** (`pnpm ingest`):
   1. Read `docs/*.md` except `README.md`; compute each hash.
   2. Compare with the `documents` table: skip unchanged, process new and changed, and delete rows for
      files that no longer exist.
   3. Embed all chunks of the changed documents first. If anything fails, nothing is written.
   4. Per document, one `db.batch()`: upsert the document, delete its old chunks, insert the new ones.
   5. Print a summary: documents added, updated, skipped, removed, chunk count, time.
   - `--dry-run`: no keys or network; prints each document's chunk count and size.
   - `--max-tokens N`: overrides the chunk size (used to exercise the split path).
8. **`scripts/search.ts`** (`pnpm run search "<question>"`; plain `pnpm search` is pnpm's built-in registry search): embeds the question, runs
   `order by embedding <=> query limit 5`, and prints rank, score (`1 − cosine distance`), slug, heading
   and a 120-character snippet.
9. **Root scripts:** `db:generate`, `db:migrate`, `ingest`, `search`. A short "database and ingestion"
   section in `docs/README.md` is not needed; the README stays about content.
10. **Check with real data.** After Ahsan runs the migration and ingestion, Claude runs `pnpm run search` on
    all 15 test questions and reports the top result and score for each. This gives Phase 6 real numbers
    for the relevance cutoff (the prototype's 0.55 is a placeholder).
11. **Gate and after "approved".** Update `STATUS.md`, `CLAUDE.md` and `SETUP.md`; one commit and tag
    `phase-3` locally; Ahsan pushes.

## Changes made during the build (deviations from the approved plan)

- **`pnpm run search`, not `pnpm search`:** `pnpm search` is pnpm's built-in npm registry search and
  takes priority over the project script. Docs updated.
- **No database packages in `scripts/`:** scripts import the API's modules, and `client.ts` re-exports
  `sql`, `eq`, `inArray` and `cosineDistance`. This keeps one copy of drizzle-orm, so types and schema
  objects always match.
- **Migrations applied by `scripts/migrate.ts`** (via `apps/api/src/db/migrate.ts` and Drizzle's
  `neon-http` migrator). `drizzle-kit` is only used to generate SQL. One driver, one way of loading env.
- **Per-document embed then write** instead of embedding everything first. Each document is still
  atomic (one `db.batch()` that also writes the new hash). A rate limit halfway through keeps the
  documents already done, and the next run resumes from there.
- **`zod` added to `apps/api`** to validate the Gemini response (count, 768 dimensions).
- **`scripts/lib/env.ts`:** loads env lazily and redacts every `.dev.vars` value from error output.
- **`verbatimModuleSyntax`** in the shared TypeScript config, so a type imported without `import type`
  is caught by `tsc` before Node fails on it at runtime.
- **133 chunks** instead of the estimated 110–130: each document's introduction paragraph becomes its
  own chunk (heading null).
- `apps/api/drizzle` added to `.prettierignore` (generated files).

## Files affected

- `apps/api/package.json`, `pnpm-lock.yaml` — change — new dependencies and `db:*` scripts
- `apps/api/drizzle.config.ts` — create — Drizzle Kit settings
- `apps/api/drizzle/0000_*.sql` (+ `meta/`) — create — generated migration
- `apps/api/src/db/schema.ts`, `apps/api/src/db/client.ts` — create — tables and client
- `apps/api/src/lib/embed.ts` — create — the one module that talks to Gemini
- `scripts/lib/chunk.ts`, `scripts/ingest.ts`, `scripts/search.ts` — create — ingestion and debug search
- `apps/api/src/db/migrate.ts`, `scripts/migrate.ts`, `scripts/lib/env.ts` — create — migration runner and env helpers
- `.prettierignore` — change — skip generated migration files
- `tsconfig.base.json` — change — `allowImportingTsExtensions`, so Node can run scripts that import `.ts` files directly
- `package.json` — change — root scripts
- `planning/STATUS.md`, `planning/SETUP.md`, `CLAUDE.md` — change — keep docs current after the gate

## Acceptance criteria ("Done when")

- [x] `pnpm db:migrate` creates `documents` and `chunks` in Neon, and the HNSW index exists
- [x] `pnpm ingest` stores 15 documents and their chunks (133; `README.md` is skipped)
- [x] Running `pnpm ingest` a second time reports 15 skipped and writes nothing
- [x] Editing one document and re-running re-embeds only that document (`updated 1, skipped 14`)
- [x] `pnpm run search "can I return a sale item"` ranks the Returns page first (0.734, "Sale items are exchange only")
- [x] For each of the 15 test questions the top result is a sensible source (table below)
- [x] `--dry-run` works without keys; `--max-tokens 60` splits long sections with overlap
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm check:content` still pass
- [x] No key appears in any committed file or in the output of any script

## Search results on the 15 test questions (2026-11-11)

| Q | Type | #1 result | Score | Expected source(s) in top 3? |
| --- | --- | --- | --- | --- |
| 1 | direct | returns-exchanges > The 14-day return window | 0.718 | yes |
| 2 | direct | shipping-us > How long delivery takes | 0.714 | yes |
| 3 | direct | payment-methods > Pay-in-4 installments | 0.712 | yes |
| 4 | direct | shipping-us > Shipping costs | 0.720 | yes |
| 5 | direct | damaged-or-wrong-item > What to send us | 0.735 | yes |
| 6 | direct | fabric-care > Denim | 0.725 | yes |
| 7 | direct | international-shipping > Customs, duties and taxes | 0.709 | yes |
| 8 | direct | about-us > Opening hours | 0.745 | yes |
| 9 | two-doc | refunds > Orders paid with a gift card | 0.722 | both (returns-exchanges #2, #3) |
| 10 | two-doc | alterations > Fit problems after a hem | 0.767 | both (returns-exchanges #3) |
| 11 | two-doc | order-tracking > Holiday peak delays | 0.728 | both (shipping-us #2, #3) |
| 12 | not covered | faq > Privacy and terms | 0.638 | — (should fall back) |
| 13 | not covered | faq > Orders and delivery | 0.637 | — (should fall back) |
| 14 | not covered | faq > Privacy and terms | 0.606 | — (should fall back) |
| 15 | injection | discounts-loyalty > Questions | 0.714 | — (prompt must refuse) |

**For the Phase 4 cutoff:** answerable questions score 0.709–0.767 at #1; not-covered questions score
0.606–0.638. A cutoff of about **0.67** separates them with a margin of roughly 0.03 on each side. The
gap is narrow, so Phase 6 should re-check it with more questions. The injection question scores high
(it is about discounts), so the prompt, not the cutoff, must handle it.

## Tests

- **Automated (no keys):** `pnpm ingest --dry-run`, `--max-tokens 60`, lint, typecheck. Unit tests for the
  chunker arrive with Vitest in Phase 6, as `PLAN.md` says.
- **Manual check for Ahsan:**
  ```powershell
  # Create the tables in Neon (needs DATABASE_URL in apps/api/.dev.vars)
  pnpm db:migrate

  # Read, chunk, embed and store the 15 documents (needs GEMINI_API_KEY too)
  pnpm ingest

  # Ask the database which chunks best match a question
  pnpm run search "can I return a sale item"
  ```
  Neon sleeps when idle, so the first call can take a few seconds.

## Risks / open questions

- **Gemini free-tier limits are unclear.** Forum posts report 429 errors on `gemini-embedding-001` even at
  low use. The work is small (about 120 chunks, 3 requests), and the script retries and writes nothing
  on failure, so a limit only means "run it again later".
- **`batchEmbedContents` details** (request shape, per-request limit) were not confirmed in the docs I
  could read. The first real run confirms them; the batch size of 50 is conservative.
- **Small chunks.** Most sections are 60–120 words, so most chunks will be small, with one chunk per
  section. That suits Q&A retrieval, and Phase 6 can tune merging or sizes from the real scores.
- **Gemini free tier may use submitted text for training.** Acceptable here because the documents are
  fictional. It matters later for real client data, and the README should say so in Phase 8.
- **HNSW on ~120 rows** gives no speed benefit over a plain scan. It is built anyway because `DESIGN.md`
  specifies it and a client's larger knowledge base would need it.
