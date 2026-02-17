// agent/agents/product-brief/batch-extract-agent.ts

import { z } from 'zod';
import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { BatchExtractInput, BatchExtractOutput } from './types';

const ProductBriefSchema = z.object({
  product_description: z.string().describe('2-3 sentence overview of what the product is'),
  target_industry: z.array(z.string()).describe('List of target industries (e.g., Hospitality, Healthcare)'),
  where_used: z.array(z.string()).describe('List of use locations/environments (e.g., Countertops, Floor, Outdoor)'),
  who_uses: z.array(z.string()).describe('List of user types (e.g., Installers, Technicians, End customers)'),
  must_have: z.array(z.string()).describe('Critical required features - bullet points'),
  nice_to_have: z.array(z.string()).describe('Optional/desired features - bullet points'),
  moq: z.string().optional().describe('Minimum order quantity if mentioned'),
  risk_assessment: z.string().optional().describe('Potential risks or concerns if mentioned'),
  competition: z.array(z.string()).optional().describe('Competitor names or products if mentioned'),
});

export class BatchExtractAgent extends BaseAgent<BatchExtractInput, BatchExtractOutput> {
  readonly id = 'batch-extract-agent';
  readonly name = 'Batch Extract Agent';
  readonly version = '1.0.0';
  readonly description = 'Extracts all 9 product brief fields from concept in one AI call';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
  ];

  validateInput(input: BatchExtractInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    if (!input.productConcept || typeof input.productConcept !== 'string') {
      return { valid: false, errors: ['productConcept must be a non-empty string'] };
    }
    if (input.productConcept.trim().length < 50) {
      return {
        valid: false,
        errors: ['productConcept must be at least 50 characters for meaningful extraction'],
      };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: BatchExtractInput,
    context: ExecutionContext
  ): Promise<BatchExtractOutput> {
    const { productConcept } = input;
    const provider = context.getProvider();

    context.log('info', `[${this.id}] Batch extracting 9 fields`, {
      conceptLength: productConcept.length,
    });

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(productConcept);

    const response = await provider.generateText(userPrompt, systemPrompt, {
      temperature: 0.3,
      responseFormat: 'json',
    });

    let parsed: z.infer<typeof ProductBriefSchema>;
    try {
      let text = response.text.trim();

      // Strip markdown code fences if present
      if (text.startsWith('```')) {
        const firstNewline = text.indexOf('\n');
        if (firstNewline > 0) text = text.substring(firstNewline + 1);
        if (text.endsWith('```')) text = text.substring(0, text.lastIndexOf('```'));
        text = text.trim();
      }

      const rawJson = JSON.parse(text);
      parsed = ProductBriefSchema.parse(rawJson);
    } catch (error) {
      context.log('error', `[${this.id}] Failed to parse/validate JSON`, {
        error,
        preview: response.text.substring(0, 300),
      });
      throw new Error('Failed to parse AI response as valid product brief JSON');
    }

    const confidence = this.calculateConfidence(parsed);

    context.log('info', `[${this.id}] Extraction complete`, {
      confidence,
      fieldsPopulated: Object.keys(parsed).filter(k => parsed[k as keyof typeof parsed]).length,
    });

    return {
      fields: parsed,
      confidence,
    };
  }

  private buildSystemPrompt(): string {
    return `You are a product requirements analyst. Extract structured information from product concepts into a standardized brief format.

Extract these 9 fields:
1. product_description - What is it? 2-3 sentences
2. target_industry - Array of industries (e.g., ["Hospitality", "Healthcare"])
3. where_used - Array of use locations/environments (e.g., ["Countertops", "Floor"])
4. who_uses - Array of user types (e.g., ["Installers", "Technicians"])
5. must_have - Array of critical requirements
6. nice_to_have - Array of optional features
7. moq - Minimum order quantity (if mentioned)
8. risk_assessment - Potential concerns/risks (if any)
9. competition - Array of competitor names/products (if mentioned)

IMPORTANT:
- If information is not in the input, leave fields empty or minimal
- Do not invent information
- Return valid JSON matching the schema exactly
- Use arrays for lists (target_industry, where_used, who_uses, must_have, nice_to_have, competition)
- Use strings for text (product_description, moq, risk_assessment)`;
  }

  private buildUserPrompt(concept: string): string {
    return `Extract product brief fields from this concept:

${concept}

Return as JSON with all 9 fields. Example format:
{
  "product_description": "...",
  "target_industry": ["Industry1", "Industry2"],
  "where_used": ["Location1", "Location2"],
  "who_uses": ["User1", "User2"],
  "must_have": ["Feature1", "Feature2"],
  "nice_to_have": ["Feature1", "Feature2"],
  "moq": "...",
  "risk_assessment": "...",
  "competition": ["Competitor1", "Competitor2"]
}`;
  }

  private calculateConfidence(extraction: z.infer<typeof ProductBriefSchema>): number {
    let score = 0;
    const weights = {
      product_description: 20,
      target_industry: 15,
      where_used: 15,
      who_uses: 15,
      must_have: 20,
      nice_to_have: 10,
      moq: 2,
      risk_assessment: 2,
      competition: 1,
    };

    // Product description
    if (extraction.product_description && extraction.product_description.length >= 50) {
      score += weights.product_description;
    }

    // Lists
    if (extraction.target_industry && extraction.target_industry.length > 0) {
      score += weights.target_industry;
    }
    if (extraction.where_used && extraction.where_used.length > 0) {
      score += weights.where_used;
    }
    if (extraction.who_uses && extraction.who_uses.length > 0) {
      score += weights.who_uses;
    }
    if (extraction.must_have && extraction.must_have.length >= 2) {
      score += weights.must_have;
    }
    if (extraction.nice_to_have && extraction.nice_to_have.length > 0) {
      score += weights.nice_to_have;
    }

    // Optional fields
    if (extraction.moq) score += weights.moq;
    if (extraction.risk_assessment) score += weights.risk_assessment;
    if (extraction.competition && extraction.competition.length > 0) score += weights.competition;

    return score / 100;
  }
}
