/**
 * Gap Detection Agent
 *
 * Identifies missing critical information in brief helper fields.
 * Uses hardcoded product patterns (initial version) to detect gaps.
 * Future: Query knowledge base for learned patterns.
 *
 * Analyzes extracted entities and bullet points to identify:
 * - Missing specifications
 * - Incomplete requirements
 * - Ambiguous information
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import {
  GapDetectionInput,
  GapDetectionOutput,
  IdentifiedGap,
} from './types';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Product Pattern Database (Hardcoded Initial Version)
// ============================================================================

/**
 * Critical information patterns for common product types
 */
const PRODUCT_PATTERNS: Record<string, GapPattern> = {
  'tablet stand': {
    requiredInfo: [
      { field: 'what', category: 'tablet_compatibility', question: 'Which tablet sizes does it support?', example: '7", 10", 12.9" tablets' },
      { field: 'what', category: 'mounting_type', question: 'How is it mounted?', example: 'Countertop, wall-mounted, clamp-mounted' },
      { field: 'what', category: 'rotation', question: 'Does it rotate? If so, how much?', example: 'Fixed, 180°, 360° rotation' },
      { field: 'what', category: 'vesa', question: 'Is it VESA compatible? Which pattern?', example: 'VESA 75x75, 100x100' },
      { field: 'where', category: 'placement', question: 'Where will it be used?', example: 'Retail POS, reception desk, conference room' },
      { field: 'must-have', category: 'security', question: 'What security features are required?', example: 'Lock, tamper-proof screws, cable lock slot' },
    ],
  },
  'display mount': {
    requiredInfo: [
      { field: 'what', category: 'display_size', question: 'What display sizes does it support?', example: '24"-32", 32"-43", 43"-55"' },
      { field: 'what', category: 'vesa', question: 'Which VESA patterns does it support?', example: 'VESA 100x100, 200x200, 400x400' },
      { field: 'what', category: 'mounting_type', question: 'How is it mounted?', example: 'Wall, ceiling, desk clamp, pole-mounted' },
      { field: 'what', category: 'articulation', question: 'What movement does it allow?', example: 'Fixed, tilt, swivel, full-motion arm' },
      { field: 'where', category: 'environment', question: 'Indoor or outdoor? Any special conditions?', example: 'Indoor office, outdoor (weatherproof), high-traffic area' },
      { field: 'must-have', category: 'weight_capacity', question: 'What is the weight capacity?', example: 'Up to 25 lbs, 25-50 lbs, 50+ lbs' },
    ],
  },
  'enclosure': {
    requiredInfo: [
      { field: 'what', category: 'device_type', question: 'What device goes inside?', example: 'iPad, Surface Pro, generic tablet, PC' },
      { field: 'what', category: 'access', question: 'How do you access the device?', example: 'Front-facing, rear access, sliding door' },
      { field: 'what', category: 'security', question: 'What security level is needed?', example: 'Basic tamper-resistant, high-security lock, anti-theft' },
      { field: 'what', category: 'cable_management', question: 'How are cables managed?', example: 'Internal routing, external clips, cable grommet' },
      { field: 'where', category: 'mounting', question: 'How is the enclosure mounted?', example: 'Wall, desk, VESA, freestanding' },
      { field: 'must-have', category: 'ports', question: 'Which ports need access?', example: 'USB, power, headphone jack, charging port' },
    ],
  },
  'kiosk': {
    requiredInfo: [
      { field: 'what', category: 'display_size', question: 'What is the display size?', example: '15", 22", 27", 32"' },
      { field: 'what', category: 'peripherals', question: 'What peripherals are included?', example: 'Printer, scanner, card reader, camera' },
      { field: 'what', category: 'form_factor', question: 'What is the form factor?', example: 'Floor-standing, countertop, wall-mounted' },
      { field: 'where', category: 'environment', question: 'Where will it be deployed?', example: 'Indoor retail, outdoor, healthcare, banking' },
      { field: 'where', category: 'accessibility', question: 'Does it need ADA compliance?', example: 'Yes (specify height range), No' },
      { field: 'must-have', category: 'power', question: 'What are the power requirements?', example: 'Standard 110V, PoE, battery backup' },
    ],
  },
};

/**
 * Field-specific gap patterns (apply to all products)
 */
