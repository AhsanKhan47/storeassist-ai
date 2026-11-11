"use client";

import { useState, type ReactNode } from "react";
import type { ProviderName, Source } from "@storeassist/shared";
import { useSmoothText } from "../lib/motion.ts";
import type { Turn } from "../lib/turns.ts";
import { AlertIcon, InfoIcon, RetryIcon } from "./icons.tsx";
import { Sources } from "./Sources.tsx";

const PROVIDER_LABEL: Record<ProviderName, string> = {
  groq: "Groq",
  gemini: "Gemini",
  cerebras: "Cerebras",
};

/** Hides a half-revealed "[1" or "**bold" at the end of smoothly revealed text. */
function tidyPartial(text: string): string {
  let out = text.replace(/\[\d{0,2}$/, "");
  if ((out.match(/\*\*/g) ?? []).length % 2 === 1) out = out.slice(0, out.lastIndexOf("**"));
  return out;
}

/** Turns "[2]" into a clickable badge (when that source exists) and "**x**" into bold text. */
function renderInline(
  text: string,
  sources: Source[],
  openIndex: number | null,
  onCite: (index: number) => void,
): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d{1,2}\])/g).map((part, i) => {
    const cite = /^\[(\d{1,2})\]$/.exec(part);
    if (cite) {
      const n = Number(cite[1]);
      if (sources.some((s) => s.index === n)) {
        return (
          <button
            key={i}
            type="button"
            className="cite"
            aria-label={`Source ${n}`}
            aria-expanded={openIndex === n}
            onClick={() => onCite(n)}
          >
            {n}
          </button>
        );
      }
      return part;
    }
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function metaLine(turn: Turn): string | null {
  if (turn.ms === null) return null;
  const time = `${(turn.ms / 1000).toFixed(1)} s`;
  if (turn.isFallback) return `No model needed, ${time}`;
  if (turn.cached) return `Saved answer, ${time}`;
  return turn.provider ? `Answered by ${PROVIDER_LABEL[turn.provider]} in ${time}` : time;
}

export function UserMessage({ turn }: { turn: Turn }) {
  return (
    <div className="turn turn--user">
      <p className="bubble bubble--user">{turn.content}</p>
    </div>
  );
}

interface AssistantMessageProps {
  turn: Turn;
  onRetry: (turnId: string) => void;
  retryDisabled: boolean;
}

export function AssistantMessage({ turn, onRetry, retryDisabled }: AssistantMessageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (index: number) => setOpenIndex((current) => (current === index ? null : index));

  const { text: smooth, settled } = useSmoothText(turn.content);
  const visible = tidyPartial(smooth);

  const streaming = turn.status === "streaming";
  const failed = turn.status === "error";
  const waiting = streaming && turn.content === "";
  const showCaret = !failed && visible.length > 0 && (streaming || !settled);

  // Chips show the sources the visible text cites. If a finished answer cites none, show the
  // closest one so every answer still points somewhere.
  const cited = new Set([...visible.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])));
  const citedSources = turn.sources.filter((s) => cited.has(s.index));
  const finished = turn.status === "done" && settled;
  const shownSources =
    citedSources.length === 0 && finished && !turn.isFallback
      ? turn.sources.slice(0, 1)
      : citedSources;

  const tone = failed ? "bubble--error" : turn.isFallback ? "bubble--note" : "bubble--bot";
  const meta = finished ? metaLine(turn) : null;

  return (
    <div className="turn turn--bot">
      {waiting ? (
        <div className="bubble bubble--bot bubble--status" role="status">
          <span className="status__orb" aria-hidden="true" />
          <span className="status__text">
            {turn.sources.length > 0 ? "Writing an answer" : "Searching the store policies"}
          </span>
        </div>
      ) : (
        <div className={`bubble ${tone}`}>
          {turn.isFallback || failed ? (
            <span className="bubble__icon" aria-hidden="true">
              {failed ? <AlertIcon /> : <InfoIcon />}
            </span>
          ) : null}
          <div className="bubble__body">
            {visible ? (
              <p className="bubble__text">
                {renderInline(visible, turn.sources, openIndex, toggle)}
                {showCaret ? <span className="caret" aria-hidden="true" /> : null}
              </p>
            ) : null}
            {failed && turn.failure ? (
              <>
                <p className="bubble__text">
                  {turn.content && !turn.failure.message.startsWith("The answer was interrupted")
                    ? "The answer was interrupted. "
                    : ""}
                  {turn.failure.message}
                </p>
                <button
                  type="button"
                  className="btn btn--retry"
                  disabled={retryDisabled}
                  onClick={() => onRetry(turn.id)}
                >
                  <RetryIcon className="btn__icon" />
                  Try again
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {shownSources.length > 0 ? (
        <Sources
          idPrefix={turn.id}
          sources={shownSources}
          openIndex={openIndex}
          onToggle={toggle}
        />
      ) : null}

      {meta ? (
        <p className="turn__meta">
          {turn.isFallback ? "Not in the store policies, so nothing was guessed. " : ""}
          {meta}
        </p>
      ) : null}
    </div>
  );
}
