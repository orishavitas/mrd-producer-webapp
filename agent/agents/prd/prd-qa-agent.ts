/**
 * PRDQAAgent — Agent 4 in the PRD Producer pipeline.
 *
 * Input:  { frames: PRDFrame[], productName: string }
 * Output: QAReport — score (0–100) + per-section suggestions
 *
 * Calls AI with full assembled PRD text. Falls back to score=0 + error
 * suggestion if JSON parse fails.
 */
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { PRDFrame, QAReport } from './types';

export interface QAInput {
  frames: PRDFrame[];
  productName: string;
}

const SYSTEM_PROMPT = `You are a senior product manager reviewing a PRD for completeness and quality.
Score the PRD 0-100 and identify specific issues per section.
Return ONLY valid JSON — no markdown, no commentary.

JSON shape:
{
  "score": 85,
  "suggestions": [
    { "sectionKey": "overview", "note": "Missing competitive context" }
  ]
}`;

function stripMarkdown(text: string): string {
  return text.replace(/\`\`\`json?\s*/gi, '').replace(/\`\`\`/g, '').trim();
}

export class PRDQAAgent extends BaseAgent<QAInput, QAReport> {
  readonly id = 'prd-qa-agent';
  readonly name = 'PRD QA Agent';
  readonly version = '1.0.0';
  readonly description = 'Reviews full PRD draft and produces quality score + suggestions';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  validateInput(input: QAInput): ValidationResult {
    const errors: string[] = [];
    if (!input?.frames || !Array.isArray(input.frames) || input.frames.length === 0) {
      errors.push('frames must be a non-empty array');
    }
    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  protected async executeCore(input: QAInput, context: ExecutionContext): Promise<QAReport> {
    const fullPRD = input.frames
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((f) => `=== ${f.sectionKey.toUpperCase()} ===\n${f.content}`)
      .join('\n\n');

    const userPrompt = `Product: ${input.productName}\n\nFull PRD:\n${fullPRD}`;
    const provider = context.getProvider();
    const response = await provider.generateText(userPrompt, SYSTEM_PROMPT);

    try {
      const parsed = JSON.parse(stripMarkdown(response.text));
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score ?? 0))),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      return { score: 0, suggestions: [{ sectionKey: 'general', note: 'QA review failed to parse' }] };
    }
  }
}
