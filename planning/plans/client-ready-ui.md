# Client-ready UI

Status: Approved 2026-11-21; built and checked locally, deployed, screenshots retaken (at the gate)

## Goal

The live app and widget look like a real store's support chat in screenshots and client demos: no
GitHub links, no "demo / fictional / sample data" wording, no developer panels. The technical view
stays one URL away (`?details=1`) for walkthroughs and the "under the hood" image.

**Done when:** `https://storeassist-ai.pages.dev` shows a clean full-width chat with no demo wording or
GitHub link; `?details=1` (or `#details`) brings back the panel, the Details button and the technical
lines; the widget, `/try-widget` and `/demo/` have no demo wording; lint, typecheck, tests and eval
pass; the 5 new images are in `.github/assets/` and `planning/selling/upwork-images/`.

## Changes

### 1. GitHub links out of the UI

| Where | Now | After |
| --- | --- | --- |
| Main app top banner | "...view the code on GitHub" | Banner removed (see 2) |
| Widget footer | "How it works" → GitHub | Removed |
| `lib/questions.ts` | `GITHUB_URL` | Deleted (no UI uses it) |

`/try-widget`, `/demo/` and the landing page have no GitHub link today. The README keeps its links.

### 2. Demo wording out of the UI

| Where | Now | After |
| --- | --- | --- |
| Main app banner | "Demo with fictional sample data. Tallow & Pine is not a real store. Try it as a website widget or view the code on GitHub" | Removed. The `/try-widget` link moves into the details view (3) |
| Widget footer | "Demo with fictional sample data. How it works" | Removed (the footer goes; the chat gains that space) |
| `/try-widget` banner | "Demo with fictional sample data..." | Removed |
| `/try-widget` texts | "Test the embed flow", "A fake product page with the snippet installed", "Hostile CSS test" card | "Add it to your website", "A product page with the chat installed"; the hostile-CSS card shows only with `?details=1` |
| `/demo/` page | Dark top banner "Demo store page with fictional data. The chat button... one line: `<script>`" ; title "... (widget demo)" | Banner removed, so it looks like a normal product page; title "Linen Wrap Dress \| Tallow & Pine" |
| Site meta description | "...A demo with fictional sample data." | "Support chat that answers from Tallow & Pine's store policies and shows its sources." |

Left as they are: `docs/README.md`, the repo README, `/demo/hostile.html` (a test page, linked only in
the details view), the Fiverr/Upwork copy (they say "sample store", which is honest and fine there).

### 3. Developer view only with `?details=1`

A small hook `useDetailsMode()` reads `location.search` / `location.hash` in the browser after load
(works with the static export; no server). `?details=1` or `#details` turns it on for that page view.

| Element | Normal visitor | `?details=1` |
| --- | --- | --- |
| Side panel: Last answer, This session, Try to break it | Hidden; chat is centered at full width | Shown (as today) |
| Header "Details" button and the phone bottom sheet | Hidden | Shown |
| Line under each answer ("Answered by Groq in 4.1 s", "Saved answer, 0.8 s", "Instant reply") | **Hidden** (my proposal, see decisions) | Shown |
| "Not in the store policies, so nothing was guessed. No model needed" under the fallback | **Hidden** (the amber reply already says it) | Shown |
| "Match score 0.73" in an opened source excerpt | **Hidden** | Shown |
| Link to `/try-widget` | None | Small line above the header: "Website widget" |

The widget (`/embed`) never shows developer details; `?details=1` is for the main page and
`/try-widget`.

### 4. Everything else unchanged

API untouched. Streaming, source chips and excerpts, fallback, busy / rate-limit / network / timeout
states with Try again, New chat, Escape, widget settings and `StoreAssist.open()` all stay.

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| Hide the per-answer "Answered by Groq..." line and match score too | Yes, hidden unless `?details=1` | You listed the panels; these lines are the same developer facts and would still show in screenshots |
| "Sample data" disclosure | Removed from the UI as you asked. `CLAUDE.md` ("the UI says so") and `CONTEXT.md` are updated to record your decision (2026-11-21) | Visitors can still not reach a real business: the phone is a 555 number and the email ends in `.example`. The README and your gig copy still say it is a sample store |
| How `?details=1` persists | Only on that page view (not saved) | A shared link never sticks someone in developer mode; add it again when needed |
| `/try-widget` link from the main app | Only in the details view | A real store's help page would not advertise its widget; you share `/try-widget` directly with clients |
| Push | **Claude pushes to `main`** after the gate (you asked for it in this request) | Pages rebuilds from `main`; screenshots must come from the live site |

