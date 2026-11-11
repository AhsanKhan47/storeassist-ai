# STATUS

Last updated: 2026-11-11 (Phase 3 complete)

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

## In progress

- **Phase 4 — Chat API.** Plan goes in `plans/phase-4.md`; waits for Ahsan's approval before code.

## Next

- After Phase 4: Phase 5, the chat UI (reference: `preview.html`).

## Open questions / blockers

- GitHub remote: `git@github-personal:AhsanKhan47/storeassist-ai.git` (SSH alias for his personal
  account). Ahsan normally pushes himself; on 2026-11-11 he asked Claude to push Phase 3 and the tags.
- ESLint 10 works, but three lint plugins do not list it as supported yet. Pin ESLint 9 if lint breaks.
- Cerebras key skipped; fallback chain is Groq → Gemini for now.
- Ahsan's keys were briefly pasted into the tracked `.dev.vars.example` (moved to `.dev.vars` before any
  commit; nothing pushed). Recommend rotating Neon, Groq, Gemini and Upstash keys.
- Phase 6 tuning risks: the gap between answerable (≥0.709) and not-covered (≤0.638) top scores is only
  ~0.07, so the cutoff needs re-checking with more questions; the FAQ repeats some delivery times and
  the hemming price, so eval scoring may need to accept `faq` as an alternative source.
- The Phase 1 commit on GitHub still contains the old Karachi-store wording in git history. Leaving it
  unless Ahsan asks for a history rewrite.

## Later (ideas parked to avoid scope creep)

- Python version of the ingestion script, to show Python skills to clients
- WhatsApp integration, multi-language answers, live order lookup, admin panel (paid add-ons)
- Neon MCP / Playwright for Claude Code once Phases 3 and 5 start

## Phase log

| Phase | Status | Tag | Notes |
| --- | --- | --- | --- |
| 0 Planning + setup | Done | — | |
| 1 Foundation | Done | `phase-1` | |
| 2 Knowledge base | Done | `phase-2` | |
| 3 Data + ingestion | Done | `phase-3` | 15 docs, 133 chunks in Neon |
| 4 Chat API | Planning | | `plans/phase-4.md` |
| 5 Chat UI | Not started | | Reference: `preview.html` |
| 6 Quality + evals | Not started | | |
| 7 Deployment | Not started | | |
| 8 Portfolio + selling | Not started | | |
