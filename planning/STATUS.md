# STATUS

Last updated: 2026-11-09 (Phase 2 complete, before Phase 3)

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

## In progress

- Nothing yet.

## Next

- Ahsan pushes Phase 2: `git push origin main; git push origin phase-2`
- **Phase 3 — Data layer and ingestion** (see `planning/PLAN.md`).
  First step: write `planning/plans/phase-3.md` and get Ahsan's approval. Ingestion must skip
  `docs/README.md`, strip the frontmatter quotes from titles, and chunk by `##` heading.

## Open questions / blockers

- GitHub remote: `git@github-personal:AhsanKhan47/storeassist-ai.git` (SSH alias for his personal
  account). Ahsan does all pushes himself.
- ESLint 10 works, but three lint plugins do not list it as supported yet. Pin ESLint 9 if lint breaks.
- Cerebras key skipped; fallback chain is Groq → Gemini for now.
- Phase 6 tuning risks: "Do you sell shoes?" may match the About page's "What we sell" section above the
  cutoff; "gift wrapping" sits close to the gift-card text; the FAQ repeats some delivery times and the
  hemming price, so eval scoring may need to accept `faq` as an alternative source.
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
| 1 Foundation | Done | `phase-1` | Ahsan pushes |
| 2 Knowledge base | Done | `phase-2` | Ahsan pushes |
| 3 Data + ingestion | Next | | |
| 4 Chat API | Not started | | API spec goes in `plans/phase-4.md` |
| 5 Chat UI | Not started | | Reference: `preview.html` |
| 6 Quality + evals | Not started | | |
| 7 Deployment | Not started | | |
| 8 Portfolio + selling | Not started | | |
