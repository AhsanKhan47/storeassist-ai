# Setup status (accounts and tools)

All free, no card. Status as of 2026-11-21.

| Item | Status | Notes |
| --- | --- | --- |
| Node.js LTS (22 or newer), pnpm, Git, VS Code | Done | Node 26.13, pnpm 12.18; Windows, PowerShell |
| Project folder `C:\Users\ahsan\Desktop\Personal\storeassist-ai` | Done | |
| GitHub repo `storeassist-ai` (public, empty) | Done | Remote uses the SSH alias: `git@github-personal:AhsanKhan47/storeassist-ai.git`; Ahsan pushes himself |
| Cloudflare account + `npx wrangler login` | Done | Subdomain `ahsankhan47.workers.dev` |
| Neon project + `create extension if not exists vector;` | Done | Use the **pooled** connection string as `DATABASE_URL`. Tables created by `pnpm db:migrate`; 15 docs / 133 chunks loaded by `pnpm ingest` (2026-11-11) |
| Upstash Redis `storeassist-cache` | Done | REST URL + token |
| Groq API key | Done | `GROQ_API_KEY` |
| Gemini API key (AI Studio) | Done | `GEMINI_API_KEY`; free-tier data may be used by Google. `gemini-embedding-001` at 768 dims confirmed working |
| Cerebras API key | Skipped | Optional fallback |
| Worker `storeassist-api` | Live | `https://storeassist-api.ahsankhan47.workers.dev`; 5 secrets set (`DATABASE_URL`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`); `ALLOWED_ORIGIN` in `wrangler.jsonc`; Workers Logs on |
| Pages project `storeassist-ai` | Live | `https://storeassist-ai.pages.dev`, built from GitHub `main`. Build command `pnpm --filter @storeassist/web build`, output `apps/web/out`, root empty; Production variables `NEXT_PUBLIC_API_URL`, `NODE_VERSION=22`, `PNPM_VERSION=12.18.0` |

## Where keys go

- Local: `apps/api/.dev.vars` (git-ignored). Ahsan pastes them himself after Phase 1 scaffolding.
- Production: `npx wrangler secret put <NAME>` for each key (from `apps/api`), or the dashboard:
  Worker → Settings → Variables and Secrets → type **Secret**. Paste values without quotes.

## Rules

- Never paste keys into chat, docs, or committed files.
- If a key leaks, delete it in the provider dashboard and create a new one.
- Never add a card to any account for this demo; if a step demands one, stop.
