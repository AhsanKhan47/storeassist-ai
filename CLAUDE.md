# CLAUDE.md — StoreAssist AI

**Start every session by reading `planning/STATUS.md`**, then only the docs the current task needs.

## The app

RAG support chatbot for a fictional US clothing store, **Tallow & Pine**. It answers customer
questions only from the store's policy documents (`docs/*.md`), cites the source for each answer, and
replies "not in our policies, contact us" instead of guessing. It is a portfolio demo for Ahsan's
Fiverr/Upwork AI-integration services. All content is sample data and the UI says so.
Everything runs on free tiers: **no credit card, no subscriptions, ever.**

## Stack (locked; see `planning/CONTEXT.md` for why)

- Monorepo: pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`, `scripts`, `docs`, `eval`
- `apps/web`: Next.js (TS, App Router, Tailwind), **static export** on Cloudflare Pages. UI only.
- `apps/api`: **Hono** on **Cloudflare Workers** (`wrangler.jsonc`)
- Neon Postgres + pgvector (`@neondatabase/serverless` + Drizzle), Upstash Redis (cache + `@upstash/ratelimit`)
- LLM: Groq (`openai/gpt-oss-120b`; Llama 3.3 70B was retired) → fallback Gemini
  (`gemini-3.5-flash-lite`) → Cerebras if key set. Embeddings: Gemini `gemini-embedding-001`, 768 dims.
- Zod schemas shared in `packages/shared`; Vitest for tests

## Commands (fill in as they are created)

| Task | Command |
| --- | --- |
| Run web + api locally | `pnpm dev` (web :3000, api :8787) |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Format | `pnpm format` |
| Validate docs + eval questions | `pnpm check:content` |
| Tests (from Phase 6) | `pnpm test` |
| DB migrate / ingest / debug search (from Phase 3) | `pnpm db:migrate` / `pnpm ingest` / `pnpm run search "<q>"` (not `pnpm search`: that is pnpm's built-in registry search) |
| Run the API only | `pnpm --filter @storeassist/api dev` (:8787) |
| Ask the local API a question (from Phase 4) | `pnpm run chat "<q>"` (`--repeat N`, `--url URL`) |
| Eval, 15 questions (from Phase 6) | `pnpm eval` |
| Deploy API (from Phase 7) | `pnpm deploy:api` |

## Conventions

- TypeScript strict; no `any`. Validate all external input with Zod.
- Keep request-path work light (Workers free plan: 10 ms CPU). Heavy work belongs in `scripts/`.
- Provider clients (LLM, embeddings) sit behind one module each so they can be swapped by env vars.
- Env var names are fixed: `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY` (optional), `ALLOWED_ORIGIN`.
  Optional overrides: `GROQ_CHAT_MODEL`, `GEMINI_CHAT_MODEL`. Web build-time variable (not a secret):
  `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8787`).
- Secrets: local `apps/api/.dev.vars` (git-ignored), production `wrangler secret put`. Never ask Ahsan
  to paste keys in chat; never commit `.dev.vars` / `.env*`.
- Conventional commits. One commit + tag `phase-N` per phase.
- Ahsan uses **Windows + PowerShell**: give PowerShell commands and briefly say what each does.

## Workflow (every phase)

1. **Plan first.** Write `planning/plans/phase-N.md` (goal, tasks, files affected, acceptance
   criteria, tests) using plan mode. Wait for Ahsan's approval before changing code.
2. **Build and test** only what that plan covers. New ideas go to "Later" in `STATUS.md`.
3. **Gate.** Show the phase's "Done when" result from `planning/PLAN.md`. Stop until Ahsan says "approved".
4. **Update docs.** Update `planning/STATUS.md` and any doc that changed; commit docs with the code.
   Stale docs are bugs.
5. **End of session:** update `STATUS.md` with what was done, what's next, open questions.

## Where things are

| Need | Read |
| --- | --- |
| Current state, next step | `planning/STATUS.md` |
| Problem, architecture, data model, guardrails, test set | `planning/DESIGN.md` |
| The 8 phases and their gates | `planning/PLAN.md` |
| Why each decision was made | `planning/CONTEXT.md` |
| Accounts and keys status | `planning/SETUP.md` |
| UI reference (simulated prototype) | `planning/preview.html` |
| Per-phase sub-plans | `planning/plans/` |
