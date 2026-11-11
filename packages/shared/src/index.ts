export * from "./chat.ts";

export const STORE_NAME = "Tallow & Pine";

export type HealthResponse = { ok: true };

/**
 * Best search score needed to answer instead of falling back. From the Phase 3 measurements
 * (planning/plans/phase-3.md): answerable test questions scored >= 0.709, not-covered ones <= 0.638.
 * Phase 6 re-tunes it from the eval report.
 */
export const RELEVANCE_CUTOFF = 0.67;
