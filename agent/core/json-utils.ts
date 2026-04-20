/**
 * Strips markdown code fences from AI-generated JSON and parses it safely.
 * AI models often wrap JSON in ```json ... ``` blocks.
 */
export function parseAIJson<T = unknown>(text: string): T {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch (err) {
    throw new Error(
      `AI JSON parse failed: ${err instanceof Error ? err.message : 'unknown'}\nRaw (first 200 chars): ${text.slice(0, 200)}`
    );
  }
}
