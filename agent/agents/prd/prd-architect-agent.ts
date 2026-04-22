/**
 * PRDArchitectAgent — Agent 2 in the PRD Producer pipeline.
 *
 * Input:  { summary: OnePagerSummary }
 * Output: PRDSkeleton — array of 8 PRDSkeletonSection entries
 *
 * Calls AI to generate per-section writing strategies. Falls back to
 * default skeleton from YAML config if JSON parse fails.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { loadPRDSections } from '@/lib/prd-sections-loader';
import { OnePagerSummary, PRDSkeleton, PRDSkeletonSection } from './types';

export interface ArchitectInput {
  summary: OnePagerSummary;
}

const SYSTEM_PROMPT = `You are a senior product manager at Compulocks. Given a product summary,
generate a PRD skeleton — one entry per section defining HOW each section should be written.
Return ONLY a JSON array — no markdown, no commentary.

JSON shape:
[
  {
    "sectionKey": "overview",
    "sectionTitle": "1. Overview",
    "strategy": "One sentence describing the writing strategy for this section",
    "writingDirective": "Specific instructions for the writer agent"
  }
]`;

function stripMarkdown(text: string): string {
  return text.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
}

export class PRDArchitectAgent extends BaseAgent<ArchitectInput, PRDSkeleton> {
  readonly id = 'prd-architect-agent';
  readonly name = 'PRD Architect Agent';
  readonly version = '1.0.0';
  readonly description = 'Generates PRD skeleton with per-section writing strategies';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  validateInput(input: ArchitectInput): ValidationResult {
    if (!input?.summary || typeof input.summary !== 'object') {
      return { valid: false, errors: ['summary is required'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: ArchitectInput,
    context: ExecutionContext
  ): Promise<PRDSkeleton> {
    const sections = loadPRDSections();
    const sectionList = sections.map((s) => `${s.key}: ${s.title}`).join('\n');

    const userPrompt = `Product: ${input.summary.productName}
Description: ${input.summary.description}
Goals: ${input.summary.goal}
Use cases: ${input.summary.useCases}
Target environments: ${input.summary.environments.join(', ')}
Industries: ${input.summary.industries.join(', ')}
Audience: ${input.summary.audience.join(', ')}
Must-have features: ${input.summary.mustHaveFeatures.join(', ')}
Nice-to-have features: ${input.summary.niceToHaveFeatures.join(', ')}
MOQ: ${input.summary.moq}
Target price: ${input.summary.targetPrice}
Competitors: ${input.summary.competitors.map((c) => `${c.brand} ${c.productName}`).join(', ') || 'none'}

Generate skeleton for these 8 sections:
${sectionList}`;

    const provider = context.getProvider();
    const response = await provider.generateText(userPrompt, SYSTEM_PROMPT);
    const cleaned = stripMarkdown(response.text);

    let skeleton: PRDSkeletonSection[];
    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
      skeleton = parsed;
    } catch {
      // Fallback to default skeleton from YAML config
      skeleton = sections.map((s) => ({
        sectionKey: s.key,
        sectionTitle: s.title,
        strategy: `Write ${s.title} based on product data`,
        writingDirective: s.systemPrompt.slice(0, 200),
      }));
    }

    return skeleton;
  }
}
