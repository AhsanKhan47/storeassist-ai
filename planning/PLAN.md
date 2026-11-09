# StoreAssist AI — Phased Implementation Plan

The build runs in 8 phases. Each ends with a working, testable result and Ahsan's approval before the
next starts. Code lives in `C:\Users\ahsan\Desktop\Personal\storeassist-ai`.

```
Phase 1 Foundation -> 2 Knowledge base -> 3 Data + ingestion -> 4 Chat API
  -> 5 Chat UI -> 6 Quality + evals -> 7 Deployment -> 8 Portfolio + sell
(each arrow = a gate Ahsan approves)
```

## How we work

- **One phase at a time.** Build, run the checks, show the result.
- **Gate at the end of each phase.** Ahsan tries the "Done when" step and replies "approved" or asks for
  changes. Nothing from the next phase starts before that.
- **One commit per phase**, pushed with a tag (`phase-1`, `phase-2`, ...).
- **Keys stay on Ahsan's machine** in `apps/api/.dev.vars`; never asked for in chat.
- **No scope creep:** new ideas go to the README "Later" list.

## Phase 1 — Foundation

**Goal:** empty but working skeleton, connected to GitHub.

Build:
- pnpm workspace monorepo: `apps/web`, `apps/api`, `packages/shared`, `scripts`
- `apps/web`: Next.js (TS, App Router, Tailwind), static export
- `apps/api`: Hono on Workers with `wrangler.jsonc` and `GET /health`
- `packages/shared`: Zod schemas + types (chat request, chat response, source)
- ESLint, Prettier, TS strict; root scripts `pnpm dev`, `pnpm build`, `pnpm lint`
- `.gitignore` (blocks `.dev.vars`, `.env*`, `node_modules`) and `apps/api/.dev.vars.example`
- First commit pushed to `storeassist-ai`

Ahsan does: copy `.dev.vars.example` to `.dev.vars` and paste keys.

**Done when:** `pnpm dev` starts both apps; `localhost:3000` shows a placeholder;
`localhost:8787/health` returns `{"ok":true}`; code is on GitHub.

## Phase 2 — Knowledge base

**Goal:** realistic sample content for Tallow & Pine.

Build:
- 15 Markdown files in `docs/` (About, Shipping, International shipping, Returns, Refunds, Payments,
  Order tracking, Size guide, Fabric care, Alterations, Damaged items, Discounts, Privacy,
  Terms of sale, FAQ), each with frontmatter `title` and `slug`, 300–800 words, clear headings
- Edge cases per `DESIGN.md` (sale items exchange-only, gift card refunds as store credit, 48-hour damage
  reporting, holiday-peak delays, FAQ overlap)
- `docs/README.md` stating content is fictional
- `eval/questions.json`: 15 questions with expected answers and expected source slugs

Ahsan does: skim and adjust anything that would not sound right to a US or European client.

**Done when:** Ahsan approves the content and test questions.

## Phase 3 — Data layer and ingestion

**Goal:** every document chunked, embedded and searchable in Neon.

Build:
- Drizzle schema: `documents` (title, slug, content hash), `chunks` (text, position, `vector(768)`),
  HNSW cosine index
- `pnpm db:migrate`
- `pnpm ingest`: split by heading then ~500-token chunks with ~50 overlap; Gemini embeddings in batches
  with retry/backoff; skip unchanged docs by content hash; replace a changed doc's chunks in one transaction
- `pnpm search "question"`: prints top-5 chunks with scores

Ahsan does: run `pnpm db:migrate` and `pnpm ingest` once.

**Done when:** Neon shows 15 documents and chunks; `pnpm search "can I return a sale item"` ranks the
Returns page first.

## Phase 4 — Chat API

**Goal:** `POST /api/chat` answers from the documents, streams, fails gracefully.

