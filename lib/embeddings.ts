/**
 * Gemini text-embedding-004 wrapper.
 * Returns a 768-dimension float vector for the given text.
 */

const EMBEDDING_MODEL = 'text-embedding-004';
const GEMINI_EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}
