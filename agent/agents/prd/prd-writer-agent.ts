/**
 * PRDWriterAgent — Agent 3 in the PRD Producer pipeline.
 *
 * Input:  { summary: OnePagerSummary, skeleton: PRDSkeleton, onSectionDone?: (frame: PRDFrame) => void }
 * Output: PRDFrame[] — all 8 sections written in parallel
 *
 * Each section uses its writingDirective from the approved skeleton as system prompt.
 * YAML userPromptTemplate variables are interpolated from OnePagerSummary fields.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { loadPRDSections, PRDSectionConfig } from '@/lib/prd-sections-loader';
import {
  OnePagerSummary,
  PRDSkeleton,
  PRDFrame,
  PRDSkeletonSection,
} from './types';

export interface WriterInput {
  summary: OnePagerSummary;
  skeleton: PRDSkeleton;
  onSectionDone?: (frame: PRDFrame) => void;
}

/**
 * PRDWriterAgent writes all PRD sections in parallel using the approved skeleton
 */
export class PRDWriterAgent extends BaseAgent<WriterInput, PRDFrame[]> {
  readonly id = 'prd-writer-agent';
  readonly name = 'PRD Writer Agent';
  readonly version = '1.0.0';
  readonly description =
    'Writes all 8 PRD sections in parallel using approved skeleton';
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
  ];

  validateInput(input: WriterInput): ValidationResult {
    const errors: string[] = [];
    if (!input?.summary || typeof input.summary !== 'object') {
      errors.push('summary is required and must be an object');
    }
    if (!input?.skeleton || !Array.isArray(input.skeleton)) {
      errors.push('skeleton is required and must be an array');
    }
    return errors.length === 0
      ? { valid: true }
      : { valid: false, errors };
  }

  /**
   * Build user prompt for a section by interpolating template variables
   */
  static buildUserPrompt(
    sectionKey: string,
    summary: OnePagerSummary,
    preloadedSections?: ReturnType<typeof loadPRDSections>
  ): string {
    // Prepare replacement map from summary
    const replacements: Record<string, string> = {
      productName: summary.productName,
      description: summary.description,
      goal: summary.goal,
      useCases: summary.useCases,
      environments: summary.environments.join(', '),
      industries: summary.industries.join(', '),
      audience: summary.audience.join(', '),
      mustHaveFeatures: summary.mustHaveFeatures.join('\n'),
      niceToHaveFeatures: summary.niceToHaveFeatures.join('\n'),
      moq: summary.moq,
      targetPrice: summary.targetPrice,
      competitors: summary.competitors
        .map((c) => `${c.brand} ${c.productName} (${c.cost}): ${c.description}`)
        .join('\n'),
      customization: summary.customization.paint,
    };

    const sections = preloadedSections ?? loadPRDSections();
    const config = sections.find((s) => s.key === sectionKey);
    if (!config) {
      return `Write the ${sectionKey} section for: ${summary.productName}`;
    }

    let prompt = config.userPromptTemplate;
    for (const [key, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || 'N/A');
    }
    return prompt;
  }

  protected async executeCore(
    input: WriterInput,
    context: ExecutionContext
  ): Promise<PRDFrame[]> {
    const sections = loadPRDSections();
    const provider = context.getProvider();

    const framePromises = input.skeleton.map(
      async (skeletonSection: PRDSkeletonSection, idx: number) => {
        const sectionConfig = sections.find(
          (s) => s.key === skeletonSection.sectionKey
        );

        // Use writingDirective as override, fall back to config systemPrompt
        const systemPrompt =
          skeletonSection.writingDirective ||
          sectionConfig?.systemPrompt ||
          '';
        const userPrompt = PRDWriterAgent.buildUserPrompt(
          skeletonSection.sectionKey,
          input.summary,
          sections
        );

        const response = await provider.generateText(userPrompt, systemPrompt);

        const frame: PRDFrame = {
          sectionKey: skeletonSection.sectionKey,
          sectionOrder: idx + 1,
          content: response.text.trim(),
        };

        input.onSectionDone?.(frame);
        return frame;
      }
    );

    return Promise.all(framePromises);
  }
}
