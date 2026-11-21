# Fix — Worker CPU time on model answers

Status: Approved 2026-11-21 (Ahsan: "proceed with the next change we discussed"); building

## Problem

Live Workers Logs from the Phase 7 eval (20 requests): fallbacks use **6 ms** CPU (median), model
answers **24 ms** (12–32 ms), above the free plan's 10 ms guideline. Nothing failed (no 1102), but under
load Cloudflare may start cutting requests off. CPU grows with answer length (85 characters ≈ 13 ms,
600 characters ≈ 30 ms), so the per-token streaming loop is the cost, not retrieval.

For every token Groq streams, the Worker runs a JSON parse, a Zod schema check, a JSON stringify and a
separate SSE write to the browser: about 150 round trips for a 600-character answer.

## Changes

1. **Batch outgoing text** (`apps/api/src/lib/batch.ts`, used in `routes/chat.ts`): collect deltas and
   send one SSE `delta` event when 64 characters are waiting or 50 ms have passed since the last send,
   plus a final flush. The first piece goes out immediately (time to first word unchanged). The browser
   already reveals text smoothly (`useSmoothText`), so the batching is invisible. Pending text is
   flushed before an `error` event.
2. **Cheap chunk check** (`apps/api/src/lib/llm.ts`): replace the per-token Zod `safeParse` with a small
   type guard that reads `choices[0].delta.content` only if it is a string. Same validation outcome,
   far less work per token.
3. Unit tests for the batcher (size and time flushes, final flush, citation brackets across batches)
   and the existing `llm.test.ts` stays green.

No change to the API contract, the prompt, scoring or the UI.

## Acceptance criteria

- [x] `pnpm test` (50 tests), lint, typecheck pass
- [x] Answers still stream with citations (checked live with `pnpm run chat --url <live API>`; the local
      check was skipped because the change was verified directly on the live API)
- [x] Live (deployed with `pnpm deploy:api`): eval of the 11 answerable questions passes, and Workers
      Logs show model-answer CPU time clearly lower than the 24 ms median (11 ms median, see results)
- [x] Full live eval still 15/15 (plus 5/5 extra attack checks)

## Results (2026-11-21, live, Workers Logs)

Deployed version `3a389bfd`; 11 answerable questions through the live API with the cache cleared, so
every answer was a fresh model call.

| Model answers | Before (Phase 7 eval) | After |
| --- | --- | --- |
| Median CPU | 24 ms | **11 ms** |
| Range | 12–32 ms | **8–17 ms** |
| ~600-character answer | ~30 ms | 17 ms |
| Request outcomes | all ok | all ok (13/13) |
| Eval (11 answerable) | — | 11/11 |

Short and medium answers are now at or near the 10 ms guideline; the longest answers reach ~17 ms. The
remaining per-token cost is parsing each of Groq's verbose JSON chunks; a lighter line parse could trim
it further if needed (not done: diminishing returns, and the free plan tolerates occasional overage).
The ~8 ms floor on short answers is retrieval (embedding parse, search) plus prompt building.

## Risks

- If CPU stays high after batching, the remaining cost is JSON parsing Groq's verbose chunks; the next
  step would be a lighter parse of each line. Measured, not guessed.
