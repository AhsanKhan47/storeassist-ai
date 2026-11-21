"use client";

// Test page for the website widget: loads the real public/widget.js on this page and reloads it
// whenever a setting changes, so the corner button always matches the snippet shown.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDetailsMode } from "../lib/details-mode.ts";
import { CopyIcon } from "./icons.tsx";

declare global {
  interface Window {
    StoreAssist?: { open(): void; close(): void; toggle(): void; destroy(): void };
  }
}

const LIVE_SCRIPT = "https://storeassist-ai.pages.dev/widget.js";
const DEFAULT_LABEL = "Chat with us";

const COLORS = [
  { name: "Blue", value: "#0a6cf0" },
  { name: "Pine", value: "#27493f" },
  { name: "Graphite", value: "#1d1d1f" },
  { name: "Amber", value: "#d9730d" },
] as const;
const DEFAULT_COLOR = COLORS[0].value;

type Position = "right" | "left";

function buildSnippet(color: string, position: Position, label: string): string {
  const attrs: string[] = [];
  if (color !== DEFAULT_COLOR) attrs.push(`data-color="${color}"`);
  if (position === "left") attrs.push('data-position="left"');
  const cleanLabel = label.trim();
  if (cleanLabel && cleanLabel !== DEFAULT_LABEL) {
    attrs.push(`data-label="${cleanLabel.replace(/"/g, "&quot;")}"`);
  }
  return `<script src="${LIVE_SCRIPT}"${attrs.map((a) => ` ${a}`).join("")} async></script>`;
}

export function WidgetPlayground() {
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [position, setPosition] = useState<Position>("right");
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [copied, setCopied] = useState(false);
  const details = useDetailsMode();

  // Load the widget with the current settings; reload it (debounced) when they change.
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll("script[data-playground]").forEach((node) => node.remove());
      const script = document.createElement("script");
      script.src = "/widget.js";
      script.async = true;
      script.dataset.color = color;
      script.dataset.position = position;
      script.dataset.label = label.trim() || DEFAULT_LABEL;
      script.dataset.playground = "true";
      document.body.appendChild(script);
    }, 250);
    return () => {
      clearTimeout(timer);
      window.StoreAssist?.destroy();
    };
  }, [color, position, label]);

  const snippet = buildSnippet(color, position, label);

  const copy = () => {
    void navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  };

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true">
        <span className="ambient__orb ambient__orb--1" />
        <span className="ambient__orb ambient__orb--2" />
        <span className="ambient__orb ambient__orb--3" />
        <span className="ambient__grain" />
      </div>

      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__tile" aria-hidden="true">
              TP
            </span>
            <div className="brand__text">
              <h1 className="brand__name">Website widget</h1>
              <p className="brand__sub">Add it to your website</p>
            </div>
          </div>
          <Link className="btn btn--glass" href="/">
            Back to the chat
          </Link>
        </div>
      </header>

      <main className="tw">
        <section className="tw-hero">
          <p className="hero__pill rise">
            <span className="hero__dot" aria-hidden="true" />
            The button in the corner is the live widget
          </p>
          <h2 className="tw-hero__title rise">Add this assistant to any website.</h2>
          <p className="hero__lead rise">
            One line of code gives a store a floating chat button with the same answers, sources and
            guardrails as the full page. Change the settings below and the corner button updates.
          </p>
        </section>

        <div className="tw-grid">
          <section className="group__card tw-card tw-card--wide" aria-labelledby="tw-snippet">
            <div className="tw-card__head">
              <h3 id="tw-snippet" className="tw-card__title">
                Snippet
              </h3>
              <button type="button" className="btn btn--glass" onClick={copy}>
                <CopyIcon className="btn__icon" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="tw-code">
              <code>{snippet}</code>
            </pre>
            <p className="tw-note">
              Paste it before <code>&lt;/body&gt;</code> on any page: Shopify, WordPress, Wix or
              your own app.
            </p>
          </section>

          <section className="group__card tw-card" aria-labelledby="tw-custom">
            <h3 id="tw-custom" className="tw-card__title">
              Customize
            </h3>

            <fieldset className="tw-field">
              <legend className="tw-label">Button color</legend>
              <div className="tw-swatches">
                {COLORS.map((c) => (
                  <label key={c.value} className="tw-swatch" title={c.name}>
                    <input
                      type="radio"
                      name="color"
                      value={c.value}
                      checked={color === c.value}
                      onChange={() => setColor(c.value)}
                    />
                    <span className="tw-swatch__dot" style={{ background: c.value }} />
                    <span className="sr-only">{c.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="tw-field">
              <legend className="tw-label">Corner</legend>
              <div className="tw-segment">
                {(["right", "left"] as const).map((side) => (
                  <label key={side} className="tw-segment__option">
                    <input
                      type="radio"
                      name="position"
                      value={side}
                      checked={position === side}
                      onChange={() => setPosition(side)}
                    />
                    <span>{side === "right" ? "Bottom right" : "Bottom left"}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="tw-field">
              <span className="tw-label">Button label (tooltip and screen readers)</span>
              <input
                className="tw-input"
                value={label}
                maxLength={60}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
          </section>

          <section className="group__card tw-card" aria-labelledby="tw-control">
            <h3 id="tw-control" className="tw-card__title">
              Open it from your own button
            </h3>
            <p className="tw-note">
              A site can open the chat from its own &ldquo;Help&rdquo; link with one call.
            </p>
            <div className="tw-actions">
              <button
                type="button"
                className="btn btn--glass"
                onClick={() => window.StoreAssist?.open()}
              >
                Open chat
              </button>
              <button
                type="button"
                className="btn btn--glass"
                onClick={() => window.StoreAssist?.close()}
              >
                Close chat
              </button>
            </div>
            <pre className="tw-code tw-code--small">
              <code>{"window.StoreAssist.open();\nwindow.StoreAssist.close();"}</code>
            </pre>
          </section>

          <section className="group__card tw-card tw-card--wide" aria-labelledby="tw-more">
            <h3 id="tw-more" className="tw-card__title">
              See it on other pages
            </h3>
            <div className="tw-links">
              <a className="try" href="/demo/">
                <span className="try__text">
                  <span className="try__q">Product page</span>
                  <span className="try__kind">A store product page with the chat installed</span>
                </span>
              </a>
              {details ? (
                <a className="try" href="/demo/hostile.html">
                  <span className="try__text">
                    <span className="try__q">Hostile CSS test</span>
                    <span className="try__kind">
                      A page whose styles reset and hide everything; the widget still works
                    </span>
                  </span>
                </a>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
