// Parsing and chunking for docs/*.md. Pure functions, no network.

/** Bump when chunking changes, so `pnpm ingest` re-embeds every document. */
export const CHUNKER_VERSION = 1;

export interface ParsedDoc {
  slug: string;
  title: string;
  body: string;
}

export interface Chunk {
  index: number;
  heading: string | null;
  content: string;
}

export interface ChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
}

const CHARS_PER_TOKEN = 4;

export const normalizeNewlines = (text: string): string => text.replace(/\r\n/g, "\n");

/** Rough token count (characters / 4). Good enough to size chunks. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

export function parseDoc(raw: string, fileName: string): ParsedDoc {
  const text = normalizeNewlines(raw);
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${fileName}: missing frontmatter block`);
  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv?.[1]) meta[kv[1]] = (kv[2] ?? "").trim().replace(/^"(.*)"$/, "$1");
  }
  const { title, slug } = meta;
  if (!title || !slug) throw new Error(`${fileName}: frontmatter needs title and slug`);
  if (`${slug}.md` !== fileName)
    throw new Error(`${fileName}: slug "${slug}" must match the file name`);
  return { slug, title, body: match[2] ?? "" };
}

interface Section {
  heading: string | null;
  text: string;
}

/** Splits at "## " headings. Text before the first one is the introduction (heading null). */
function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, text: "" };
  for (const line of normalizeNewlines(body).split("\n")) {
    if (line.startsWith("# ")) continue; // document title; it is stored on the document row
    if (line.startsWith("## ")) {
      sections.push(current);
      current = { heading: line.slice(3).trim(), text: "" };
    } else {
      current.text += `${line}\n`;
    }
  }
  sections.push(current);
  return sections
    .map((s) => ({ heading: s.heading, text: s.text.trim() }))
    .filter((s) => s.text.length > 0 || s.heading !== null);
}

/** Breaks one block into pieces of at most `limit` characters, at line then word boundaries. */
function splitOversized(block: string, limit: number): string[] {
  if (block.length <= limit) return [block];
  const pieces: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) pieces.push(current.trim());
    current = "";
  };
  for (const word of block.split(/(?<=\n)|(?<= )/)) {
    if (current.length + word.length > limit) push();
    if (word.length > limit) {
      for (let i = 0; i < word.length; i += limit) pieces.push(word.slice(i, i + limit));
    } else {
      current += word;
    }
  }
  push();
  return pieces;
}

/** The last ~`chars` characters of a text, starting at a word boundary. */
function tail(text: string, chars: number): string {
  if (text.length <= chars) return text;
  const cut = text.slice(text.length - chars);
  const space = cut.indexOf(" ");
  return space >= 0 ? cut.slice(space + 1) : cut;
}

export function chunkDoc(body: string, options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? 500;
  const overlapTokens = options.overlapTokens ?? Math.min(50, Math.floor(maxTokens / 5));
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const chunks: Chunk[] = [];
  const add = (heading: string | null, content: string) =>
    chunks.push({ index: chunks.length, heading, content });

  for (const section of splitSections(body)) {
    const prefix = section.heading ? `## ${section.heading}\n\n` : "";
    const whole = `${prefix}${section.text}`.trim();
    if (whole.length <= maxChars) {
      add(section.heading, whole);
      continue;
    }

    // Long section: pack paragraphs (blank-line separated) into chunks, each starting with the
    // heading and carrying a short overlap from the previous chunk.
    const room = Math.max(40, maxChars - prefix.length - overlapChars - 4);
    const blocks = section.text
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean)
      .flatMap((b) => splitOversized(b, room));

    let parts: string[] = [];
    let overlap = "";
    const flush = () => {
      if (parts.length === 0) return;
      const bodyText = parts.join("\n\n");
      add(section.heading, `${prefix}${overlap ? `…${overlap}\n\n` : ""}${bodyText}`.trim());
      overlap = overlapChars > 0 ? tail(bodyText, overlapChars) : "";
      parts = [];
    };
    for (const block of blocks) {
      const used = parts.reduce((n, p) => n + p.length + 2, 0);
      if (parts.length > 0 && used + block.length > room) flush();
      parts.push(block);
    }
    flush();
  }
  return chunks;
}
