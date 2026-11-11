# Setup status (accounts and tools)

All free, no card. Status as of 2026-11-11.

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

## Where keys go

- Local: `apps/api/.dev.vars` (git-ignored). Ahsan pastes them himself after Phase 1 scaffolding.
- Production: `npx wrangler secret put <NAME>` for each key.

## Rules

- Never paste keys into chat, docs, or committed files.
- If a key leaks, delete it in the provider dashboard and create a new one.
- Never add a card to any account for this demo; if a step demands one, stop.
