# STATUS

Last updated: 2026-11-11 (Phase 6 complete)

## Done

- Phase 0 — Planning and setup
  - Niche, offer and Fiverr/Upwork profiles done (outside this repo)
  - Design, phased plan, decision log, setup guide written (`planning/`)
  - Interactive UI prototype: `planning/preview.html`
  - Accounts ready: Cloudflare (wrangler logged in), Neon (pgvector enabled), Upstash Redis, Groq, Gemini
- Phase 1 — Foundation
  - pnpm monorepo, Hono API with `GET /health`, static Next.js placeholder, shared Zod schemas
  - ESLint, Prettier, strict TypeScript, root scripts; all local checks passed
- Phase 2 — Knowledge base
  - Store changed to a fictional US store, **Tallow & Pine** (Portland, USD), for US/European clients
  - 15 documents in `docs/` (+ `docs/README.md`, skipped by ingestion), 15 questions in
    `eval/questions.json` (8 direct, 3 two-document, 3 not covered, 1 injection)
  - `pnpm check:content` validates frontmatter, slugs, word counts and question slugs;
    `pnpm typecheck` now also covers `scripts/`
  - `planning/preview.html` and the placeholder page moved to the new store

- Phase 3 — Data layer and ingestion
  - Drizzle schema (`documents`, `chunks` with `vector(768)` + HNSW), `pnpm db:migrate`
  - `pnpm ingest`: 15 docs → 133 chunks, Gemini embeddings, skip-by-hash, per-document atomic replace
  - `pnpm run search`: all 11 answerable test questions rank the right document first; scores and the
    proposed cutoff (~0.67) are in `plans/phase-3.md`
- Phase 4 — Chat API
  - `POST /api/chat`: validate → per-IP limit (10/min) → cache → embed + search → 0.67 cutoff →
    streamed, cited answer (SSE: `meta`, `delta`, `done` / `error`); typed contract in `packages/shared`
  - Groq `openai/gpt-oss-120b` (Llama 3.3 70B was retired), falling back to Gemini
    `gemini-3.5-flash-lite` on any Groq error before the first token
  - Upstash down → chats refused with 503 `busy` (Ahsan's decision)
  - `pnpm run chat "<q>"` test command; all acceptance checks pass locally (`plans/phase-4.md`)
- Phase 5 — Chat UI
  - Premium Apple-style UI (Ahsan's direction): ambient background, glass layers, Geist/SF type,
    landing cards with icon tiles, spring motion, smooth streamed text; light and dark mode
  - Streaming answers with citation badges and source chips (cited sources only) that open the excerpt;
    fallback, busy, rate-limit, network and 20 s timeout states with **Try again**; follow-up history
  - "Under the hood" panel with real API facts (match vs 0.67 cutoff, model, saved answer, time,
    session counts); bottom sheet on phones
  - Checked in headless Edge with screenshots: 12/12 behavior checks pass (`plans/phase-5.md`)
- Phase 6 — Quality and hardening
  - `pnpm eval` → `eval/report.md`: **15/15** (string-check scoring, no AI judge) and 5/5 extra attack
    checks; first run found Q10 omitting the 48-hour hem remedy, fixed with prompt rule 3
  - Cutoff stays 0.67 (margin +0.039 / −0.032; probe set 10/10); `pnpm test`: 42 Vitest unit tests
  - Security pass: no key in git history, CORS, input limits, rate limit, private logs, no vulnerable
    dependencies (`plans/phase-6.md`)

## In progress

- Nothing in progress. Phase 7 (deployment) needs a plan in `plans/phase-7.md` and Ahsan's approval.

## Next

- Ahsan pushes: `git push origin main phase-4 phase-5 phase-6` (committed and tagged locally).
- Phase 7: deployment (Worker + Pages, secrets, live URLs, security headers, live `pnpm eval`).
- Local dev: run a single `pnpm dev`. Two `wrangler dev` copies in this folder share `.wrangler` state
  and both freeze on port 8787 (happened on 2026-11-11).

## Open questions / blockers

- GitHub remote: `git@github-personal:AhsanKhan47/storeassist-ai.git` (SSH alias for his personal
  account). Ahsan normally pushes himself; on 2026-11-11 he asked Claude to push Phase 3 and the tags.
- ESLint 10 works, but three lint plugins do not list it as supported yet. Pin ESLint 9 if lint breaks.
- Phase 7: the static web build bakes in `NEXT_PUBLIC_API_URL` at build time, so Cloudflare Pages needs
  it set to the live Worker URL (otherwise the site calls `localhost:8787`), and `ALLOWED_ORIGIN` on
  the Worker must be the live site URL.
- Cerebras key skipped; fallback chain is Groq → Gemini for now. The Cerebras model name in
  `config.ts` (`gpt-oss-120b`) is untested until a key is added.
- Groq's 8,000 tokens/minute fits roughly 4–5 answers a minute; beyond that, Gemini answers (slower,
  ~5–9 s to start). The answer cache absorbs repeated demo questions.
- The 429 `Retry-After` comes from Upstash's window reset and can under-state the wait slightly
  (sliding window). Fine for now; the UI in Phase 5 just shows "try again in a moment".
- Keys: Ahsan's keys were briefly pasted into the tracked `.dev.vars.example` (moved to `.dev.vars` before
  any commit; nothing pushed; Phase 6 history scan found no key in any commit). **Decision 2026-11-11:
  Ahsan chose not to rotate them.** Closed; do not raise again unless a key is actually exposed.
- Phase 6 tuning risks: the gap between answerable (≥0.709) and not-covered (≤0.638) top scores is only
  ~0.07, so the cutoff needs re-checking with more questions; the FAQ repeats some delivery times and
  the hemming price, so eval scoring may need to accept `faq` as an alternative source.
- The Phase 1 commit on GitHub still contains the old Karachi-store wording in git history. Leaving it
  unless Ahsan asks for a history rewrite.

## Later (ideas parked to avoid scope creep)

- Python version of the ingestion script, to show Python skills to clients
- WhatsApp integration, multi-language answers, live order lookup, admin panel (paid add-ons)
- Neon MCP / Playwright for Claude Code once Phases 3 and 5 start
- `.gitattributes` with `eol=lf`, so a Windows checkout with autocrlf does not fail `prettier --check`
- Better follow-up questions: rewrite "what about Hawaii?" into a standalone question before searching
- Clear the answer cache automatically when `pnpm ingest` changes a document

## Phase log

| Phase | Status | Tag | Notes |
| --- | --- | --- | --- |
| 0 Planning + setup | Done | — | |
| 1 Foundation | Done | `phase-1` | |
| 2 Knowledge base | Done | `phase-2` | |
| 3 Data + ingestion | Done | `phase-3` | 15 docs, 133 chunks in Neon |
| 4 Chat API | Done | `phase-4` | Groq model now gpt-oss-120b |
| 5 Chat UI | Done | `phase-5` | Premium Apple-style UI |
| 6 Quality + evals | Done | `phase-6` | 15/15 eval, 42 unit tests |
| 7 Deployment | Not started | | |
| 8 Portfolio + selling | Not started | | |
