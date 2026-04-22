/**
 * Shared utilities for PRD agent pipeline
 */

export function stripMarkdown(text: string): string {
  return text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
}