Request order:
1. Zod validation (length limits, last few messages for context)
2. Per-IP rate limit with Upstash (10/min)
3. Answer cache lookup (normalized question -> answer + sources)
4. Embed question, top-5 vector search
5. Relevance cutoff -> friendly fallback without LLM call
6. Grounded prompt: answer only from numbered excerpts, cite [1], [2], refuse role changes
7. Stream from Groq via SSE; on 429/error retry with Gemini (then Cerebras if configured)
8. Send sources (title, slug, excerpt) with the stream; cache the finished answer

Also: CORS limited to `ALLOWED_ORIGIN`, structured logs, clear error codes.

**Done when:** via a provided test command, a returns question streams a cited answer; "do you sell
shoes?" returns the fallback; the same question twice is instant from cache; the 11th message within
a minute is rejected.

## Phase 5 — Chat UI

**Goal:** polished chat page a client can try in 30 seconds.

Build:
- Landing view: store name, one-line explanation, 4 clickable suggested questions
- Chat window: streaming text, typing indicator, session history
- Source chips under answers; click shows excerpt + title
- States: busy/retry, fallback styled differently, network errors
- "Demo with fictional sample data" banner + GitHub link
- Mobile-friendly, Enter to send

**Done when:** `pnpm dev`, open `localhost:3000`, full conversation with a cited answer, a fallback and
a busy state.

## Phase 6 — Quality and hardening

Build:
- `pnpm eval`: runs the 15 questions against the API, checks sources and refusals, writes `eval/report.md`
- Tune cutoff and chunk size from the report
- Prompt-injection and off-topic tests
- Security pass: secrets only in `.dev.vars`/Cloudflare, CORS locked, input limits, no personal data
- Vitest unit tests for chunking, prompt building, fallback logic

**Done when:** `eval/report.md` shows 15/15 and unit tests are green.

## Phase 7 — Deployment

Build and run:
- `wrangler secret put` for each key (Ahsan pastes values when prompted)
- `pnpm deploy:api` -> `https://storeassist-api.ahsankhan47.workers.dev`
- Cloudflare Pages connected to the GitHub repo for `apps/web`, API URL as build variable
- CORS set to the live frontend URL
- Optional: GitHub Actions to re-run ingestion when `docs/` changes
- `pnpm eval` against the live API

Ahsan does: approve the Pages <-> GitHub connection, paste secrets when prompted.

**Done when:** live link works on his phone and live eval shows 15/15.

## Phase 8 — Portfolio packaging and selling

Build:
- README: problem, live link, architecture diagram, stack and why, eval results, how to run, "Later" list
- 3 screenshots (desktop answer with sources, fallback, mobile)
- 60-second Loom script
- Copy for a Fiverr gig ("AI chatbot trained on your store's documents") and an Upwork portfolio entry

Ahsan does: record the Loom, publish the gig, add the portfolio item, send proposals.

**Done when:** gig and portfolio are live with the demo link and video.

## Final folder structure

```text
storeassist-ai/
├─ CLAUDE.md
├─ planning/                # CONTEXT.md, DESIGN.md, PLAN.md, SETUP.md
├─ apps/
│  ├─ web/                  # Next.js chat UI (static export -> Cloudflare Pages)
│  │  └─ src/app, src/components, src/lib
│  └─ api/                  # Hono API (Cloudflare Workers)
│     ├─ src/routes/        # chat.ts, health.ts
│     ├─ src/lib/           # embed.ts, search.ts, llm.ts, cache.ts, ratelimit.ts, prompt.ts
│     ├─ src/db/            # Drizzle schema + client
│     ├─ wrangler.jsonc
│     └─ .dev.vars          # keys (git-ignored)
├─ packages/shared/         # Zod schemas + types
├─ scripts/                 # ingest.ts, search.ts, eval.ts
├─ docs/                    # 15 Tallow & Pine documents
├─ eval/                    # questions.json + report.md
├─ .github/workflows/       # optional ingest-on-push
└─ README.md
```
