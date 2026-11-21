"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { STORE_NAME, type ChatMessage } from "@storeassist/shared";
import { ChatFailure, streamAnswer } from "../lib/chat-client.ts";
import { DetailsContext, useDetailsMode } from "../lib/details-mode.ts";
import { buildHistory } from "../lib/history.ts";
import { exchangesOf, newTurn, type Turn } from "../lib/turns.ts";
import { Composer } from "./Composer.tsx";
import { CloseIcon, ComposeIcon, PanelIcon } from "./icons.tsx";
import { AssistantMessage, UserMessage } from "./Message.tsx";
import { UnderTheHood, type SessionStats } from "./UnderTheHood.tsx";
import { Welcome } from "./Welcome.tsx";

const HOOD_ID = "under-the-hood";
const NEAR_BOTTOM_PX = 200;

/** Message the embed page sends to the page hosting the widget (public/widget.js). */
const CLOSE_MESSAGE = { type: "storeassist:close" } as const;

function closeWidget() {
  // Carries no data, so any target origin is safe; widget.js checks where it came from.
  if (window.parent !== window) window.parent.postMessage(CLOSE_MESSAGE, "*");
}

/** "page": the full site. "embed": the compact chat shown inside the website widget. */
export type ChatVariant = "page" | "embed";