## Files affected

- `apps/web/src/lib/details-mode.ts`: new: `useDetailsMode()` hook (+ unit test for the URL check)
- `apps/web/src/components/Chat.tsx`: banner removed, Details button / panel / scrim only in details
  mode, widget footer removed, details-view link to `/try-widget`
- `apps/web/src/components/Message.tsx`, `Sources.tsx`: meta line and match score only in details mode
- `apps/web/src/components/WidgetPlayground.tsx`: banner and wording; hostile card only in details mode
- `apps/web/src/lib/questions.ts`: remove `GITHUB_URL`
- `apps/web/src/app/layout.tsx`: meta description
- `apps/web/src/app/globals.css`: full-width chat when the panel is hidden; remove unused `.notice` /
  `.embed-foot` styles
- `apps/web/public/demo/index.html`: banner and title
- `.github/assets/*.webp` (5), `planning/selling/upwork-images/*.jpg` (5): retaken
- `planning/selling/upwork-portfolio.md`, `README.md` (if an image name or caption changes),
  `planning/STATUS.md`, `CLAUDE.md`, `planning/CONTEXT.md`, this plan

## Screenshots (from the live site after the push)

| File | URL | Shows |
| --- | --- | --- |
| `answer` / `1-cover-answer-with-sources` | `/` | Cited answer, source chips, open excerpt, full-width clean chat |
| `widget` / `2-website-widget` | `/demo/` | Product page with the widget open and an answer |
| `fallback` / `3-honest-fallback` | `/` | "Do you sell shoes?" contact-us reply |
| `under-the-hood` / `4-under-the-hood` | `/?details=1` | Panel close-up: match vs cutoff, model, time |
| `phone` / `5-mobile` | `/` at 390 px, dark | Phone chat with sources |

Four without `?details=1` plus one with it: the same 5 names as now. Each as WebP in
`.github/assets/` and JPG in `planning/selling/upwork-images/`, same sizes as the current files. The hero
shot uses a freshly worded question so it isn't a cached answer.

## Acceptance criteria

- [x] No "GitHub", "demo", "fictional", "sample" or "not a real store" text on `/`, `/embed`,
      `/try-widget` or `/demo/` (checked in the built HTML and in the browser)
- [x] `/`: no side panel, no Details button, chat centered; phone: no bottom sheet
- [x] `/?details=1` and `/#details`: panel, Details button, meta lines and match score back
- [x] Widget, streaming, sources, fallback, widget settings unchanged (widget checks 17/18; the one
      failure is the known false framing test, confirmed fine by the cross-origin check). Rate-limit
      and busy states use the same code paths, untouched
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `pnpm eval --url <live API>` 15/15
- [x] 5 images retaken from the live site, WebP + JPG, under ~400 KB each
- [x] Docs updated: STATUS, CLAUDE.md, CONTEXT.md decision, Upwork copy, README

## Results (2026-11-21)

- Deployed in `9b618e7` (pushed by Claude at Ahsan's request); live site rebuilt within minutes.
- Browser checks, local and live: 28/28 (normal view clean and centered, `?details=1` and `#details`
  bring back panel, meta lines and match scores, phone without sheet, `/embed` never shows developer
  view, `/try-widget` and `/demo/` clean). Widget checks 17/18 live; the one failure is the known
  false result of the `setContent` framing test; the cross-origin framing check confirms `/embed`
  loads and `/` is refused.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` 89/89 (2 new); live eval 15/15 + 8/8.
- Extra: the header narrows to the 740px chat column when the panel is hidden.
- Images retaken from the live site: WebP 25–126 KB, JPG 53–271 KB, same names and sizes as before;
  the hero and panel shots are fresh model answers ("Answered by Groq", not saved). README alt text
  and the panel paragraph updated (points to `?details=1`).

## Tests

- Unit: `details-mode` URL check (`?details=1`, `#details`, other values off)
- Browser (headless Edge, local build then live): the checks above in light and dark, desktop and
  phone; existing widget and `/try-widget` scripts
- Eval against the live API (API unchanged, so this confirms nothing regressed end to end)
