"use client";

import { RELEVANCE_CUTOFF, type ProviderName } from "@storeassist/shared";
import { useCountUp } from "../lib/motion.ts";
import { CHALLENGES } from "../lib/questions.ts";
import type { Turn } from "../lib/turns.ts";
import { ChevronIcon } from "./icons.tsx";

export interface SessionStats {
  questions: number;
  modelCalls: number;
  saved: number;
}

interface UnderTheHoodProps {
  id: string;
  open: boolean;
  last: Turn | null;
  stats: SessionStats;
  busy: boolean;
  onAsk: (question: string) => void;
  /** Closes the sheet on small screens. */
  onClose: () => void;
}

const PROVIDER_LABEL: Record<ProviderName, string> = {
  groq: "Groq",
  gemini: "Gemini",
  cerebras: "Cerebras",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <span className="kv__value">{value}</span>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <span className="stat__n">{shown}</span>
      <span className="stat__l">{label}</span>
    </div>
  );
}

function LastAnswer({ turn }: { turn: Turn }) {
  const top = turn.sources[0];
  const answeredBy = turn.isFallback
    ? "No model call"
    : turn.provider
      ? `${PROVIDER_LABEL[turn.provider]}${turn.cached ? " (saved)" : ""}`
      : "None";
  const fill = top ? Math.min(100, Math.round(top.score * 100)) : 0;

  return (
    <div className="group__card">
      <div className="match">
        <div className="match__head">
          <span>Closest match</span>
          <span className="match__score">
            {top ? top.score.toFixed(2) : `Below ${RELEVANCE_CUTOFF}`}
          </span>
        </div>
        <div className="meter" aria-hidden="true">
          <span className="meter__fill" style={{ width: `${fill}%` }} />
          <span className="meter__cut" style={{ left: `${RELEVANCE_CUTOFF * 100}%` }} />
        </div>
        <p className="meter__note">
          {turn.isFallback
            ? `Nothing reached the ${RELEVANCE_CUTOFF} cutoff, so the model was skipped.`
            : `Answers need a match of ${RELEVANCE_CUTOFF} or more.`}
        </p>
      </div>
      <Row label="Excerpts read" value={String(turn.sources.length)} />
      <Row label="Answered by" value={answeredBy} />
      <Row label="Saved answer" value={turn.cached ? "Yes" : "No"} />
      <Row label="Time" value={turn.ms === null ? "—" : `${(turn.ms / 1000).toFixed(1)} s`} />
    </div>
  );
}

export function UnderTheHood({ id, open, last, stats, busy, onAsk, onClose }: UnderTheHoodProps) {
  return (
    <aside id={id} className={open ? "hood hood--open" : "hood"} aria-label="Under the hood">
      <span className="hood__handle" aria-hidden="true" />
      <div className="hood__bar">
        <h2 className="hood__heading">Under the hood</h2>
        <button type="button" className="btn btn--glass" onClick={onClose}>
          Done
        </button>
      </div>

      <section className="group">
        <h3 className="group__title">Last answer</h3>
        {last ? (
          <LastAnswer turn={last} />
        ) : (
          <div className="group__card group__card--empty">
            <p className="group__empty">
              Ask a question to see how well the policies matched, which model wrote the reply and
              how long it took.
            </p>
          </div>
        )}
      </section>

      <section className="group">
        <h3 className="group__title">This session</h3>
        <div className="group__card stats">
          <Stat value={stats.questions} label="questions" />
          <Stat value={stats.modelCalls} label="model calls" />
          <Stat value={stats.saved} label="calls saved" />
        </div>
        <p className="group__foot">
          Free model quotas are limited, so repeat and off-topic questions skip the model.
        </p>
      </section>

      <section className="group">
        <h3 className="group__title">Try to break it</h3>
        <div className="group__card">
          {CHALLENGES.map((challenge) => (
            <button
              key={challenge.question}
              type="button"
              className="try"
              disabled={busy}
              onClick={() => onAsk(challenge.question)}
            >
              <span className="try__text">
                <span className="try__q">{challenge.question}</span>
                <span className="try__kind">{challenge.kind}</span>
              </span>
              <ChevronIcon className="try__arrow" />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
