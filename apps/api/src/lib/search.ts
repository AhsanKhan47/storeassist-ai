// Vector search over the chunks table. Shared by the chat route and `pnpm run search`.
import { cosineDistance, eq, schema, sql, type Db } from "../db/client.ts";

export interface SearchHit {
  title: string;
  slug: string;
  heading: string | null;
  content: string;
  /** 1 - cosine distance: 1 means same meaning. */
  score: number;
}

export async function searchChunks(db: Db, vector: number[], limit: number): Promise<SearchHit[]> {
  const distance = cosineDistance(schema.chunks.embedding, vector);
  const rows = await db
    .select({
      title: schema.documents.title,
      slug: schema.documents.slug,
      heading: schema.chunks.heading,
      content: schema.chunks.content,
      score: sql<number>`1 - (${distance})`,
    })
    .from(schema.chunks)
    .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
    .orderBy(distance)
    .limit(limit);
  // The driver returns numeric expressions as strings.
  return rows.map((row) => ({ ...row, score: Number(row.score) }));
}

/** Chunk text without its "## heading" line, for display. */
export function chunkBody(content: string): string {
  return content.replace(/^## .*\n+/, "").trim();
}
