import { describe, expect, it } from "vitest";
import { chunkDoc, estimateTokens, parseDoc } from "./chunk.ts";

const doc = (body: string) =>
  `---\ntitle: Returns and exchanges\nslug: returns-exchanges\n---\n${body}`;

describe("parseDoc", () => {
  it("reads title, slug and body from the frontmatter", () => {
    const parsed = parseDoc(doc("# Returns\n\nIntro text."), "returns-exchanges.md");
    expect(parsed.title).toBe("Returns and exchanges");
    expect(parsed.slug).toBe("returns-exchanges");
    expect(parsed.body).toContain("Intro text.");
  });

  it("accepts Windows line endings", () => {
    const raw = doc("Intro.").replace(/\n/g, "\r\n");
    expect(parseDoc(raw, "returns-exchanges.md").slug).toBe("returns-exchanges");
  });

  it("rejects a file without frontmatter", () => {
    expect(() => parseDoc("# Title\n\nNo frontmatter.", "x.md")).toThrow(/frontmatter/);
  });

  it("rejects a slug that does not match the file name", () => {
    expect(() => parseDoc(doc("Body."), "refunds.md")).toThrow(/must match the file name/);
  });
});

describe("chunkDoc", () => {
  const body = [
    "# Returns and exchanges",
    "",
    "We want you to be happy with your order.",
    "",
    "## The 14-day return window",
    "",
    "You can return an item within 14 days of delivery.",
    "",
    "## Sale items",
    "",
    "Sale items are exchange only.",
  ].join("\n");

  it("makes the introduction its own chunk with no heading and drops the title line", () => {
    const [intro] = chunkDoc(body);
    expect(intro?.heading).toBeNull();
    expect(intro?.content).toBe("We want you to be happy with your order.");
  });

  it("makes one chunk per ## section, starting with the heading", () => {
    const chunks = chunkDoc(body);
    expect(chunks.map((c) => c.heading)).toEqual([null, "The 14-day return window", "Sale items"]);
    expect(chunks[1]?.content.startsWith("## The 14-day return window\n\n")).toBe(true);
    expect(chunks.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("splits a long section under the token limit, repeating the heading and carrying overlap", () => {
    const paragraphs = Array.from(
      { length: 8 },
      (_, i) =>
        `Paragraph ${i + 1} explains one more rule about returning items in good condition.`,
    );
    const long = `## Conditions\n\n${paragraphs.join("\n\n")}`;
    const chunks = chunkDoc(long, { maxTokens: 60 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.heading).toBe("Conditions");
      expect(chunk.content.startsWith("## Conditions\n\n")).toBe(true);
      expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(60);
    }
    // Every chunk after the first starts its body with an overlap marker from the previous chunk.
    for (const chunk of chunks.slice(1)) expect(chunk.content).toContain("…");
    // Nothing is lost: every paragraph appears somewhere.
    const all = chunks.map((c) => c.content).join("\n");
    for (const p of paragraphs) expect(all).toContain(p.slice(0, 20));
  });
});
