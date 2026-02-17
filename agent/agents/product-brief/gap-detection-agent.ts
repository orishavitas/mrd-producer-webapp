// agent/agents/product-brief/gap-detection-agent.ts

import { z } from 'zod';
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { GapDetectionInput, GapDetectionOutput, Gap } from './types';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface GapRule {
  category: string;
  check: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface FieldGapConfig {
  required?: boolean;
  optional?: boolean;
  min_length?: number;
  min_items?: number;
  checks: GapRule[];
}

const FailedChecksSchema = z.object({
  failed_checks: z.array(
    z.object({
      check: z.string(),
      category: z.string(),
      reasoning: z.string(),
    })
  ),
});

export class GapDetectionAgent extends BaseAgent<GapDetectionInput, GapDetectionOutput> {
  readonly id = 'gap-detection-agent';
  readonly name = 'Gap Detection Agent';
  readonly version = '1.0.0';
  readonly description = 'Detects missing information in product brief fields';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
  ];

  private gapConfig: Record<string, FieldGapConfig> | null = null;

  validateInput(input: GapDetectionInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    if (!input.fieldId || typeof input.fieldId !== 'string') {
      return { valid: false, errors: ['fieldId must be a non-empty string'] };
    }
    if (!input.fieldType || !['text', 'list'].includes(input.fieldType)) {
      return { valid: false, errors: ['fieldType must be "text" or "list"'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: GapDetectionInput,
    context: ExecutionContext
  ): Promise<GapDetectionOutput> {
    const { fieldId, fieldContent, fieldType } = input;

    // Load gap config
    if (!this.gapConfig) {
      this.loadGapConfig();
    }

    const rules = this.gapConfig?.[fieldId];
    if (!rules) {
      context.log('warn', `[${this.id}] No gap rules found for field: ${fieldId}`);
      return { gaps: [], score: 100 };
    }

    const gaps: Gap[] = [];

    // 1. Basic validation
    if (fieldType === 'text') {
      const text = fieldContent as string;
      if (rules.min_length && text.length < rules.min_length) {
        gaps.push({
          id: `${fieldId}-min-length`,
          category: 'Completeness',
          message: `Field is too short (${text.length}/${rules.min_length} chars)`,
          priority: 'high',
          suggestion: 'Add more detail to this field',
        });
      }
    }

    if (fieldType === 'list') {
      const items = Array.isArray(fieldContent) ? fieldContent : [];
      if (rules.min_items && items.length < rules.min_items) {
        gaps.push({
          id: `${fieldId}-min-items`,
          category: 'Completeness',
          message: `Need at least ${rules.min_items} items (found ${items.length})`,
          priority: 'high',
          suggestion: rules.checks[0]?.suggestion || 'Add more items',
        });
      }
    }

    // 2. AI semantic checks
    if (rules.checks && rules.checks.length > 0) {
      const aiGaps = await this.runSemanticChecks(fieldId, fieldContent, rules.checks, context);
      gaps.push(...aiGaps);
    }

    // 3. Calculate score
    const score = this.calculateScore(gaps, rules);

    context.log('info', `[${this.id}] Gap detection complete`, {
      fieldId,
      gapsFound: gaps.length,
      score,
    });

    return { gaps, score };
  }

  private loadGapConfig(): void {
    const configPath = path.join(process.cwd(), 'config', 'product-brief-gaps.yaml');
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(fileContents) as { fields: Record<string, FieldGapConfig> };
      this.gapConfig = config.fields;
    } catch (error) {
      console.error('[GapDetectionAgent] Failed to load gap config:', error);
      this.gapConfig = {};
    }
  }

  private async runSemanticChecks(
    fieldId: string,
    content: string | string[],
    checks: GapRule[],
    context: ExecutionContext
  ): Promise<Gap[]> {
    const provider = context.getProvider();

    const prompt = `Analyze this field content and identify which checks fail:

Field: ${fieldId}
Content: ${JSON.stringify(content)}

Checks:
${checks.map((c, i) => `${i + 1}. ${c.check}`).join('\n')}

Return JSON with failed_checks array. Only include checks that FAIL. Each failed check should have:
- check: the exact check text
- category: the check category
- reasoning: brief explanation why it failed

If all checks pass, return empty array.`;

    const systemPrompt = `You are a requirements analyst. Evaluate field content against quality checks. Be strict but fair. Only flag genuine gaps.`;

    const response = await provider.generateText(prompt, systemPrompt, {
      temperature: 0.2,
      responseFormat: 'json',
    });

    let parsed: z.infer<typeof FailedChecksSchema>;
    try {
      let text = response.text.trim();
      if (text.startsWith('```')) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline > 0) text = text.substring(firstNewline + 1);
        if (text.endsWith('```')) text = text.substring(0, text.lastIndexOf('```'));
        text = text.trim();
      }

      const rawJson = JSON.parse(text);

      // Handle both array and object responses
      if (Array.isArray(rawJson)) {
        parsed = { failed_checks: rawJson };
      } else {
        parsed = FailedChecksSchema.parse(rawJson);
      }
    } catch (error) {
      context.log('error', `[${this.id}] Failed to parse semantic check results`, { error });
      return [];
    }

    return parsed.failed_checks.map((fc) => {
      const rule = checks.find((c) => c.check === fc.check);
      return {
        id: `${fieldId}-${this.slugify(fc.category)}`,
        category: fc.category,
        message: fc.reasoning,
        priority: rule?.priority || 'medium',
        suggestion: rule?.suggestion || '',
      };
    });
  }

  private calculateScore(gaps: Gap[], rules: FieldGapConfig): number {
    if (gaps.length === 0) return 100;

    const maxDeductions = {
      high: 30,
      medium: 15,
      low: 5,
    };

    let deductions = 0;
    for (const gap of gaps) {
      deductions += maxDeductions[gap.priority] || 0;
    }

    const score = Math.max(0, 100 - deductions);
    return score;
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
