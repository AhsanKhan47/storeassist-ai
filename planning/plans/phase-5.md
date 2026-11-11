# Phase 5 — Chat UI

Status: Done (2026-11-11)

## Goal

A polished chat page a client can try in 30 seconds: `pnpm dev`, open `localhost:3000`, ask a question,
watch a cited answer stream in, click a source to see the excerpt, and see the fallback, busy and
network-error states. It talks to the Phase 4 API and nothing else.

## Design direction (Ahsan: "follow the design and follow Apple style UI")

Flow and content follow `planning/preview.html` (landing questions, chat, source chips, "under the hood"
side panel, "try to break it" list). The visual language is Apple's: system fonts, frosted glass, soft
shadows, generous radii, iMessage-style bubbles, light and dark mode.

| Token | Light | Dark |
| --- | --- | --- |
| Page | `#f5f5f7` | `#000000` |
| Surface / grouped rows | `#ffffff` / `#f2f2f7` | `#1c1c1e` / `#2c2c2e` |
| Ink / muted | `#1d1d1f` / `#6e6e73` | `#f5f5f7` / `#98989d` |
| Accent (fills, user bubble) | `#0071e3` | `#0071e3` |
| Accent (text, links) | `#0066cc` | `#4da3ff` |
| Brand tile (logo only) | pine `#27493f` | pine `#27493f` |
| Not-in-policies | amber tint | amber tint |
| Error / busy | red tint | red tint |

- **Type:** `-apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI Variable", "Segoe UI", system-ui`.
  Landing headline 40 px / 600 / -0.03 em; body 15–16 px; no all-caps labels, no monospace.
- **Glass:** top bar and composer use `backdrop-filter: blur(20px) saturate(180%)` with a translucent
  fill; content scrolls underneath. Plain fill where blur is unsupported.
- **Shape:** 22 px chat bubbles with a small tail corner, 14–18 px grouped rows, fully round send button.
- **Motion (only in response to the user):** new bubbles ease in; the send button and chips press-scale;
  source excerpt expands smoothly. All off under `prefers-reduced-motion`.
- **The one bold moment:** the landing screen's large headline over an iOS-style grouped list of four
  questions. Everything else stays quiet.

```
DESKTOP                                                MOBILE
┌ notice: demo with fictional data · GitHub ─────┐     ┌ notice ─────────────┐
├ [TP] Tallow & Pine Help            [New chat]  ┤     ├ [TP] Help   (i)  ⟲ │
│                                                │     │                     │
│        How can we help?          ┌ Under the ┐ │     │   How can we help?  │
│  Answers come from our policies  │ hood      │ │     │  ┌ grouped list ──┐ │
│  ┌ grouped list of 4 questions ┐ │ Last answer│ │     │  │ question    >  │ │
│  │ question                  > │ │ score bar  │ │     │  └────────────────┘ │
│  └─────────────────────────────┘ │ session    │ │     │ ╭ Ask about…   (↑)╮ │
│  ╭ Ask about orders…      (↑) ╮  │ try to     │ │     └─────────────────────┘
│  ╰────────────────────────────╯  │ break it   │ │
└────────────────────────────────────────────────┘     (i) opens the panel as a sheet
```

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| State and styling | React state in one client component tree, plain CSS (tokens in `globals.css`) with Tailwind imported but used sparingly | No new dependencies; glass and Apple details are easier in CSS |
| Data | Real Phase 4 API via `fetch` + SSE parsing, validated with the shared Zod schemas | Same contract the API tests use |
| API URL | `NEXT_PUBLIC_API_URL`, default `http://localhost:8787` | Phase 7 sets it for the live build |
| Side panel | Shows only facts the API really returns: closest-match score vs the 0.67 cutoff, sources used, which model answered (or none), cached or not, time, session counts | The preview's pipeline steps (validate, rate limit) are not observable from the browser |
| Cutoff constant | `RELEVANCE_CUTOFF` moves to `packages/shared` so the UI and API share one number | One source of truth |
| History sent to the API | Last 2 finished question/answer pairs plus the new question; assistant text cut to 500 characters | The API rejects messages over 500 characters, and answers can be longer |
| Failures | Rate limit, busy and network errors show a red-tinted bubble with a "Try again" button that re-sends the same question | Matches `DESIGN.md` ("busy, try again in a moment") |
| Dark mode | Follows the system setting; no toggle | Keeps the UI minimal |
| Footer name | No personal name in the UI yet | Phase 8 decides portfolio branding |

