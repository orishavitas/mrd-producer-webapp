/**
 * RAG Agent for One-Pager Beta
 *
 * ingest(doc) — embeds a one-pager document and upserts into pgvector
 * retrieve(query, topK) — finds similar past documents by cosine similarity
 */

import { sql } from '@vercel/postgres';
import { embedText } from '@/lib/embeddings';

export interface IngestDoc {
  sessionId: string;
  productName: string;
  description: string;
  goal: string;
  useCases: string;
  mustHave: string[];
  niceToHave: string[];
  environments: string[];
  industries: string[];
}

export interface RetrievedDoc {
  sessionId: string;
  productName: string;
  mustHave: string[];
  niceToHave: string[];
  similarity: number;
}

export class RagAgent {
  /**
   * Embed a one-pager document and upsert into the vector store.
   * Safe to call multiple times for the same sessionId (upsert).
   */
  async ingest(doc: IngestDoc): Promise<void> {
    const contentText = [doc.description, doc.goal, doc.useCases]
      .filter(Boolean)
      .join('\n\n');

    if (contentText.length < 20) return; // not enough content to embed

    const embedding = await embedText(contentText);
    const embeddingStr = `[${embedding.join(',')}]`;

    const metadata = JSON.stringify({
      mustHave: doc.mustHave,
      niceToHave: doc.niceToHave,
      environments: doc.environments,
      industries: doc.industries,
    });

    await sql`
      INSERT INTO document_embeddings (session_id, product_name, content_text, embedding, metadata)
      VALUES (${doc.sessionId}, ${doc.productName}, ${contentText}, ${embeddingStr}::vector, ${metadata}::jsonb)
      ON CONFLICT (session_id) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        content_text = EXCLUDED.content_text,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        created_at = NOW()
    `;
  }

  /**
   * Retrieve the topK most similar past documents to the query text.
   * Returns empty array if the store is empty or unavailable.
   */
  async retrieve(query: string, topK = 5): Promise<RetrievedDoc[]> {
    if (!query || query.length < 10) return [];

    const embedding = await embedText(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await sql`
      SELECT
        session_id,
        product_name,
        metadata,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM document_embeddings
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `;

    return result.rows.map((row) => ({
      sessionId: row.session_id,
      productName: row.product_name ?? '',
      mustHave: row.metadata?.mustHave ?? [],
      niceToHave: row.metadata?.niceToHave ?? [],
      similarity: parseFloat(row.similarity),
    }));
  }
}

export const ragAgent = new RagAgent();
