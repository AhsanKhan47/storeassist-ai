# Phase 7 — Deployment

Status: Approved 2026-11-11; in progress (code committed as `phase-7`, live checks pending)

## Goal

The demo is live on free Cloudflare plans: the chat API on Workers, the website on Pages (built from
GitHub on every push to `main`), locked to each other with CORS, with security headers, and the same
15-question eval passing against the live API.

**Done when (from `PLAN.md`):** the live link works on Ahsan's phone and the live eval shows 15/15.

## Addresses

- API: `https://storeassist-api.ahsankhan47.workers.dev` (Worker name from `wrangler.jsonc`, subdomain
  from `SETUP.md`)
- Website: `https://storeassist-ai.pages.dev` if the name is free; Cloudflare adds a suffix if it is
  taken. The real address is known the moment the Pages project is created (step 1), before anything
  depends on it.

## Steps and who does them

| # | Who | Step |
| --- | --- | --- |
| 0 | Ahsan | Push the finished phases: `git push origin main phase-4 phase-5 phase-6` (Pages builds from GitHub) |
| 1 | Ahsan (Claude guides) | Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** → pick `storeassist-ai`, project name `storeassist-ai`, production branch `main`. Build settings below. Approve the GitHub permission prompt. The first build gives the live site address |
| 2 | Claude | Code changes (next section), local checks, CSP tested locally with `wrangler pages dev` |
| 3 | Claude | `pnpm deploy:api` → Worker live; `/health` answers |
| 4 | Ahsan | Add the 5 secrets to the Worker, one command each (below). Values are pasted into the terminal prompt, never into chat |
| 5 | Claude | Check the live API: `/health`, `pnpm run chat --url <live>`, CORS from the Pages address only, rate limit |
| 6 | Claude, after Ahsan's OK | Commit + tag `phase-7` (code); Ahsan pushes; Pages rebuilds with the security headers |
| 7 | Claude | Check the live site in a real browser (headers, no CSP errors, cited answer, fallback); `pnpm eval --url <live API>` |
| 8 | Ahsan | Open the live link on his phone and ask a question |
| 9 | Claude, after "approved" | Record results; a small `docs:` commit with the live results |

**Pages build settings (step 1):**

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `pnpm --filter @storeassist/web build` |
| Build output directory | `apps/web/out` |
| Root directory | `/` (repository root, so the workspace packages are available) |
| Environment variables | `NEXT_PUBLIC_API_URL=https://storeassist-api.ahsankhan47.workers.dev`, `NODE_VERSION=22`, `PNPM_VERSION=12.18.0` |

**Secrets (step 4),** run from the project folder, one at a time; each command asks for the value:

```powershell
cd apps/api
npx wrangler secret put DATABASE_URL
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
cd ../..
```

Copy each value from `apps/api/.dev.vars`. `CEREBRAS_API_KEY` stays unset. `ALLOWED_ORIGIN` is not a
secret; it goes in `wrangler.jsonc`.

## Code changes (step 2)

1. `apps/api/wrangler.jsonc`: `vars.ALLOWED_ORIGIN` = the Pages address; `observability.enabled: true`
   (Workers Logs, free 200K events/day, shows errors and CPU time). Local dev is unaffected:
   `.dev.vars` overrides `vars`.
2. `apps/api/src/index.ts`: Hono `secureHeaders()` middleware on the API (nosniff, no framing, strict
   referrer).