export function Chat({ variant = "page" }: { variant?: ChatVariant }) {
  const embed = variant === "embed";
  // Developer view (?details=1 or #details): side panel, model and timing lines, match scores.
  // Never inside the widget.
  const detailsRequested = useDetailsMode();
  const details = detailsRequested && !embed;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [hoodOpen, setHoodOpen] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ questions: 0, modelCalls: 0, saved: 0 });

  const abortRef = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow the conversation down, unless the reader has scrolled up to re-read something.
  useEffect(() => {
    const onScroll = () => {
      const distance =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      stickToBottom.current = distance < NEAR_BOTTOM_PX;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Whenever the thread grows (new bubble, or text revealing smoothly), keep the newest line in view.
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const observer = new ResizeObserver(() => {
      // Only once a conversation exists; the landing screen stays at the top.
      if (stickToBottom.current && thread.querySelector(".turn")) {
        window.scrollTo({ top: document.documentElement.scrollHeight });
      }
    });
    observer.observe(thread);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hoodOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHoodOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hoodOpen]);

  // Inside the widget, Escape closes the panel (keys pressed in the iframe never reach the host page).
  useEffect(() => {
    if (!embed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWidget();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embed]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Streams one answer into the assistant turn `botId`. */
  const run = useCallback(async (botId: string, history: ChatMessage[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    let cached = false;
    let fallback = false;

    const patch = (changes: Partial<Turn>) =>
      setTurns((prev) => prev.map((t) => (t.id === botId ? { ...t, ...changes } : t)));

    try {
      await streamAnswer(
        history,
        {
          onMeta: (meta) => {
            cached = meta.cached;
            fallback = meta.isFallback;
            patch({ sources: meta.sources, isFallback: meta.isFallback, cached: meta.cached });
          },
          onDelta: (text) =>
            setTurns((prev) =>
              prev.map((t) => (t.id === botId ? { ...t, content: t.content + text } : t)),
            ),
          onDone: (provider) => {
            patch({
              status: "done",
              provider,
              ms: Math.round(performance.now() - started),
            });
            const skippedModel = cached || fallback || provider === null;
            setStats((s) => ({
              ...s,
              modelCalls: s.modelCalls + (skippedModel ? 0 : 1),
              // Cached answers, fallbacks and small-talk replies all skipped the model.
              saved: s.saved + (skippedModel ? 1 : 0),
            }));
          },
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const failure =
        err instanceof ChatFailure
          ? err
          : new ChatFailure("internal", "Something went wrong. Please try again.");
      patch({ status: "error", failure: { kind: failure.kind, message: failure.message } });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }, []);

  const send = useCallback(
    (raw: string): boolean => {
      const text = raw.trim();
      if (!text || busy) return false;
      const user = newTurn("user", text, "done");
      const bot = newTurn("assistant", "", "streaming");
      const history = buildHistory(exchangesOf(turns), text);
      stickToBottom.current = true;
      setHoodOpen(false);
      setTurns((prev) => [...prev, user, bot]);
      setStats((s) => ({ ...s, questions: s.questions + 1 }));
      setBusy(true);
      void run(bot.id, history);
      return true;
    },
    [busy, turns, run],
  );

  const retry = useCallback(
    (botId: string) => {
      const index = turns.findIndex((t) => t.id === botId);
      const user = turns[index - 1];
      if (busy || index < 1 || !user) return;
      const history = buildHistory(exchangesOf(turns.slice(0, index - 1)), user.content);
      stickToBottom.current = true;
      setTurns((prev) =>
        prev.map((t) =>
          t.id === botId
            ? {
                ...newTurn("assistant", "", "streaming"),
                id: botId,
              }
            : t,
        ),
      );
      setBusy(true);
      void run(botId, history);
    },
    [busy, turns, run],
  );

  const newChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTurns([]);
    setBusy(false);
    setHoodOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const last =
    [...turns].reverse().find((t) => t.role === "assistant" && t.status === "done") ?? null;

  const thread = (
    <div ref={threadRef} className="thread" role="log" aria-label="Conversation" aria-live="polite">
      {turns.length === 0 ? (
        <Welcome onAsk={send} disabled={busy} compact={embed} />
      ) : (
        turns.map((turn) =>
          turn.role === "user" ? (
            <UserMessage key={turn.id} turn={turn} />
          ) : (
            <AssistantMessage key={turn.id} turn={turn} onRetry={retry} retryDisabled={busy} />
          ),
        )
      )}
    </div>
  );

  const ambient = (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__orb ambient__orb--1" />
      <span className="ambient__orb ambient__orb--2" />
      <span className="ambient__orb ambient__orb--3" />
      <span className="ambient__grain" />
    </div>
  );

  if (embed) {
    return (
      <div className="app app--embed">
        {ambient}
        <header className="embed-bar">
          <div className="brand">
            <span className="brand__tile brand__tile--small" aria-hidden="true">
              TP
            </span>
            <div className="brand__text">
              <h1 className="brand__name brand__name--small">{STORE_NAME}</h1>
              <p className="brand__sub">Answers from our store policies</p>
            </div>
          </div>
          <div className="embed-bar__actions">
            <button
              type="button"
              className="icon-btn"
              disabled={turns.length === 0}
              onClick={newChat}
              aria-label="New chat"
              title="New chat"
            >
              <ComposeIcon className="icon-btn__icon" />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={closeWidget}
              aria-label="Close chat"
              title="Close"
            >
              <CloseIcon className="icon-btn__icon" />
            </button>
          </div>
        </header>
        <main className="chat chat--embed">
          {thread}
          <div className="composer-wrap">
            <Composer onSend={send} busy={busy} autoFocus />
          </div>
        </main>
      </div>
    );
  }

  return (
    <DetailsContext.Provider value={details}>
      <div className="app">
        {ambient}

        {details ? (
          <div className="notice">
            Developer view: match scores, models and timings are shown.{" "}
            <Link href="/try-widget?details=1">Website widget</Link>
          </div>
        ) : null}

        <header className="topbar">
          <div className="topbar__inner">
            <div className="brand">
              <span className="brand__tile" aria-hidden="true">
                TP
              </span>
              <div className="brand__text">
                <h1 className="brand__name">
                  {STORE_NAME}
                  <span className="brand__help"> Help</span>
                </h1>
                <p className="brand__sub">Answers from our store policies</p>
              </div>
            </div>
            <div className="topbar__actions">
              {details ? (
                <button
                  type="button"
                  className="btn btn--glass topbar__info"
                  aria-expanded={hoodOpen}
                  aria-controls={HOOD_ID}
                  onClick={() => setHoodOpen((open) => !open)}
                  aria-label="Details"
                >
                  <PanelIcon className="btn__icon" />
                  <span className="btn__label">Details</span>
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--glass"
                disabled={turns.length === 0}
                onClick={newChat}
                aria-label="New chat"
              >
                <ComposeIcon className="btn__icon" />
                <span className="btn__label">New chat</span>
              </button>
            </div>
          </div>
        </header>

        <div className={details ? "layout" : "layout layout--solo"}>
          <main className="chat">
            {thread}
            <div className="composer-wrap">
              <Composer onSend={send} busy={busy} />
              <p className="composer-hint">
                Answers come only from the store&rsquo;s policies, with a source for each.
              </p>
            </div>
          </main>

          {details ? (
            <>
              <div
                className={hoodOpen ? "scrim scrim--open" : "scrim"}
                aria-hidden="true"
                onClick={() => setHoodOpen(false)}
              />
              <UnderTheHood
                id={HOOD_ID}
                open={hoodOpen}
                last={last}
                stats={stats}
                busy={busy}
                onAsk={send}
                onClose={() => setHoodOpen(false)}
              />
            </>
          ) : null}
        </div>
      </div>
    </DetailsContext.Provider>
  );
}
