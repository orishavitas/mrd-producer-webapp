/**
 * Batch MRD Agent
 *
 * Extracts all 12 MRD sections (or enabled subset) from a product concept
 * in a single AI call. Returns narrative content per section and a suggested
 * document name (3-4 words) for export filename.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { getEnabledSections } from '@/lib/mrd/section-definitions';
import type { BatchMRDInput, BatchMRDOutput } from './types';
import type { MRDSection } from '@/app/mrd-generator/lib/mrd-state';

export class BatchMRDAgent extends BaseAgent<BatchMRDInput, BatchMRDOutput> {
  readonly id = 'batch-mrd-agent';
  readonly name = 'Batch MRD Agent';
  readonly version = '1.0.0';
  readonly description =
    'Extracts all MRD sections from product concept in one AI call';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'structuredOutput',
  ];

  validateInput(input: BatchMRDInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    if (!input.concept || typeof input.concept !== 'string') {
      return { valid: false, errors: ['concept must be a non-empty string'] };
    }
    if (input.concept.trim().length < 50) {
      return {
        valid: false,
        errors: ['concept must be at least 50 characters'],
      };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: BatchMRDInput,
    context: ExecutionContext
  ): Promise<BatchMRDOutput> {
    const { concept } = input;
    const provider = context.getProvider();
    const sections = getEnabledSections();

    context.log('info', `[${this.id}] Batch extracting ${sections.length} sections`, {
      conceptLength: concept.length,
    });

    const systemPrompt = this.buildSystemPrompt(sections);
    const userPrompt = this.buildUserPrompt(concept, sections);

    const response = await provider.generateText(userPrompt, systemPrompt, {
      temperature: 0.3,
      responseFormat: 'json',
    });

    let parsed: Record<string, unknown>;
    try {
      let text = response.text.trim();
      if (text.startsWith('```')) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline > 0) text = text.substring(firstNewline + 1);
        if (text.endsWith('```')) text = text.substring(0, text.lastIndexOf('```'));
        text = text.trim();
      }
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      context.log('error', `[${this.id}] Failed to parse JSON`, {
        error,
        preview: response.text.substring(0, 300),
      });
      throw new Error('Failed to parse AI response as JSON');
    }

    const result: BatchMRDOutput = {
      sections: {},
    };

    const suggestedName = parsed.suggestedDocumentName;
    if (typeof suggestedName === 'string' && suggestedName.trim()) {
      result.suggestedDocumentName = suggestedName.trim().replace(/\s+/g, '-');
    }

    for (const sectionDef of sections) {
      const raw = parsed[sectionDef.id];
      if (raw && typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>;
        const content = typeof obj.content === 'string' ? obj.content : '';
        const subsections: Record<string, { content: string }> = {};
        if (sectionDef.subsections && typeof obj.subsections === 'object' && obj.subsections !== null) {
          for (const sub of sectionDef.subsections) {
            if (sub.enabled === false) continue;
            const subRaw = (obj.subsections as Record<string, unknown>)[sub.id];
            if (typeof subRaw === 'object' && subRaw !== null && typeof (subRaw as Record<string, unknown>).content === 'string') {
              subsections[sub.id] = { content: (subRaw as Record<string, string>).content };
            }
          }
        }
        result.sections[sectionDef.id as MRDSection] = {
          content,
          ...(Object.keys(subsections).length > 0 ? { subsections } : {}),
          confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined,
        };
      }
    }

    context.log('info', `[${this.id}] Batch extraction complete`, {
      sectionCount: Object.keys(result.sections).length,
      hasDocumentName: !!result.suggestedDocumentName,
    });

    return result;
  }

  private buildSystemPrompt(
    sections: Array<{
      id: string;
      number: number;
      title: string;
      extraction_prompt: string;
      subsections?: Array<{ id: string; title: string; enabled?: boolean }>;
    }>
  ): string {
    const parts = [
      'You are an expert product analyst creating a Market Requirements Document (MRD).',
      'Extract content for each section from the product concept. Use markdown: **bold** for emphasis, * for bullets, ### for subsections where indicated.',
      '',
      'You must respond with valid JSON. Include a top-level "suggestedDocumentName" with 3-4 key words from the product (e.g. "AI-Kiosk-Stand" or "Tablet-Enclosure-Healthcare"). Use hyphens, no spaces.',
      '',
      'For each section, provide an object with "content" (string). For sections with subsections, you may provide "subsections": { "subsection_id": { "content": "..." } }.',
      '',
      'Sections to extract:',
    ];

    for (const s of sections) {
      parts.push(`\n${s.number}. ${s.title} (id: ${s.id}):`);
      parts.push(s.extraction_prompt);
      if (s.subsections?.length) {
        parts.push(
          `Subsections: ${s.subsections.filter((x) => x.enabled !== false).map((x) => x.id).join(', ')}`
        );
      }
    }

    parts.push(`
JSON format (only include enabled sections):
{
  "suggestedDocumentName": "Word1-Word2-Word3",
  "purpose_vision": { "content": "..." },
  "problem_statement": { "content": "..." },
  "target_market": { "content": "...", "subsections": { "primary_markets": { "content": "..." }, "core_use_cases": { "content": "..." } } },
  ... (all other section ids with "content" and optional "subsections")
}`);

    return parts.join('\n');
  }

  private buildUserPrompt(
    concept: string,
    sections: Array<{ id: string }>
  ): string {
    const ids = sections.map((s) => s.id).join(', ');
    return `Extract MRD sections from this product concept for section ids: ${ids}

"""
${concept}
"""

Return JSON with "suggestedDocumentName" and one key per section id. Each value: { "content": "markdown string" } or with "subsections" for target_market and key_requirements.`;
  }
}
