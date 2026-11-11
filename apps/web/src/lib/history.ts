// What the browser sends as conversation context. Pure, so it is easy to test later (Phase 6).
import { MAX_MESSAGE_CHARS, type ChatMessage } from "@storeassist/shared";

/** The pieces of a finished exchange that matter for context. */
export interface Exchange {
  question: string;
  answer: string;
  /** Only exchanges that finished are sent; failed or interrupted ones are left out. */
  finished: boolean;
}

/** How many earlier question/answer pairs to include (the API accepts at most 6 messages). */
const EARLIER_PAIRS = 2;

/** Cuts text to the API's per-message limit. */
export function clip(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= MAX_MESSAGE_CHARS ? trimmed : trimmed.slice(0, MAX_MESSAGE_CHARS).trim();
}

/** Last two finished exchanges plus the new question, with each message within the API limit. */
export function buildHistory(earlier: Exchange[], question: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const exchange of earlier.filter((e) => e.finished).slice(-EARLIER_PAIRS)) {
    const q = clip(exchange.question);
    const a = clip(exchange.answer);
    if (q && a) {
      messages.push({ role: "user", content: q }, { role: "assistant", content: a });
    }
  }
  messages.push({ role: "user", content: clip(question) });
  return messages;
}
