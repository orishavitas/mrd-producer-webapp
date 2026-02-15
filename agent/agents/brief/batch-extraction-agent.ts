/**
 * Batch Extraction Agent
 *
 * Extracts structured data from initial product description for ALL 6 fields
 * in a single AI call. More efficient than per-field extraction.
 *
 * Uses Gemini 2.5 Pro with structured output to extract:
 * - Bullet points for each field
 * - Product entities (specs, materials, standards, etc.)
 * - Confidence scores per field
 *
 * Temperature: 0.3 for consistency
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import {
  BatchExtractionInput,
  BatchExtractionOutput,
  ExtractedEntity,
} from './types';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Field-Specific Extraction Strategies (reused from text-extraction-agent)
// ============================================================================

/**
 * System prompts for each field type
 */
const FIELD_PROMPTS: Record<BriefField, string> = {
  what: `PRODUCT DESCRIPTION (What):
Extract information about:
- Product type and category
- Physical attributes (size, weight, materials)
- Key features and capabilities
- Technical specifications
- Standards compliance (VESA, USB, etc.)

Expected entities: dimension, material, product_type, feature, standard, specification`,

  who: `TARGET USER/CUSTOMER (Who):
Extract information about:
- User personas and roles
- Customer segments
- Industries and verticals
- Use cases and scenarios
- User needs and pain points

Expected entities: persona, industry, role, use_case, pain_point, customer_segment`,

  where: `USE ENVIRONMENT (Where):
Extract information about:
- Physical locations (indoor/outdoor, retail, office, etc.)
- Environmental conditions (temperature, humidity, lighting)
- Mounting locations (countertop, wall, ceiling)
- Space constraints
- Proximity to other equipment

Expected entities: location_type, mounting, environment, condition, constraint, placement`,

  moq: `MINIMUM ORDER QUANTITY (MOQ):
Extract information about:
- Quantity requirements
- Order size expectations
- Volume ranges
- Pricing tiers
- Bulk order details

Expected entities: quantity, volume, tier, range, requirement`,

  'must-have': `MUST-HAVE FEATURES (non-negotiable requirements):
Extract information about:
- Critical features
- Mandatory capabilities
- Required specifications
- Compliance requirements
- Deal-breaker requirements

Expected entities: feature, requirement, specification, standard, capability, constraint`,

  'nice-to-have': `NICE-TO-HAVE FEATURES (optional enhancements):
Extract information about:
- Optional features
- Enhancement ideas
- Future possibilities
- Upgrade options
- Additional capabilities

Expected entities: feature, enhancement, option, upgrade, capability`,
};

/**
 * Entity types expected for each field
 */
const EXPECTED_ENTITY_TYPES: Record<BriefField, string[]> = {
  what: ['dimension', 'material', 'product_type', 'feature', 'standard', 'specification'],
  who: ['persona', 'industry', 'role', 'use_case', 'pain_point', 'customer_segment'],
  where: ['location_type', 'mounting', 'environment', 'condition', 'constraint', 'placement'],
  moq: ['quantity', 'volume', 'tier', 'range', 'requirement'],
  'must-have': ['feature', 'requirement', 'specification', 'standard', 'capability', 'constraint'],
  'nice-to-have': ['feature', 'enhancement', 'option', 'upgrade', 'capability'],
};

// ============================================================================
// Agent Implementation
// ============================================================================

export class BatchExtractionAgent extends BaseAgent<
  BatchExtractionInput,
  BatchExtractionOutput