## Tasks

1. `packages/shared`: export `RELEVANCE_CUTOFF`; `apps/api/src/lib/config.ts` re-exports it.
2. `apps/web/src/lib/chat-client.ts`: `streamAnswer()` (fetch, SSE parsing, Zod validation, typed
   failures). `lib/history.ts`: build the request history (pure).
3. Components in `apps/web/src/components/`: `Chat`, `Welcome`, `Message`, `Sources`, `Composer`,
   `UnderTheHood`, small `icons`.
4. `globals.css`: tokens, glass, bubbles, motion, responsive rules, focus rings, reduced motion.
5. `layout.tsx` metadata and color scheme; `page.tsx` renders `Chat`.
6. Check in a real browser (light, dark, mobile width) against the running API.
7. After the gate: `STATUS.md`, `CLAUDE.md` (web env var), this plan's checkboxes; commit + tag `phase-5`.

## Files affected

- `packages/shared/src/index.ts`, `apps/api/src/lib/config.ts` — change — shared cutoff
- `apps/web/src/app/layout.tsx`, `page.tsx`, `globals.css` — change
- `apps/web/src/lib/chat-client.ts`, `history.ts`, `turns.ts`, `questions.ts` — create
- `apps/web/src/components/*.tsx` — create (`Chat`, `Welcome`, `Message`, `Sources`, `Composer`,
  `UnderTheHood`, `icons`)
- `apps/web/src/app/icon.svg` — create — favicon
- `planning/*`, `CLAUDE.md` — change — docs after the gate

## Acceptance criteria ("Done when", from `PLAN.md`)

- [x] `pnpm dev`, open `localhost:3000`: landing shows the store name, one-line explanation and four
      clickable questions
- [x] A question streams a cited answer; `[n]` badges and source chips open the matching excerpt
- [x] "Do you sell shoes?" shows the fallback styled differently from answers
- [x] A busy or rate-limit response shows an error bubble with "Try again"; stopping the API shows the
      network error state
- [x] A follow-up question works (history accepted by the API)
- [x] Enter sends, Shift+Enter adds a line, input stops at 500 characters
- [x] Works at phone width (no horizontal scroll) and in dark mode; visible keyboard focus (Tab
      reached the first question row and its blue ring is fully visible; list rows draw it inward so
      the rounded list does not clip it)
- [x] "Demo with fictional sample data" notice and GitHub link are visible
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; no key or secret in the web bundle

## Redesign v2: "premium effect and smooth animation" (Ahsan, 2026-11-11)

Ahsan found the first pass too plain. v2 keeps the layout and behavior and changes the visual layer:

- **Depth:** fixed ambient background (three slowly drifting radial light orbs in blue, pine and violet,
  plus fine grain) so the glass layers have something to blur.
- **Glass:** translucent fills with a bright top edge, hairline border and layered soft shadows; the
  top bar is a floating rounded capsule.
- **Type:** SF on Apple devices, **Geist** elsewhere (via `next/font/google`, self-hosted at build
  time, no runtime request to Google); larger headline (up to 66 px, -0.045 em) with a vertical tone fade.
- **Landing:** "Answers from 15 store policy pages" status pill with a live dot; the four questions are
  glass cards with Apple Settings–style gradient icon tiles (Returns, Delivery, Payments, Damaged item).
- **Motion (all off under reduced motion):** staggered blur-and-rise entrance; spring bubbles, chips and
  bottom sheet; streamed text revealed smoothly by `useSmoothText` with a glowing caret; "Searching the
  store policies" / "Writing an answer" shimmer; animated excerpt expand; count-up session numbers;
  turning gradient ring around the composer on focus; progressive blur under the composer.
