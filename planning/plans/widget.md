# Embeddable chat widget

Status: Approved 2026-11-21; built and tested locally, at the gate (live check after push)

## Goal

Any website (a client's Shopify, WordPress or Wix store, or Ahsan's own app) adds the Tallow & Pine
assistant as a **floating chat icon** with one line:

```html
<script src="https://storeassist-ai.pages.dev/widget.js" async></script>
```

A round button appears in the bottom-right corner; clicking it opens the same chat (streaming answers,
citations, fallback, guardrails) in a compact panel. A demo shop page shows it in action for clients and
for the Phase 8 video.

**Done when:** the demo page at `https://storeassist-ai.pages.dev/demo/` shows the button, the panel
opens and answers a question with sources, closes with the button, the close icon or Escape, works at
phone width (full-screen panel), and a hostile host stylesheet does not break it.

## How it works

```
Host website                                   storeassist-ai.pages.dev
┌──────────────────────────────┐
│  <script src=".../widget.js"> │  loads ──►   widget.js (small, no dependencies)
│                               │
│                   ┌─────────┐ │              draws the button in a Shadow DOM
│                   │  panel  │ │  iframe ──►  /embed  (compact chat page, same code as the site)
│                   │ (iframe)│ │                 │
│                   └─────────┘ │                 ▼ fetch (unchanged CORS: same origin as today)
│                       ( 💬 )  │              storeassist-api Worker
└──────────────────────────────┘
```

- **`widget.js`**: plain JavaScript, a few KB, no framework. Draws the launcher button inside a
  **Shadow DOM** so the host page's CSS cannot restyle it. Creates the iframe only on first open (no
  cost to page load). Escape and the button close it; focus moves into the chat on open and back to the
  button on close.
- **`/embed`**: a new page in `apps/web` reusing the existing chat components in a compact layout: small
  header (store name, new chat, close), no demo notice bar (a one-line "Demo with fictional data" note
  at the bottom instead), no side panel. The close icon tells the parent page to close the panel
  (`postMessage`, origin-checked).
- **API unchanged:** the chat inside the iframe runs on `storeassist-ai.pages.dev`, so the CORS lock,
  rate limit and everything else stay exactly as they are.

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| Approach | Script + iframe (not a web component rendered in the host page) | Host CSS cannot break the chat and the chat cannot break the host site; works on any platform that allows a script tag; no API or CORS change |
| Who may embed `/embed` | **Any site** for this demo (`frame-ancestors *` on `/embed` only; the main site stays unframeable) | Clients should be able to try the snippet on their own store. For a paying client's own deployment it becomes their domain only (documented) |
| Settings | Optional `data-` attributes on the script tag: `data-color` (button color), `data-position` (`right` or `left`), `data-label` (button tooltip and screen-reader name) | Enough to match a client's brand without code |
| Phone layout | Panel goes full screen under 600 px wide, with its own close button | A small floating panel is unusable on a phone |
| Demo page | `apps/web/public/demo/index.html`: a simple fake Tallow & Pine product page (clearly labeled demo) with the snippet, plus a stress test of hostile CSS | Shows clients exactly what they get; proves isolation |
| Teaser bubble ("Questions? Ask us") | Not now (to "Later") | Keeps scope small; can be added as a `data-` option |
| Multiple stores on one deployment | Not in scope | Each client gets their own deployment and documents; multi-tenant is a paid add-on |

## Tasks

1. `apps/web/public/widget.js`: launcher (Shadow DOM, styled to match the site: blue gradient, glass
   shadow, spring open/close), lazy iframe panel, Escape and close handling, `postMessage` listener
   checking the origin, `data-` settings, reduced-motion support, no globals besides one guard flag.
2. `apps/web/src/app/embed/page.tsx` plus an `embed` variant of `Chat` (compact header with close,
   no notice bar, no side panel, compact welcome list), reusing the existing components and styles.
3. `apps/web/public/_headers`: for `/embed*`, replace the CSP with one whose `frame-ancestors` is `*`
   and drop `X-Frame-Options`; the rest of the site keeps `frame-ancestors 'none'`. `widget.js` gets a
   short cache (5 minutes) so updates reach sites quickly.
4. `apps/web/public/demo/index.html`: fake product page with the snippet; a second test page with
   hostile CSS (`* { all: unset }`, huge fonts, `z-index` wars) for the isolation check.
5. Docs after the gate: README-ready snippet in `STATUS.md` / `CLAUDE.md`, this plan's results.

## Files affected