> {
  readonly id = 'batch-extraction-agent';
  readonly name = 'Batch Extraction Agent';
  readonly version = '1.0.0';
  readonly description =
    'Extracts structured data for all 6 brief fields from initial product description in one AI call';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'structuredOutput',
  ];

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateInput(input: BatchExtractionInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.description || typeof input.description !== 'string') {
      errors.push('description must be a non-empty string');
    }

    if (input.description && input.description.trim().length === 0) {
      errors.push('description cannot be empty or whitespace only');
    }

    if (input.description && input.description.length < 20) {
      errors.push('description must be at least 20 characters');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // --------------------------------------------------------------------------
  // Core Execution
  // --------------------------------------------------------------------------

  protected async executeCore(
    input: BatchExtractionInput,
    context: ExecutionContext
  ): Promise<BatchExtractionOutput> {
    const { description } = input;
    const provider = context.getProvider();

    context.log('info', `[${this.id}] Batch extracting from description`, {
      descriptionLength: description.length,
    });

    // Build comprehensive prompt for all 6 fields
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(description);

    // Call AI provider with structured output
    const response = await provider.generateText(userPrompt, systemPrompt, {
      temperature: 0.3, // Low temperature for consistent extraction
      responseFormat: 'json',
    });

    // Parse JSON response (strip markdown code blocks if present)
    let parsed: any;
    try {
      // Remove markdown code blocks (```json ... ```)
      let cleanedText = response.text.trim();
      if (cleanedText.startsWith('```')) {
        // Find the first newline after ``` (skips ```json or ```JSON)
        const firstNewline = cleanedText.indexOf('\n');
        if (firstNewline > 0) {
          cleanedText = cleanedText.substring(firstNewline + 1);
        }
        // Remove trailing ```
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.substring(0, cleanedText.lastIndexOf('```'));
        }
        cleanedText = cleanedText.trim();
      }

      parsed = JSON.parse(cleanedText);
    } catch (error) {
      context.log('error', `[${this.id}] Failed to parse JSON response`, {
        error,
        responseText: response.text.substring(0, 200),
      });
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and transform response for each field
    const fields: BatchExtractionOutput['fields'] = {
      what: this.extractFieldData(parsed.what, 'what'),
      who: this.extractFieldData(parsed.who, 'who'),
      where: this.extractFieldData(parsed.where, 'where'),
      moq: this.extractFieldData(parsed.moq, 'moq'),
      'must-have': this.extractFieldData(parsed['must-have'], 'must-have'),
      'nice-to-have': this.extractFieldData(parsed['nice-to-have'], 'nice-to-have'),
    };

    context.log('info', `[${this.id}] Batch extraction complete`, {
      fieldCounts: {
        what: fields.what.bullets.length,
        who: fields.who.bullets.length,
        where: fields.where.bullets.length,
        moq: fields.moq.bullets.length,
        'must-have': fields['must-have'].bullets.length,
        'nice-to-have': fields['nice-to-have'].bullets.length,
      },
    });

    return { fields };
  }

  // --------------------------------------------------------------------------
  // Prompt Building
  // --------------------------------------------------------------------------

  private buildSystemPrompt(): string {
    return `You are an expert product analyst extracting structured information from product descriptions.

You must analyze the description and extract relevant information for ALL 6 fields:

1. ${FIELD_PROMPTS.what}

2. ${FIELD_PROMPTS.who}

3. ${FIELD_PROMPTS.where}

4. ${FIELD_PROMPTS.moq}

5. ${FIELD_PROMPTS['must-have']}

6. ${FIELD_PROMPTS['nice-to-have']}

You must respond with valid JSON in this exact format:
{
  "what": {
    "bullets": ["clear, concise bullet point 1", "bullet point 2", ...],
    "entities": [
      {
        "type": "entity_type",
        "value": "extracted value",
        "confidence": 0.95,
        "span": "original text span"
      },
      ...
    ]
  },
  "who": { ... same structure ... },
  "where": { ... same structure ... },
  "moq": { ... same structure ... },
  "must-have": { ... same structure ... },
  "nice-to-have": { ... same structure ... }
}

Guidelines:
- Each bullet point should be clear, concise, and actionable
- Remove filler words and redundancy
- Extract specific entities with high confidence
- Confidence should be 0-1 (0.7+ for high confidence)
- Preserve important details while improving clarity
- If a field has no relevant information, use empty arrays: {"bullets": [], "entities": []}
- Distribute information appropriately across fields (don't duplicate)`;
  }

  private buildUserPrompt(description: string): string {
    return `Extract structured information from this product description for all 6 fields:

"""
${description}
"""

Return JSON with data for all 6 fields: what, who, where, moq, must-have, nice-to-have.`;
  }

  // --------------------------------------------------------------------------
  // Response Processing
  // --------------------------------------------------------------------------

  private extractFieldData(
    fieldData: any,
    fieldType: BriefField
  ): { bullets: string[]; entities: ExtractedEntity[]; confidence: number } {
    // Handle missing or invalid field data
    if (!fieldData || typeof fieldData !== 'object') {
      return { bullets: [], entities: [], confidence: 0 };
    }

    // Extract bullet points
    const bullets = this.extractBulletPoints(fieldData.bullets || []);

    // Extract entities
    const entities = this.extractEntities(fieldData.entities || [], fieldType);

    // Calculate confidence
    const confidence = this.calculateConfidence(bullets, entities);

    return { bullets, entities, confidence };
  }

  private extractBulletPoints(bulletPoints: any): string[] {
    if (!Array.isArray(bulletPoints)) {
      return [];
    }

    return bulletPoints
      .filter((bp: any) => typeof bp === 'string' && bp.trim().length > 0)
      .map((bp: string) => bp.trim())
      .slice(0, 20); // Limit to 20 bullet points per field
  }

  private extractEntities(entities: any, fieldType: BriefField): ExtractedEntity[] {
    if (!Array.isArray(entities)) {
      return [];
    }

    const expectedTypes = EXPECTED_ENTITY_TYPES[fieldType];

    return entities
      .filter((entity: any) => {
        return (
          entity &&
          typeof entity === 'object' &&
          typeof entity.type === 'string' &&
          typeof entity.value === 'string' &&
          typeof entity.confidence === 'number' &&
          entity.confidence >= 0 &&
          entity.confidence <= 1
        );
      })
      .map((entity: any) => ({
        type: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        span: entity.span || undefined,
      }))
      .filter((entity: ExtractedEntity) => {
        // Accept expected types or reasonable variations
        return (
          expectedTypes.includes(entity.type) ||
          expectedTypes.some((expected) =>
            entity.type.toLowerCase().includes(expected.toLowerCase())
          )
        );
      })
      .slice(0, 50); // Limit to 50 entities per field
  }

  private calculateConfidence(
    bullets: string[],
    entities: ExtractedEntity[]
  ): number {
    // Base confidence on:
    // 1. Number of bullet points (more = better)
    // 2. Number of entities (more = better)
    // 3. Entity confidence scores

    let score = 0;

    // Bullet points contribute 50% of score
    const bulletScore = Math.min(bullets.length / 5, 1) * 0.5;
    score += bulletScore;

    // Entity count contributes 25% of score
    const entityCountScore = Math.min(entities.length / 3, 1) * 0.25;
    score += entityCountScore;

    // Entity confidence contributes 25% of score
    if (entities.length > 0) {
      const avgConfidence =
        entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      score += avgConfidence * 0.25;
    }

    return Math.max(0, Math.min(1, score));
  }
}
