"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_CHARS } from "@storeassist/shared";
import { ArrowUpIcon } from "./icons.tsx";

interface ComposerProps {
  /** Returns true if the question was accepted (so the box can clear). */
  onSend: (text: string) => boolean;
  busy: boolean;
}

const MAX_HEIGHT_PX = 150;

export function Composer({ onSend, busy }: ComposerProps) {
  const [text, setText] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT_PX)}px`;
  };

  const submit = () => {
    if (busy || text.trim() === "") return;
    if (onSend(text)) {
      setText("");
      if (fieldRef.current) fieldRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a line. Ignore Enter while an input method is composing.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const ready = !busy && text.trim() !== "";
  const nearLimit = text.length >= MAX_MESSAGE_CHARS - 80;

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <textarea
        id="question"
        ref={fieldRef}
        className="composer__field"
        rows={1}
        maxLength={MAX_MESSAGE_CHARS}
        placeholder="Ask about orders, returns, sizing"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        enterKeyHint="send"
      />
      {nearLimit ? (
        <span className="composer__count" aria-live="polite">
          {text.length}/{MAX_MESSAGE_CHARS}
        </span>
      ) : null}
      <button
        type="submit"
        className={ready ? "composer__send composer__send--ready" : "composer__send"}
        aria-label="Send question"
        disabled={!ready}
      >
        <ArrowUpIcon className="composer__icon" />
      </button>
    </form>
  );
}
