"use client";

import { useState, type CSSProperties } from "react";
import type { Source } from "@storeassist/shared";

/**
 * Excerpts are raw Markdown from the policy pages. Turn tables into "cell: cell" lines and list
 * dashes into bullets so they read cleanly.
 */
export function formatExcerpt(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line))
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean);
        return cells.length > 1 ? `${cells[0]}: ${cells.slice(1).join(", ")}` : (cells[0] ?? "");
      }
      return line.replace(/^(\s*)[-*] /, "$1• ").replace(/\*\*([^*]+)\*\*/g, "$1");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface SourcesProps {
  /** Id prefix that keeps aria-controls unique per message. */
  idPrefix: string;
  sources: Source[];
  openIndex: number | null;
  onToggle: (index: number) => void;
}

/** Source chips under an answer, plus an animated excerpt panel for whichever one is open. */
export function Sources({ idPrefix, sources, openIndex, onToggle }: SourcesProps) {
  const open = sources.find((s) => s.index === openIndex) ?? null;

  // Keep showing the last opened excerpt while the panel animates closed.
  const [shown, setShown] = useState<Source | null>(open);
  if (open && open !== shown) setShown(open);

  // Two chips from the same page need the section name to tell them apart.
  const titleCount = new Map<string, number>();
  for (const s of sources) titleCount.set(s.title, (titleCount.get(s.title) ?? 0) + 1);
  const labelFor = (s: Source) =>
    (titleCount.get(s.title) ?? 0) > 1 && s.heading ? `${s.title}: ${s.heading}` : s.title;

  const panelId = `${idPrefix}-excerpt`;

  return (
    <>
      <div className="sources" role="group" aria-label="Sources for this answer">
        {sources.map((source, i) => (
          <button
            key={source.index}
            type="button"
            className="chip"
            style={{ "--i": i } as CSSProperties}
            aria-expanded={openIndex === source.index}
            aria-controls={panelId}
            onClick={() => onToggle(source.index)}
          >
            <span className="chip__n">{source.index}</span>
            <span className="chip__label">{labelFor(source)}</span>
          </button>
        ))}
      </div>
      {shown ? (
        <div
          id={panelId}
          className={open ? "excerpt-wrap excerpt-wrap--open" : "excerpt-wrap"}
          aria-hidden={!open}
        >
          <div className="excerpt">
            <div className="excerpt__inner">
              <p className="excerpt__title">{shown.title}</p>
              {shown.heading ? <p className="excerpt__heading">{shown.heading}</p> : null}
              <p className="excerpt__body">{formatExcerpt(shown.excerpt)}</p>
              <p className="excerpt__score">Match score {shown.score.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