- **Message meta line:** "Answered by Groq in 2.4 s", "Saved answer, 0.4 s", "No model needed, 0.7 s".
- **Excerpts:** Markdown tables and bullets from the policy pages are formatted as readable lines.
- **Phones:** top bar buttons become icon-only (with accessible labels); shorter composer placeholder.
- New files: `apps/web/src/lib/motion.ts` (`useSmoothText`, `useCountUp`, `useReducedMotion`).
- **Request timeout:** if the API sends nothing within 20 s (or goes silent for 30 s mid-answer), the
  UI stops waiting and shows "The assistant is taking too long…" with **Try again**. Found when a
  frozen local API left the page on "Searching the store policies" forever; verified against that
  frozen server (error bubble after 20.9 s).

## Changes made during the build (deviations from the approved plan)

- **Source chips show only the sources the answer cites** (plus the closest one if it cites none),
  not all five retrieved excerpts. Five identical "Returns and exchanges" chips were noise. When two
  chips share a page title, the section name is added.
- **Panel label "Excerpts read"** (5 retrieved) instead of "Sources used", since only some are cited.
- **Small screens:** the side panel is an iOS-style bottom sheet (dimmed backdrop, Done button,
  Escape closes), opened by a "Details" button in the top bar; the word "Help" hides next to the logo
  below 600 px so the name does not truncate.
- **`apps/web/src/app/icon.svg`** added (pine "TP" tile) as the favicon; without it the browser
  logged a 404.
- **Keyboard:** Enter sends, Shift+Enter adds a line; input is a textarea that grows to 140 px.
- **Differences from `preview.html`** (Ahsan to confirm or ask for any back): the seven-step pipeline
  panel is replaced by facts the API really returns (match score vs cutoff, excerpts read, model,
  saved answer, time); the "Send 10 quick messages" demo button is gone (the real rate limit is
  tested with `pnpm run chat --repeat 11`); the per-bubble tags ("From cache · no model call") moved
  into the side panel; the "Try to break it" list kept four of the five questions.
- `RELEVANCE_CUTOFF` moved to `packages/shared` as planned; the API re-exports it from `config.ts`.

## Results (2026-11-11, headless Edge against the real API; screenshots reviewed)

| Check | Result |
| --- | --- |
| Landing (light, dark, 390 px phone) | Large headline, grouped question list, floating composer; no horizontal overflow at 390 px |
| Streamed answer with `[1]` badges | Cited sources shown as chips; clicking a badge or chip opens the excerpt and match score |
| "Do you sell shoes?" | Amber fallback bubble, caption "nothing was guessed"; panel shows "Below 0.67", "No model call" |
| Side panel | Closest match bar with the 0.67 cutoff marker, excerpts read, model, saved answer, time, session counts |
| API unreachable (request blocked) | Red bubble "Can't reach the assistant…" with **Try again**; retry answers, no duplicate question |
| 429 response (mocked) | Server message shown ("Please wait 12 seconds…") with **Try again** |
| Real 429 from the API with an `Origin` header | Carries `Access-Control-Allow-Origin`, so the browser can read the rate-limit message (not "can't reach") |
| Keyboard focus | Tab reaches the question rows; the ring is visible on all four edges |
| Follow-up question | Answered; history accepted (assistant text clipped to 500 characters) |
| Enter / Shift+Enter / 500-character cap | Send / newline / input stops at 500 |
| Mobile sheet | "Details" opens the sheet over a dimmed page; Done closes it |
| Browser console | No errors or page errors |
| Bundle | Static export builds; no `.dev.vars` value appears in `apps/web/out` |

## Tests

- **Automated:** lint, typecheck, `pnpm build` (static export). Component tests are not planned (the
  PLAN lists Vitest for chunking, prompt and fallback logic only).
- **In a real browser (Claude, with screenshots):** landing, streamed answer with source open,
  fallback, error state, dark mode, 390 px width.
- **Manual for Ahsan:** `pnpm dev`, open `http://localhost:3000`, try the four landing questions and
  the "try to break it" list.

## Risks / open questions

- **Rate limit while testing:** 10 requests a minute per IP; clicking quickly through the break-it list
  can hit it. That is the error state working as designed.
- **Web fonts:** on Windows the system stack renders Segoe UI, not SF. It looks right on Apple devices.
- **Streaming in Safari:** uses a stream reader loop rather than async iteration for compatibility.
- **`backdrop-filter`** is unsupported in a few old browsers; the translucent fill stays readable.
