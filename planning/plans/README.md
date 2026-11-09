# Phase sub-plans

One file per phase, written **before** building that phase and approved by Ahsan.

Name: `phase-N.md` (e.g. `phase-1.md`). Keep each under ~300 lines.

## Template

```markdown
# Phase N — <name>

Status: Draft | Approved | Done

## Goal
One or two sentences, copied from planning/PLAN.md and refined.

## Tasks
1. ...

## Files affected
- path/to/file — create | change | delete — why

## Acceptance criteria ("Done when")
- [ ] ...

## Tests
- Automated: ...
- Manual check for Ahsan: ...

## Risks / open questions
- ...
```

Phase 4's sub-plan also holds the **API spec**: `POST /api/chat` request and response shapes,
the SSE event format, error codes, and rate-limit behaviour.