- `apps/web/public/widget.js` — create
- `apps/web/src/app/embed/page.tsx` — create
- `apps/web/src/components/Chat.tsx` (+ small CSS additions in `globals.css`) — change — `embed` variant
- `apps/web/public/_headers` — change — framing allowed for `/embed` only
- `apps/web/public/demo/index.html`, `apps/web/public/demo/hostile.html` — create
- `apps/web/src/app/try-widget/page.tsx`, `apps/web/src/components/WidgetPlayground.tsx` — create —
  in-app test page (added at Ahsan's request)
- `apps/web/src/components/icons.tsx`, `Composer.tsx`, `Welcome.tsx` — change — close/copy icons,
  focus on open, compact welcome
- `apps/api/src/lib/smalltalk.ts` (+ test), `apps/api/src/routes/chat.ts` — create/change — greetings
- `apps/web/src/components/Message.tsx`, `UnderTheHood.tsx`, `Chat.tsx` — change — small-talk display
- `scripts/lib/eval-score.ts` (+ test), `eval/extra.json` — change — greeting checks
- `apps/web/src/app/globals.css` — change — thin scrollbar and no sideways scroll inside the widget
- `planning/STATUS.md`, `CLAUDE.md` — change — docs after the gate

## Acceptance criteria

- [x] On the demo page the button appears bottom-right, opens the panel, and a question gets a streamed,
      cited answer inside it; the fallback works too
- [x] Closes with the button, the panel's close icon and Escape; focus returns to the button
- [x] At 390 px wide the panel is full screen and usable; no horizontal scroll on the host page
- [x] The hostile-CSS page shows the same button and panel unchanged
- [x] The main site still refuses to be framed; only `/embed` can be framed
- [x] The iframe is created only on first open; `widget.js` is small (6.6 KB unminified, **2.5 KB
      gzipped**; slightly over the 6 KB target before compression)
- [ ] Lint, typecheck, tests, build pass (done); live check after Ahsan pushes (Pages rebuilds)

## Results (2026-11-21, local)

Built site served by `wrangler pages dev` (so `_headers` apply) with a local API; headless Edge.

| Check | Result |
| --- | --- |
| Launcher | 60×60, 22 px from the bottom-right corner; no iframe until the first click |
| Open | Panel 400×680 with the compact chat (`/embed`); "Can I return a sale item?" → cited answer, 2 source chips |
| Close | Launcher button (focus returns to it), the chat's × icon, Escape inside the chat, Escape on the host page |
| Reopen | Same iframe, conversation kept |
| Fallback | "Do you sell shoes?" → amber fallback inside the widget |
| Phone (390×844, dark) | Panel full screen, launcher steps aside, × closes and the launcher returns; host page has no horizontal scroll |
| Hostile CSS page | `* { all: unset !important }`, everything hidden/rotated, a red box in the corner: launcher and panel identical, above the box |
| Framing | Headers: `/` → `frame-ancestors 'none'` + `X-Frame-Options: DENY`; `/embed` → `frame-ancestors *`, no `X-Frame-Options`. From a page on another origin, `/` is refused by the browser and `/embed` loads |
| `widget.js` | `Cache-Control: public, max-age=300`; 2.5 KB gzipped |
| Console | Clean apart from the expected framing refusal; a missing favicon 404 on the demo pages was fixed |

Extra beyond the plan: `window.StoreAssist.open() / .close() / .toggle() / .destroy()` so a site can
open the chat from its own "Help" button, and the chat's message box focuses on open on devices with a
mouse.

## Added at Ahsan's request: friendly replies to greetings ("Hey" → fallback was robotic)

"Hey:" used to get the "not in our policies" fallback, because every message was treated as a policy
question. Now `apps/api/src/lib/smalltalk.ts` recognizes messages that are *entirely* small talk
(greetings, "how are you", thanks, goodbyes, "ok") and the chat route replies right after the rate limit,
with no search and no model call. Greeting plus a real question ("Hi! Can I pay in installments?") still
takes the normal path.

- UI: meta line "Instant reply, 0.3 s"; side panel shows "Closest match: Not needed" and counts it as a
  saved model call.
- Tests: `smalltalk.test.ts` (37 cases, including real questions that must not match); eval extra checks
  gained `notFallback` and three cases (plain greeting, thanks after an answer, greeting plus question).
- Live (version `275c1913`): "Hey:" gets the greeting; eval 15/15 with the new extra checks passing.

## Added at Ahsan's request: `/try-widget` test page in the app

A route in the main app (`apps/web/src/app/try-widget`, `components/WidgetPlayground.tsx`) for testing
the embed flow, linked from the main page's demo notice ("Try it as a website widget"):

- loads the real `widget.js` on the page and reloads it when a setting changes (button color, corner,
  label), using the new `StoreAssist.destroy()`
- shows the matching snippet with a Copy button
- "Open chat" / "Close chat" buttons that call `StoreAssist.open()` / `.close()`
- links to the demo store page and the hostile-CSS test

Browser check against the running app (15/15): link from the main page; one widget bottom-right in
blue; Pine recolors it; Bottom left moves it; the label changes its accessible name; the snippet gains
the matching `data-` attributes; Copy puts the snippet on the clipboard; Open/Close work; a question
inside the widget gets a cited answer; going back to the main page removes the widget.

## Tests

- **Local:** headless Edge on the demo and hostile pages served by `wrangler pages dev` (so `_headers`
  apply): open, ask, answer with sources, close three ways, phone width, framing rules (main site
  blocked in an iframe, `/embed` allowed), console clean.
- **Live:** same checks on `https://storeassist-ai.pages.dev/demo/`.
- **Manual for Ahsan:** open the demo page on his phone and laptop; optionally paste the snippet into
  any HTML page of his own.

## Risks / open questions

- **Third-party cookie/storage rules** don't matter here: the chat keeps no cookies or storage.
- **Sites with strict CSP** (rare on small stores) must allow `https://storeassist-ai.pages.dev` in
  `script-src` and `frame-src`; documented with the snippet.
- **Rate limit:** visitors share the same 10 messages/minute per IP; unchanged.
