// Collects streamed text and sends it in small batches instead of one event per token.
// Fewer SSE writes and JSON encodes per answer keep Worker CPU time down; the browser reveals
// text smoothly anyway, so the batching is invisible to the reader.

export interface BatchOptions {
  /** Send as soon as this many characters are waiting. */
  maxChars?: number;
  /** Send if this long has passed since the last send. */
  maxMs?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

export interface DeltaBatcher {
  /** Adds text; sends a batch when it is big enough or old enough. */
  push(text: string): Promise<void>;
  /** Sends whatever is still waiting. */
  flush(): Promise<void>;
}

export function createDeltaBatcher(
  send: (text: string) => Promise<void>,
  { maxChars = 64, maxMs = 50, now = Date.now }: BatchOptions = {},
): DeltaBatcher {
  let pending = "";
  // Starts far in the past so the very first piece goes out immediately.
  let lastSent = Number.NEGATIVE_INFINITY;

  const flush = async () => {
    if (!pending) return;
    const text = pending;
    pending = "";
    lastSent = now();
    await send(text);
  };

  return {
    async push(text: string) {
      if (!text) return;
      pending += text;
      if (pending.length >= maxChars || now() - lastSent >= maxMs) await flush();
    },
    flush,
  };
}
