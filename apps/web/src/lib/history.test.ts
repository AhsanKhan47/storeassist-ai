import { describe, expect, it } from "vitest";
import { buildHistory, clip, type Exchange } from "./history.ts";

const done = (question: string, answer: string): Exchange => ({ question, answer, finished: true });

describe("buildHistory", () => {
  it("sends just the question when there is no history", () => {
    expect(buildHistory([], "Can I pay in installments?")).toEqual([
      { role: "user", content: "Can I pay in installments?" },
    ]);
  });

  it("keeps only the last two finished exchanges, oldest first, question last", () => {
    const history = buildHistory([done("Q1", "A1"), done("Q2", "A2"), done("Q3", "A3")], "Q4");
    expect(history.map((m) => m.content)).toEqual(["Q2", "A2", "Q3", "A3", "Q4"]);
    expect(history.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant", "user"]);
  });

  it("leaves out exchanges that failed or were interrupted", () => {
    const history = buildHistory(
      [done("Q1", "A1"), { question: "Q2", answer: "partial", finished: false }],
      "Q3",
    );
    expect(history.map((m) => m.content)).toEqual(["Q1", "A1", "Q3"]);
  });

  it("stays within the API limits: at most 6 messages of at most 500 characters", () => {
    const long = "x".repeat(900);
    const history = buildHistory([done("Q1", long), done("Q2", long), done("Q3", long)], long);
    expect(history.length).toBeLessThanOrEqual(6);
    for (const message of history) expect(message.content.length).toBeLessThanOrEqual(500);
  });
});

describe("clip", () => {
  it("trims and cuts text to 500 characters", () => {
    expect(clip("  hello  ")).toBe("hello");
    expect(clip("a".repeat(600))).toHaveLength(500);
  });
});