3. `apps/web/public/_headers` (Pages reads it): `Content-Security-Policy` allowing scripts, styles and
   fonts only from the site itself, `connect-src` only to the API address, `frame-ancestors 'none'`;
   plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy` turning off camera, microphone and location. Next's static export uses inline
   scripts and the UI uses inline styles, so `script-src` and `style-src` include `'unsafe-inline'`;
   the page has no user-generated HTML, and the API is the only network destination allowed.
4. Root `package.json`: `deploy:api` = `pnpm --filter @storeassist/api exec wrangler deploy`.
5. Docs after the gate: `STATUS.md`, `CLAUDE.md` (deploy command, live URLs), `SETUP.md`
   (Pages project, secrets set), this plan's results.

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| Website host | **Cloudflare Pages** with Git integration, as planned in `DESIGN.md` | Free, unlimited static requests, deploys on every push, still fully supported. Cloudflare now points new projects at Workers static assets; moving later is a configuration change, written in "Later" |
| Who builds the site | Pages builds from GitHub (Node 22, pnpm 12.18 set by env vars) | Every push to `main` redeploys; no local build or upload step |
| Secrets | Ahsan runs `wrangler secret put` five times (as `PLAN.md` says) | Keys go straight from his clipboard to Cloudflare. Option if he prefers: Claude runs `wrangler secret bulk` from a temporary file built from `.dev.vars` and deleted immediately, with no value printed |
| Commit timing | Commit + tag `phase-7` **mid-phase** (step 6), after local checks and Ahsan's OK; live results go in a small `docs:` commit after the gate | Pages can only build code that is on GitHub, so the code commit has to come before the live checks |
| CORS | Only the production Pages address. Pages preview deployments (`<hash>.storeassist-ai.pages.dev`) cannot call the API | One allowed origin keeps the API locked; previews are not used for this demo |
| Database and cache | Same Neon database and Upstash instance as local (already holds the 15 documents) | No second free-tier account needed; ingest stays a local command |
| GitHub Action to re-ingest on `docs/` changes | **Skip for now** (to "Later") | `PLAN.md` marks it optional; it would put the database and Gemini keys into GitHub secrets for a demo whose documents rarely change |
| Live eval | `pnpm eval --url https://storeassist-api.ahsankhan47.workers.dev` | Same script and scoring as local; it clears the shared answer cache first, which is harmless before launch |

## Acceptance criteria

- [ ] `https://storeassist-api.ahsankhan47.workers.dev/health` returns `{"ok":true}`
- [ ] The live site loads, shows the landing screen, streams a cited answer and the fallback
- [ ] Only the Pages address gets a CORS header; other origins get none
- [ ] Security headers present on the site (CSP, nosniff, referrer, permissions) with no CSP errors in
      the browser console; API responses carry `secureHeaders`
- [ ] `pnpm eval --url <live API>` writes a 15/15 report
- [ ] Workers Logs show requests with CPU time recorded; no 1102 (CPU limit) errors during the eval
- [ ] Ahsan opens the live link on his phone and gets an answer
- [ ] No secret in the repo, the built site, or command output; everything on free plans, no card

## Tests

- **Local before deploying:** lint, typecheck, `pnpm test`, build; the built site served by
  `wrangler pages dev apps/web/out` in headless Edge to confirm the CSP blocks nothing the page needs.
- **Live:** `curl` for `/health`, CORS preflights and headers; headless Edge on the live site (light,
  dark, phone width, console clean); `pnpm eval --url <live API>`.
- **Manual for Ahsan:** open the live link on a phone; try a landing question and "Do you sell shoes?".

## Risks / open questions

- **Pages build environment.** The build image defaults to Node 22 and an older pnpm; `PNPM_VERSION`
  and `NODE_VERSION` override them. If the build still fails (for example the pnpm 12 lockfile), the
  fallback is building locally and uploading with `wrangler pages deploy`, which needs a new
  direct-upload project (a Git-connected project cannot switch).
- **Pages project name taken.** Cloudflare adds a suffix; `ALLOWED_ORIGIN` and the docs use whatever
  address step 1 shows.
- **Worker CPU limit (10 ms on the free plan).** Most of each request is waiting on the network; Workers
  Logs confirm the real CPU time. If some requests exceed it, the fix is trimming per-request work, not
  a paid plan.
- **Shared rate limit on the live API:** 10 messages a minute per visitor. A client clicking fast during
  a demo will see the "busy" bubble; that is the protection working.
- **Cold starts.** Neon sleeps after 5 idle minutes, so the first question after a quiet spell can take a
  few seconds; the UI shows "Searching the store policies" meanwhile, and the 20 s timeout covers a stall.
