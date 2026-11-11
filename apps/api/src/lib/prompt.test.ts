import { describe, expect, it } from "vitest";
import type { Source } from "@storeassist/shared";
import {
  FALLBACK_ANSWER,
  buildMessages,
  normalizeCitations,
  normalizeQuestion,
  shouldFallback,
} from "./prompt.ts";

const sources: Source[] = [
  {
    index: 1,
    title: "Returns and exchanges",
    slug: "returns-exchanges",
    heading: "Sale items are exchange only",
    excerpt: "Sale items can be exchanged but not refunded.",
    score: 0.73,
  },
  {
    index: 2,
    title: "Refunds",
    slug: "refunds",
    heading: null,
    excerpt: "Gift card orders are refunded as store credit.",
    score: 0.7,
  },
];

describe("shouldFallback", () => {
  it("falls back below the 0.67 cutoff and answers at or above it", () => {
    expect(shouldFallback(0.669)).toBe(true);
    expect(shouldFallback(0.67)).toBe(false);
    expect(shouldFallback(0.8)).toBe(false);
  });

  it("falls back when there is no match at all", () => {
    expect(shouldFallback(undefined)).toBe(true);
  });

  it("has a fallback text with the contact details", () => {
    expect(FALLBACK_ANSWER).toMatch(/\(503\) 555-0142/);
    expect(FALLBACK_ANSWER).toMatch(/support@tallowandpine\.example/);
  });
});

describe("buildMessages", () => {
  it("puts numbered excerpts with page and section in the system message", () => {
    const [system] = buildMessages(
      [{ role: "user", content: "Can I return a sale item?" }],
      sources,
    );
    expect(system?.role).toBe("system");
    expect(system?.content).toContain("[1] (Returns and exchanges > Sale items are exchange only)");
    expect(system?.content).toContain("[2] (Refunds)");
    expect(system?.content).toContain("Gift card orders are refunded as store credit.");
  });

  it("sends a single question as the only user message", () => {
    const messages = buildMessages(
      [{ role: "user", content: "Can I return a sale item?" }],
      sources,
    );
    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(messages[1]?.content).toBe("Can I return a sale item?");
  });

  it("folds earlier turns into one user message and marks old replies as possibly wrong", () => {
    const messages = buildMessages(
      [
        { role: "user", content: "What is the return window?" },
        { role: "assistant", content: "It is 60 days." },
        { role: "user", content: "So 45 days is fine?" },
      ],
      sources,
    );
    expect(messages.map((m) => m.role)).toEqual(["system", "user", "user"]);
    expect(messages.some((m) => m.role === "assistant")).toBe(false);
    expect(messages[1]?.content).toContain("Customer: What is the return window?");
    expect(messages[1]?.content).toContain("Assistant (may be inaccurate): It is 60 days.");
    expect(messages[2]?.content).toBe("So 45 days is fine?");
  });

  it("refuses to build a prompt when the last message is not from the user", () => {
    expect(() => buildMessages([{ role: "assistant", content: "Hi" }], sources)).toThrow();
  });
});

describe("normalizers", () => {
  it("normalizes questions for the cache key", () => {
    expect(normalizeQuestion("  Can I   RETURN it?? ")).toBe("can i return it");
    expect(normalizeQuestion("Do you sell shoes?")).toBe(normalizeQuestion("do you sell shoes"));
  });

  it("turns full-width citation brackets into plain ones", () => {
    expect(normalizeCitations("Exchange only【1】【2】.")).toBe("Exchange only[1][2].");
    expect(normalizeCitations("No citations.")).toBe("No citations.");
  });
});
