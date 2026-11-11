// Validates docs/*.md and eval/questions.json. Self-contained: Node built-ins only,
// so Node can run this file directly (no imports from workspace packages).
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const MIN_WORDS = 300;
const MAX_WORDS = 800;
const EXPECTED_DOCS = 15;
const EXPECTED_TYPES: Record<string, number> = {
  direct: 8,
  "two-document": 3,
  "not-covered": 3,
  injection: 1,
};

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

// --- documents ---------------------------------------------------------
const slugs = new Set<string>();
const files = readdirSync(docsDir)
  .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
  .sort();

if (files.length !== EXPECTED_DOCS) {
  fail(`expected ${EXPECTED_DOCS} documents in docs/, found ${files.length}`);
}

for (const file of files) {
  const text = readText(join(docsDir, file));
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    fail(`${file}: missing frontmatter block`);
    continue;
  }
  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv && kv[1]) meta[kv[1]] = (kv[2] ?? "").trim().replace(/^"(.*)"$/, "$1");
  }
  const body = match[2] ?? "";

  if (!meta.title) fail(`${file}: frontmatter needs a title`);
  if (!meta.slug) {
    fail(`${file}: frontmatter needs a slug`);
  } else {
    if (meta.slug !== file.replace(/\.md$/, "")) {
      fail(`${file}: slug "${meta.slug}" must match the file name`);
    }
    if (slugs.has(meta.slug)) fail(`${file}: duplicate slug "${meta.slug}"`);
    slugs.add(meta.slug);
  }

  // Count words; tokens with no letters or digits (table pipes, dashes) are skipped.
  const words = body.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  if (words < MIN_WORDS || words > MAX_WORDS) {
    fail(`${file}: ${words} words, expected ${MIN_WORDS}-${MAX_WORDS}`);
  }
  const headings = body.split("\n").filter((l) => l.startsWith("## ")).length;
  if (headings < 2) fail(`${file}: needs at least two "## " headings (has ${headings})`);

  console.log(`${file.padEnd(28)} ${String(words).padStart(4)} words  ${headings} headings`);
}

// --- questions ---------------------------------------------------------
interface Question {
  id?: number;
  type?: string;
  question?: string;
  expectedAnswer?: string;
  expectedSlugs?: string[];
  altSlugs?: string[];
  mustInclude?: string[];
  expectFallback?: boolean;
}

let questions: Question[] = [];
try {
  questions = JSON.parse(readText(join(root, "eval", "questions.json")));
} catch (err) {
  fail(`eval/questions.json: cannot read or parse (${String(err)})`);
}

if (questions.length !== 15) fail(`expected 15 questions, found ${questions.length}`);

const counts: Record<string, number> = {};
const ids = new Set<number>();
for (const q of questions) {
  const label = `question ${q.id ?? "?"}`;
  if (typeof q.id !== "number" || ids.has(q.id)) fail(`${label}: id missing or duplicated`);
  else ids.add(q.id);
  if (!q.question || !q.expectedAnswer) fail(`${label}: needs question and expectedAnswer`);
  if (!q.type || !(q.type in EXPECTED_TYPES)) {
    fail(`${label}: unknown type "${q.type}"`);
    continue;
  }
  counts[q.type] = (counts[q.type] ?? 0) + 1;

  const expected = q.expectedSlugs ?? [];
  for (const s of expected) if (!slugs.has(s)) fail(`${label}: unknown slug "${s}"`);
  if (q.type === "direct" && expected.length !== 1) fail(`${label}: direct needs exactly 1 slug`);
  if (q.type === "two-document" && expected.length < 2) fail(`${label}: needs 2 or more slugs`);
  if (q.type === "not-covered" && (expected.length !== 0 || q.expectFallback !== true)) {
    fail(`${label}: not-covered needs no slugs and expectFallback true`);
  }
  if (q.type === "injection" && q.expectFallback !== false) {
    fail(`${label}: injection is a refusal, so expectFallback must be false`);
  }
  if ((q.type === "direct" || q.type === "two-document") && q.expectFallback !== false) {
    fail(`${label}: answerable questions need expectFallback false`);
  }

  // Fields used by `pnpm eval` (scripts/lib/eval-score.ts).
  const answerable = q.type === "direct" || q.type === "two-document";
  const facts = q.mustInclude;
  if (answerable) {
    if (!Array.isArray(facts) || facts.length === 0) {
      fail(`${label}: answerable questions need a non-empty mustInclude list`);
    } else if (
      facts.some((f) => typeof f !== "string" || f.split("|").some((alt) => !alt.trim()))
    ) {
      fail(`${label}: mustInclude entries must be non-empty strings ("a|b" for alternatives)`);
    }
  } else if (facts !== undefined) {
    fail(`${label}: mustInclude is only used for direct and two-document questions`);
  }
  if (q.altSlugs !== undefined) {
    if (q.type !== "direct") fail(`${label}: altSlugs is only used for direct questions`);
    for (const s of q.altSlugs) if (!slugs.has(s)) fail(`${label}: unknown alt slug "${s}"`);
  }
}
for (const [type, n] of Object.entries(EXPECTED_TYPES)) {
  if ((counts[type] ?? 0) !== n)
    fail(`expected ${n} "${type}" questions, found ${counts[type] ?? 0}`);
}
console.log(`questions: ${questions.length} (${JSON.stringify(counts)})`);

// --- result ------------------------------------------------------------
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\ncheck:content passed");
