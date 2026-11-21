import { describe, expect, it } from "vitest";
import { createDeltaBatcher } from "./batch.ts";

function setup(options: { maxChars?: number; maxMs?: number } = {}) {
  let clock = 1_000;
  const sent: string[] = [];
  const batcher = createDeltaBatcher(
    async (text) => {
      sent.push(text);
    },
    { ...options, now: () => clock },
  );
  return {
    batcher,
    sent,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("createDeltaBatcher", () => {
  it("sends the first piece immediately, so the first words are not delayed", async () => {
    const { batcher, sent } = setup();
    await batcher.push("Hello");
    expect(sent).toEqual(["Hello"]);
  });

  it("holds small pieces that arrive quickly and sends them together", async () => {
    const { batcher, sent, advance } = setup({ maxChars: 64, maxMs: 50 });
    await batcher.push("A");
    advance(5);
    await batcher.push(" short");
    advance(5);
    await batcher.push(" answer");
    expect(sent).toEqual(["A"]);
    await batcher.flush();
    expect(sent).toEqual(["A", " short answer"]);
  });

  it("sends when enough characters are waiting", async () => {
    const { batcher, sent } = setup({ maxChars: 10, maxMs: 10_000 });
    await batcher.push("first");
    await batcher.push("12345");
    await batcher.push("67890");
    expect(sent).toEqual(["first", "1234567890"]);
  });

  it("sends when enough time has passed", async () => {
    const { batcher, sent, advance } = setup({ maxChars: 1_000, maxMs: 50 });
    await batcher.push("one");
    advance(10);
    await batcher.push(" two");
    expect(sent).toEqual(["one"]);
    advance(60);
    await batcher.push(" three");
    expect(sent).toEqual(["one", " two three"]);
  });

  it("loses nothing: everything pushed is sent, in order, after the final flush", async () => {
    const { batcher, sent, advance } = setup({ maxChars: 7, maxMs: 30 });
    const pieces = ["Sale ", "items ", "are ", "exchange ", "only ", "[1]", "."];
    for (const piece of pieces) {
      await batcher.push(piece);
      advance(4);
    }
    await batcher.flush();
    expect(sent.join("")).toBe(pieces.join(""));
  });

  it("does nothing for empty pieces or an empty flush", async () => {
    const { batcher, sent } = setup();
    await batcher.push("");
    await batcher.flush();
    expect(sent).toEqual([]);
  });
});
