/**
 * Text Extraction Agent
 *
 * Parses free-form text into structured bullet points using AI.
 * Field-aware extraction strategies for different brief fields.
 *
 * Uses Gemini's structured output to extract:
 * - Clean bullet points
 * - Product entities (specs, materials, standards, dimensions)
 * - Confidence scores
 *
 * V2 Compatibility: Agent is model-agnostic via BaseAgent.
 * Configured to use Gemini 2.5 Pro by default (Phase 1).
 * Includes JSON cleaning logic for markdown wrapper stripping (lines 193-204).
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import {
  TextExtractionInput,
  TextExtractionOutput,
  ExtractedEntity,
} from './types';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Field-Specific Extraction Strategies
// ============================================================================

/**
 * System prompts for each field type
 */
const FIELD_PROMPTS: Record<BriefField, string> = {
  what: `You are extracting PRODUCT DESCRIPTION information.
Focus on:
- Product type and category
- Physical attributes (size, weight, materials)
- Key features and capabilities
- Technical specifications
- Standards compliance (VESA, USB, etc.)

Extract entities like: dimensions, materials, product_type, feature, standard, specification`,

  who: `You are extracting TARGET USER/CUSTOMER information.
Focus on:
- User personas and roles
- Customer segments
- Industries and verticals
- Use cases and scenarios
- User needs and pain points

Extract entities like: persona, industry, role, use_case, pain_point, customer_segment`,

  where: `You are extracting USE ENVIRONMENT information.
Focus on:
- Physical locations (indoor/outdoor, retail, office, etc.)
- Environmental conditions (temperature, humidity, lighting)
- Mounting locations (countertop, wall, ceiling)
- Space constraints
- Proximity to other equipment

Extract entities like: location_type, mounting, environment, condition, constraint, placement`,

  moq: `You are extracting MINIMUM ORDER QUANTITY information.
Focus on:
- Quantity requirements
- Order size expectations
- Volume ranges
- Pricing tiers
- Bulk order details

Extract entities like: quantity, volume, tier, range, requirement`,

  'must-have': `You are extracting MUST-HAVE FEATURES (non-negotiable requirements).
Focus on:
- Critical features
- Mandatory capabilities
- Required specifications
- Compliance requirements
- Deal-breaker requirements

Extract entities like: feature, requirement, specification, standard, capability, constraint`,

  'nice-to-have': `You are extracting NICE-TO-HAVE FEATURES (optional enhancements).
Focus on:
- Optional features
- Enhancement ideas
- Future possibilities
- Upgrade options
- Additional capabilities

Extract entities like: feature, enhancement, option, upgrade, capability`,
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

export class TextExtractionAgent extends BaseAgent<
  TextExtractionInput,
  TextExtractionOutput
> {
  readonly id = 'text-extraction-agent';
  readonly name = 'Text Extraction Agent';
  readonly version = '1.0.0';
  readonly description =
    'Extracts structured bullet points and entities from free-form text using field-aware AI strategies';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'structuredOutput',
  ];

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateInput(input: TextExtractionInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.fieldType) {
      errors.push('fieldType is required');
    }

    const validFields: BriefField[] = [
      'what',
      'who',
      'where',
      'moq',
      'must-have',
      'nice-to-have',
    ];
    if (!validFields.includes(input.fieldType)) {
      errors.push(
        `fieldType must be one of: ${validFields.join(', ')}`
      );
    }

    if (!input.freeText || typeof input.freeText !== 'string') {
      errors.push('freeText must be a non-empty string');
    }

    if (input.freeText && input.freeText.trim().length === 0) {
      errors.push('freeText cannot be empty or whitespace only');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // --------------------------------------------------------------------------
  // Core Execution
  // --------------------------------------------------------------------------

  protected async executeCore(
    input: TextExtractionInput,
    context: ExecutionContext
  ): Promise<TextExtractionOutput> {
    const { fieldType, freeText } = input;
    const provider = context.getProvider();

    context.log('info', `[${this.id}] Extracting from field: ${fieldType}`, {
      textLength: freeText.length,
    });

    // Build field-specific prompt
    const systemPrompt = this.buildSystemPrompt(fieldType);
    const userPrompt = this.buildUserPrompt(freeText, fieldType);

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

    // Validate and transform response
    const bulletPoints = this.extractBulletPoints(parsed);
    const entities = this.extractEntities(parsed, fieldType);
    const confidence = this.calculateConfidence(bulletPoints, entities, fieldType);

    context.log('info', `[${this.id}] Extraction complete`, {
      bulletCount: bulletPoints.length,
      entityCount: entities.length,
      confidence,
    });

    return {
      bulletPoints,
      entities,
      confidence,
      fieldType,
    };
  }

  // --------------------------------------------------------------------------
  // Prompt Building
  // --------------------------------------------------------------------------

  private buildSystemPrompt(fieldType: BriefField): string {
    return `${FIELD_PROMPTS[fieldType]}

You must respond with valid JSON in this exact format:
{
  "bulletPoints": ["clear, concise bullet point 1", "bullet point 2", ...],
  "entities": [
    {
      "type": "entity_type",
      "value": "extracted value",
      "confidence": 0.95,
      "span": "original text span"
    },
    ...
  ]
}

Guidelines:
- Each bullet point should be clear, concise, and actionable
- Remove filler words and redundancy
- Extract specific entities with high confidence
- Use entity types: ${EXPECTED_ENTITY_TYPES[fieldType].join(', ')}
- Confidence should be 0-1 (0.7+ for high confidence)
- Preserve important details while improving clarity`;
  }

  private buildUserPrompt(freeText: string, fieldType: BriefField): string {
    return `Extract structured information from this free-form text for the "${fieldType}" field:

"""
${freeText}
"""

Return JSON with bullet points and entities.`;
  }

  // --------------------------------------------------------------------------
  // Response Processing
  // --------------------------------------------------------------------------

  private extractBulletPoints(parsed: any): string[] {
    if (!parsed.bulletPoints || !Array.isArray(parsed.bulletPoints)) {
      return [];
    }

    return parsed.bulletPoints
      .filter((bp: any) => typeof bp === 'string' && bp.trim().length > 0)
      .map((bp: string) => bp.trim())
      .slice(0, 20); // Limit to 20 bullet points
  }

  private extractEntities(parsed: any, fieldType: BriefField): ExtractedEntity[] {
    if (!parsed.entities || !Array.isArray(parsed.entities)) {
      return [];
    }

    const expectedTypes = EXPECTED_ENTITY_TYPES[fieldType];

    return parsed.entities
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
      .slice(0, 50); // Limit to 50 entities
  }

  private calculateConfidence(
    bulletPoints: string[],
    entities: ExtractedEntity[],
    fieldType: BriefField
  ): number {
    // Base confidence on:
    // 1. Number of bullet points (more = better)
    // 2. Number of entities (more = better)
    // 3. Entity confidence scores

    let score = 0;

    // Bullet points contribute 50% of score
    const bulletScore = Math.min(bulletPoints.length / 5, 1) * 0.5;
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
