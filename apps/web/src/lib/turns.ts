import type { ProviderName, Source } from "@storeassist/shared";
import type { Exchange } from "./history.ts";
import type { FailureKind } from "./chat-client.ts";

/** One message in the conversation. A question and its answer are two turns in a row. */
export interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  sources: Source[];
  isFallback: boolean;
  cached: boolean;
  provider: ProviderName | null;
  /** Milliseconds from sending to the last word. */
  ms: number | null;
  failure: { kind: FailureKind; message: string } | null;
}

export function newTurn(role: Turn["role"], content: string, status: Turn["status"]): Turn {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    status,
    sources: [],
    isFallback: false,
    cached: false,
    provider: null,
    ms: null,
    failure: null,
  };
}

/** Pairs the flat list of turns back into question/answer exchanges. */
export function exchangesOf(turns: Turn[]): Exchange[] {
  const exchanges: Exchange[] = [];
  for (let i = 0; i + 1 < turns.length; i += 2) {
    const question = turns[i];
    const answer = turns[i + 1];
    if (!question || !answer) continue;
    exchanges.push({
      question: question.content,
      answer: answer.content,
      finished: answer.status === "done",
    });
  }
  return exchanges;
}
