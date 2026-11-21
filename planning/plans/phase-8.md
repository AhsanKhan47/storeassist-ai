# Phase 8 — Portfolio packaging and selling

Status: Approved 2026-11-21; Claude's part built, at the gate (then Ahsan records and publishes)

## Goal

Turn the working demo into something that wins work. A client who opens the GitHub repo, the live site or
the gig should understand in 30 seconds what it does, see proof that it is reliable (eval 15/15,
guardrails, sources), and know what they would get for their own store, including the one-line website
widget.

**Done when (from `PLAN.md`):** the gig and portfolio entry are live with the demo link and video.
The Claude half is done when the README, screenshots, Loom script and copy are committed; the rest is
Ahsan publishing.

## What Claude builds

### 1. `README.md` (repo root, new)

Written for a client or recruiter skimming GitHub first, and a developer second:

1. **Title and one-line pitch,** live demo buttons (site, `/try-widget`, `/demo/`), "sample data" note
2. **Hero screenshot** (desktop answer with sources)
3. **What it does:** answers only from the store's documents, cites sources, says "contact us" instead
   of guessing, friendly greetings, refuses prompt injection; one line about the widget snippet
4. **Proof:** eval 15/15 + 8/8 attack and small-talk checks (link to `eval/report.md`), 87 unit tests,
   live CPU median 11 ms, all on free tiers
5. **Add it to any website:** the `<script>` snippet, `data-` options, `StoreAssist.open()`
6. **How it works:** Mermaid architecture diagram (GitHub draws it; no image to maintain): browser /
   widget → Pages → Worker (rate limit → small talk → cache → embed → pgvector search → 0.67 cutoff →
   Groq, falling back to Gemini) → streamed answer with citations
7. **Stack and why** (short table, from `CONTEXT.md`)
8. **Run it locally:** prerequisites, free accounts, `.dev.vars` keys by name only, the `pnpm` commands
9. **Project layout,** **Later** list (paid add-ons: WhatsApp, multi-language, order lookup, admin panel)
10. **Hire me:** a short line with Fiverr / Upwork links (placeholders until the gig is live)

### 2. Screenshots (`.github/assets/`, new)

Taken from the **live** site in headless Edge at 2× resolution, light mode (plus one dark), saved as
compressed PNG/WebP under ~300 KB each. Five instead of the planned three, because the widget and the
side panel are selling points:

| # | Shot | Shows |
| --- | --- | --- |
| 1 | Desktop answer | Cited answer, source chips, an open excerpt |
| 2 | Under the hood | Match score vs cutoff, model, time |
| 3 | Fallback | "Not in our policies, contact us" for "Do you sell shoes?" |
| 4 | Phone (dark) | Same chat at 390 px |
| 5 | Widget | Demo store page with the widget open and an answer |

`.github/assets/` keeps images out of `docs/` (which is the store's knowledge base) and out of the website
build. The scripts that take them stay in the scratchpad, not the repo.

### 3. Selling copy (`planning/selling/`, new)

- `loom-script.md`: a 60-second video, scene by scene: what to click, what to say (about 140 words),
  ending on the call to action. Includes a 15-second cut for the Fiverr gig video slot.
- `fiverr-gig.md`: title (within Fiverr's 80 characters), search tags, description, three packages
  (Basic / Standard / Premium: what each includes and delivery days; **prices left for Ahsan to set**),
  requirements to ask the buyer, FAQ, image ideas using the screenshots.
- `upwork-portfolio.md`: portfolio entry (title, role, description, skills, links), plus one short
  proposal template he can adapt to job posts.

All copy follows the pitch already in `DESIGN.md`: "I'll build this for your store, from your own
policies, in 7 days."

## What Ahsan does

1. Read the README on GitHub after the push and the copy files; ask for changes.
2. Record the Loom with the script; send Claude the link (it goes into the README).
3. Publish the Fiverr gig and Upwork portfolio entry; send Claude the links (they go into the README).

## Decisions (please confirm or change)

| Decision | Choice | Why |
| --- | --- | --- |
| Screenshots | 5 (adds widget and side panel) | Both are what set this apart from a basic chatbot |
| Diagram | Mermaid in the README | Renders on GitHub, edits as text, no image tool needed |
| Copy lives in | `planning/selling/` in the repo | Kept with the project and versioned. **If the GitHub repo is public, anyone can read it;** prices are left out for that reason. Say if you'd rather keep the copy outside the repo |
| Prices | Not set by Claude | Your market and your call; the packages list scope and delivery days |
| Your contact links | Placeholders until the gig is live | Avoids dead links; filled in at step 3 above |
| Tag | `phase-8` on the commit with the README and copy | Same as every phase |

## Files affected

- `README.md`: new
- `.github/assets/*.png|webp`: new (5 screenshots)
- `planning/selling/loom-script.md`, `fiverr-gig.md`, `upwork-portfolio.md`: new
- `planning/STATUS.md`, `planning/plans/phase-8.md`, `CLAUDE.md` (where-things-are table): change

No app code changes.

## Acceptance criteria

- [ ] README shows correctly on GitHub: screenshots load, Mermaid diagram draws, every link works
      (checked after the push)
- [x] README facts match the repo: eval score, test count, commands, model names, env var names
- [x] No secrets or key values anywhere; `.dev.vars` keys named only
- [x] 5 screenshots from the live site, each under ~300 KB, no personal data, "sample data" visible
- [x] Loom script fills about 60 seconds (125 spoken words plus clicks; shorter than the ~140 planned
      because the clicks need time)
- [x] Fiverr title ≤ 80 characters (73); 5 tags; three packages with scope and delivery days
- [x] Prettier and `pnpm lint` pass

## Results (2026-11-21)

- `README.md`: pitch, live links, hero shot, features, proof table (15/15, 8/8, 87 tests, 11 ms, $0),
  widget snippet and options, Mermaid flow, stack, local setup, layout, "for your own store". Hidden
  comments mark where the Loom and Fiverr/Upwork links go. Every URL returns 200; every repo path exists.
- Screenshots in `.github/assets/` (WebP, 2×, from the live site): `answer` (150 KB, live Groq answer
  with an open excerpt), `under-the-hood` (27 KB, panel close-up: 0.69 vs 0.67, Groq, not saved),
  `fallback` (107 KB), `phone` (80 KB, dark), `widget` (81 KB, demo store).
- `planning/selling/`: `loom-script.md` (60 s + 15 s cut), `fiverr-gig.md` (title, tags, description,
  3 packages without prices, requirements, FAQ, image plan), `upwork-portfolio.md` (portfolio entry,
  proposal template).

## Tests

- Link check: every URL in the README requested (live site, API `/health`, repo-relative files)
- Prettier on all new Markdown; image sizes checked
- After the push: open the README on GitHub in headless Edge and confirm images and diagram render

## Risks

- **Live answers change wording** between screenshot runs: fine, they come from the real site.
- **Groq busy during screenshots** would show Gemini: retake if the shot looks off.
- **Repo visibility:** the README is aimed at a public repo. If it is private, clients cannot see it;
  making it public is your choice (git history contains no keys, checked in Phase 6).
