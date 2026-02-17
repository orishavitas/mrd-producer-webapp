/**
 * MRD Gap Agent
 *
 * AI-based gap detection for a single MRD section. Evaluates content against
 * section template and YAML gap_detection rules. Returns gaps and completeness score.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { getSectionById } from '@/lib/mrd/section-definitions';
import type { MRDGapInput, MRDGapOutput } from './types';
import type { Gap } from '@/app/mrd-generator/lib/mrd-state';
import { MRD_SECTION_IDS } from '@/app/mrd-generator/lib/mrd-state';

function generateId(): string {
  return `gap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class MRDGapAgent extends BaseAgent<MRDGapInput, MRDGapOutput> {
  readonly id = 'mrd-gap-agent';
  readonly name = 'MRD Gap Agent';
  readonly version = '1.0.0';
  readonly description =
    'AI-based gap detection for MRD sections using template rules';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'structuredOutput',
  ];

  validateInput(input: MRDGapInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    if (!input.sectionId || !MRD_SECTION_IDS.includes(input.sectionId)) {
      return { valid: false, errors: ['sectionId must be a valid MRD section id'] };
    }
    if (typeof input.content !== 'string') {
      return { valid: false, errors: ['content must be a string'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: MRDGapInput,
    context: ExecutionContext
  ): Promise<MRDGapOutput> {
    const { sectionId, content } = input;
    const provider = context.getProvider();
    const sectionDef = getSectionById(sectionId);

    if (!sectionDef?.gap_detection?.length) {
      const completeness = content.trim().length >= (sectionDef?.min_length ?? 0) ? 1 : 0;
      return { gaps: [], completeness };
    }

    const rules = sectionDef.gap_detection;
    const userPrompt = `Section: ${sectionDef.title} (id: ${sectionId})
Min length: ${sectionDef.min_length} chars. Required: ${sectionDef.required}

Current content:
"""
${content}
"""

Gap rules to check (answer with JSON only):
${JSON.stringify(rules.map((r) => ({ category: r.category, check: r.check, priority: r.priority, question: r.question })))}

Respond with JSON: { "gaps": [ { "category": "...", "description": "...", "priority": "high"|"medium"|"low", "suggestedQuestion": "..." } ], "completeness": 0.0 to 1.0 }
Include a gap for each rule that the content does NOT satisfy. completeness = 1 - (penalty per missing gap).`;

    const response = await provider.generateText(
      userPrompt,
      'You are an MRD quality analyst. Output only valid JSON.',
      { temperature: 0.2, responseFormat: 'json' }
    );

    let parsed: { gaps?: Array<{ category: string; description?: string; priority?: string; suggestedQuestion: string }>; completeness?: number };
    try {
      let text = response.text.trim();
      if (text.startsWith('```')) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline > 0) text = text.substring(firstNewline + 1);
        if (text.endsWith('```')) text = text.substring(0, text.lastIndexOf('```'));
        text = text.trim();
      }
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      const completeness = content.length >= sectionDef.min_length ? 0.8 : content.length / Math.max(sectionDef.min_length, 1);
      return { gaps: [], completeness: Math.min(1, completeness) };
    }

    const gaps: Gap[] = (parsed.gaps ?? []).map((g) => ({
      id: generateId(),
      category: g.category ?? 'General',
      description: g.description ?? g.suggestedQuestion ?? '',
      priority: (g.priority === 'high' || g.priority === 'medium' || g.priority === 'low' ? g.priority : 'medium') as Gap['priority'],
      suggestedQuestion: g.suggestedQuestion ?? g.description ?? '',
    }));

    let completeness = typeof parsed.completeness === 'number' ? parsed.completeness : 1 - gaps.length * 0.15;
    completeness = Math.max(0, Math.min(1, completeness));

    if (content.trim().length < sectionDef.min_length && !gaps.some((g) => g.category.toLowerCase().includes('length'))) {
      gaps.push({
        id: generateId(),
        category: 'Length',
        description: `Section should be at least ${sectionDef.min_length} characters`,
        priority: sectionDef.required ? 'high' : 'medium',
        suggestedQuestion: `Add more detail (min ${sectionDef.min_length} characters).`,
      });
      completeness = Math.min(completeness, 0.7);
    }

    return { gaps, completeness };
  }
}