const FIELD_GAP_PATTERNS: Record<BriefField, FieldGapPattern> = {
  what: {
    requiredCategories: ['dimensions', 'materials', 'features'],
    questions: [
      { category: 'dimensions', question: 'What are the physical dimensions?', priority: 'high' },
      { category: 'weight', question: 'What is the weight?', priority: 'medium' },
      { category: 'materials', question: 'What materials is it made from?', priority: 'medium' },
      { category: 'color_finish', question: 'What colors/finishes are available?', priority: 'low' },
    ],
  },
  who: {
    requiredCategories: ['target_user', 'industry'],
    questions: [
      { category: 'target_user', question: 'Who is the primary user?', priority: 'high' },
      { category: 'industry', question: 'Which industries/verticals?', priority: 'high' },
      { category: 'use_case', question: 'What are the main use cases?', priority: 'medium' },
      { category: 'pain_point', question: 'What problem does it solve?', priority: 'medium' },
    ],
  },
  where: {
    requiredCategories: ['location_type', 'environment'],
    questions: [
      { category: 'location_type', question: 'Where will it be installed?', priority: 'high' },
      { category: 'environment', question: 'What are the environmental conditions?', priority: 'medium' },
      { category: 'mounting', question: 'How/where is it mounted?', priority: 'high' },
    ],
  },
  moq: {
    requiredCategories: ['quantity'],
    questions: [
      { category: 'quantity', question: 'What is the minimum order quantity?', priority: 'high' },
      { category: 'volume_tiers', question: 'Are there volume pricing tiers?', priority: 'medium' },
    ],
  },
  'must-have': {
    requiredCategories: ['critical_features'],
    questions: [
      { category: 'critical_features', question: 'What features are absolutely required?', priority: 'high' },
      { category: 'compliance', question: 'Any required certifications or standards?', priority: 'high' },
      { category: 'performance', question: 'What are the performance requirements?', priority: 'medium' },
    ],
  },
  'nice-to-have': {
    requiredCategories: [],
    questions: [
      { category: 'optional_features', question: 'What optional features would be nice?', priority: 'low' },
      { category: 'future_upgrades', question: 'Any future upgrade possibilities?', priority: 'low' },
    ],
  },
};

interface GapPattern {
  requiredInfo: Array<{
    field: string;
    category: string;
    question: string;
    example: string;
  }>;
}

