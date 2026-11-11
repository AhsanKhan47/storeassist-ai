import type { CSSProperties } from "react";
import { STORE_NAME } from "@storeassist/shared";
import { STARTERS } from "../lib/questions.ts";
import { ChevronIcon, TopicIcon } from "./icons.tsx";

/** Stagger index for the entrance animation. */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

export function Welcome({
  onAsk,
  disabled,
}: {
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <p className="hero__pill rise" style={order(0)}>
        <span className="hero__dot" aria-hidden="true" />
        Answers from 15 store policy pages
      </p>
      <h2 id="hero-title" className="hero__title rise" style={order(1)}>
        Ask about your order, delivery or returns.
      </h2>
      <p className="hero__lead rise" style={order(2)}>
        Every answer comes straight from {STORE_NAME}&rsquo;s policies and shows the page it came
        from.
      </p>
      <ul className="starters">
        {STARTERS.map((starter, i) => (
          <li key={starter.question} className="rise" style={order(3 + i)}>
            <button
              type="button"
              className="starter"
              disabled={disabled}
              onClick={() => onAsk(starter.question)}
            >
              <span className={`starter__icon tone-${starter.tone}`} aria-hidden="true">
                <TopicIcon icon={starter.icon} className="starter__glyph" />
              </span>
              <span className="starter__text">
                <span className="starter__topic">{starter.topic}</span>
                <span className="starter__q">{starter.question}</span>
              </span>
              <ChevronIcon className="starter__arrow" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