interface FieldGapPattern {
  requiredCategories: string[];
  questions: Array<{
    category: string;
    question: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// ============================================================================
// Agent Implementation
// ============================================================================

export class GapDetectionAgent extends BaseAgent<
  GapDetectionInput,
  GapDetectionOutput
> {
  readonly id = 'gap-detection-agent';
  readonly name = 'Gap Detection Agent';
  readonly version = '1.0.0';
  readonly description =
    'Identifies missing critical information using product patterns and entity analysis';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [];

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateInput(input: GapDetectionInput): ValidationResult {
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
      errors.push(`fieldType must be one of: ${validFields.join(', ')}`);
    }

    if (!Array.isArray(input.entities)) {
      errors.push('entities must be an array');
    }

    if (!Array.isArray(input.bulletPoints)) {
      errors.push('bulletPoints must be an array');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // --------------------------------------------------------------------------
  // Core Execution
  // --------------------------------------------------------------------------

  protected async executeCore(
    input: GapDetectionInput,
    context: ExecutionContext
  ): Promise<GapDetectionOutput> {
    const { fieldType, entities, bulletPoints } = input;

    context.log('info', `[${this.id}] Detecting gaps for field: ${fieldType}`, {
      entityCount: entities.length,
      bulletCount: bulletPoints.length,
    });

    // Detect product type from entities
    const productType = this.detectProductType(entities, bulletPoints);

    context.log('info', `[${this.id}] Detected product type: ${productType || 'unknown'}`);

    // Find gaps using pattern matching
    const gaps: IdentifiedGap[] = [];

    // 1. Check product-specific patterns
    if (productType && PRODUCT_PATTERNS[productType]) {
      const productGaps = this.checkProductPatterns(
        productType,
        fieldType,
        entities,
        bulletPoints
      );
      gaps.push(...productGaps);
    }

    // 2. Check field-specific patterns
    const fieldGaps = this.checkFieldPatterns(
      fieldType,
      entities,
      bulletPoints
    );
    gaps.push(...fieldGaps);

    // Calculate completeness score
    const completeness = this.calculateCompleteness(gaps, entities, bulletPoints);

    context.log('info', `[${this.id}] Gap detection complete`, {
      gapCount: gaps.length,
      completeness,
    });

    return {
      gaps,
      fieldType,
      completeness,
    };
  }

  // --------------------------------------------------------------------------
  // Product Type Detection
  // --------------------------------------------------------------------------

  private detectProductType(
    entities: GapDetectionInput['entities'],
    bulletPoints: string[]
  ): string | null {
    const allText = bulletPoints.join(' ').toLowerCase();

    // Check for known product types
    for (const productType of Object.keys(PRODUCT_PATTERNS)) {
      if (allText.includes(productType)) {
        return productType;
      }
    }

    // Check entity values
    for (const entity of entities) {
      const value = entity.value.toLowerCase();
      for (const productType of Object.keys(PRODUCT_PATTERNS)) {
        if (value.includes(productType)) {
          return productType;
        }
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Product Pattern Checking
  // --------------------------------------------------------------------------

  private checkProductPatterns(
    productType: string,
    fieldType: BriefField,
    entities: GapDetectionInput['entities'],
    bulletPoints: string[]
  ): IdentifiedGap[] {
    const pattern = PRODUCT_PATTERNS[productType];
    const gaps: IdentifiedGap[] = [];

    // Only check patterns for the current field
    const fieldPatterns = pattern.requiredInfo.filter(
      (info) => info.field === fieldType
    );

    for (const patternInfo of fieldPatterns) {
      const hasCategoryInfo = this.hasCategory(
        patternInfo.category,
        entities,
        bulletPoints
      );

      if (!hasCategoryInfo) {
        gaps.push({
          id: `${fieldType}-${patternInfo.category}`,
          category: patternInfo.category,
          description: `Missing ${patternInfo.category.replace('_', ' ')} information`,
          priority: 'high',
          suggestedQuestion: patternInfo.question,
          exampleAnswer: patternInfo.example,
        });
      }
    }

    return gaps;
  }

  // --------------------------------------------------------------------------
  // Field Pattern Checking
  // --------------------------------------------------------------------------

  private checkFieldPatterns(
    fieldType: BriefField,
    entities: GapDetectionInput['entities'],
    bulletPoints: string[]
  ): IdentifiedGap[] {
    const fieldPattern = FIELD_GAP_PATTERNS[fieldType];
    const gaps: IdentifiedGap[] = [];

    for (const question of fieldPattern.questions) {
      const hasInfo = this.hasCategory(question.category, entities, bulletPoints);

      if (!hasInfo) {
        gaps.push({
          id: `${fieldType}-${question.category}`,
          category: question.category,
          description: `Missing ${question.category.replace('_', ' ')} information`,
          priority: question.priority,
          suggestedQuestion: question.question,
        });
      }
    }

    return gaps;
  }

  // --------------------------------------------------------------------------
  // Category Detection
  // --------------------------------------------------------------------------

  private hasCategory(
    category: string,
    entities: GapDetectionInput['entities'],
    bulletPoints: string[]
  ): boolean {
    // Check if any entity matches the category
    for (const entity of entities) {
      if (entity.type.toLowerCase().includes(category.toLowerCase())) {
        return true;
      }
    }

    // Check bullet points for category keywords
    const allText = bulletPoints.join(' ').toLowerCase();
    const categoryKeywords = category.toLowerCase().replace('_', ' ');

    return allText.includes(categoryKeywords);
  }

  // --------------------------------------------------------------------------
  // Completeness Calculation
  // --------------------------------------------------------------------------

  private calculateCompleteness(
    gaps: IdentifiedGap[],
    entities: GapDetectionInput['entities'],
    bulletPoints: string[]
  ): number {
    // Base completeness on:
    // 1. Presence of bullet points (40%)
    // 2. Presence of entities (30%)
    // 3. Absence of high-priority gaps (30%)

    let score = 0;

    // Bullet points (40%)
    const bulletScore = Math.min(bulletPoints.length / 3, 1) * 0.4;
    score += bulletScore;

    // Entities (30%)
    const entityScore = Math.min(entities.length / 2, 1) * 0.3;
    score += entityScore;

    // Gaps (30%)
    const highPriorityGaps = gaps.filter((g) => g.priority === 'high').length;
    const gapPenalty = Math.min(highPriorityGaps * 0.15, 0.3);
    const gapScore = 0.3 - gapPenalty;
    score += gapScore;

    return Math.max(0, Math.min(1, score));
  }
}
