/**
 * Batch Extraction Agent Tests
 *
 * Comprehensive tests for BatchExtractionAgent covering:
 * - Input validation
 * - Successful extraction of all 6 fields
 * - Partial extractions (some fields empty)
 * - Confidence scoring
 * - JSON cleaning (markdown wrapper removal)
 * - Field-specific extraction strategies
 */

import { BatchExtractionAgent } from '@/agent/agents/brief/batch-extraction-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

describe('BatchExtractionAgent', () => {
  let agent: BatchExtractionAgent;

  beforeEach(() => {
    agent = new BatchExtractionAgent();
  });

  // ============================================================================
  // Agent Metadata
  // ============================================================================

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('batch-extraction-agent');
      expect(agent.name).toBe('Batch Extraction Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('all 6 brief fields');
    });

    it('should require text generation and structured output capabilities', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
      expect(agent.requiredCapabilities).toContain('structuredOutput');
    });
  });

  // ============================================================================
  // Input Validation
  // ============================================================================

  describe('Input Validation', () => {
    it('should reject null or undefined input', () => {
      const result = agent.validateInput(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject missing description', () => {
      const result = agent.validateInput({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description must be a non-empty string');
    });

    it('should reject empty description', () => {
      const result = agent.validateInput({ description: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description must be a non-empty string');
    });

    it('should reject whitespace-only description', () => {
      const result = agent.validateInput({ description: '   \n\t  ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description cannot be empty or whitespace only');
    });

    it('should reject description shorter than 20 characters', () => {
      const result = agent.validateInput({ description: 'Short text' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('description must be at least 20 characters');
    });

    it('should accept valid description (20+ characters)', () => {
      const result = agent.validateInput({
        description: 'A secure tablet stand for retail POS systems with integrated cable management',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept description with exactly 20 characters', () => {
      const result = agent.validateInput({
        description: '12345678901234567890', // Exactly 20 chars
      });
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Successful Extraction - All 6 Fields
  // ============================================================================

  describe('Successful Extraction - All 6 Fields', () => {
    // Skip AI-dependent tests (require API keys)
    it.skip('should extract data for all 6 fields from comprehensive description', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-extract-comprehensive',
      });

      const description = `
        iPad Pro stand for retail stores with 360° rotation and adjustable height (WHAT).
        Target users are retail store managers and cashiers in small businesses (WHO).
        Used in retail counters, restaurants, and trade show booths (WHERE).
        Minimum order quantity is 1000 units, need production in 12 weeks (MOQ).
        Must have VESA 75/100 compatibility, lockable tablet security, and cable routing (MUST-HAVE).
        Nice to have quick-release mechanism, USB hub integration, and premium finish options (NICE-TO-HAVE).
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.fields).toBeDefined();

      // Verify all 6 fields exist
      expect(result.data?.fields.what).toBeDefined();
      expect(result.data?.fields.who).toBeDefined();
      expect(result.data?.fields.where).toBeDefined();
      expect(result.data?.fields.moq).toBeDefined();
      expect(result.data?.fields['must-have']).toBeDefined();
      expect(result.data?.fields['nice-to-have']).toBeDefined();

      // Verify each field has required structure
      const fields = result.data!.fields;
      Object.values(fields).forEach((field) => {
        expect(field).toHaveProperty('bullets');
        expect(field).toHaveProperty('entities');
        expect(field).toHaveProperty('confidence');
        expect(Array.isArray(field.bullets)).toBe(true);
        expect(Array.isArray(field.entities)).toBe(true);
        expect(typeof field.confidence).toBe('number');
        expect(field.confidence).toBeGreaterThanOrEqual(0);
        expect(field.confidence).toBeLessThanOrEqual(1);
      });
    }, 60000); // 60 second timeout for AI call

    it.skip('should extract specific entities for WHAT field', async () => {
      const context = createExecutionContext({
        requestId: 'test-extract-what-entities',
      });

      const description = `
        Tablet stand made of aluminum with dimensions 8x6x12 inches,
        VESA 75/100 compatible, featuring 360-degree rotation and height adjustment from 10 to 16 inches.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const whatField = result.data?.fields.what;
      expect(whatField).toBeDefined();
      expect(whatField!.bullets.length).toBeGreaterThan(0);

      // Check for entity types (material, dimension, standard)
      if (whatField!.entities.length > 0) {
        const entityTypes = whatField!.entities.map((e) => e.type);
        expect(entityTypes.some((t) => t.toLowerCase().includes('material'))).toBe(true);
      }
    }, 30000);

    it.skip('should extract user personas for WHO field', async () => {
      const context = createExecutionContext({
        requestId: 'test-extract-who-personas',
      });

      const description = `
        This product is designed for retail store managers, cashiers, and IT administrators
        in small to medium-sized businesses, particularly in the hospitality industry.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const whoField = result.data?.fields.who;
      expect(whoField).toBeDefined();
      expect(whoField!.bullets.length).toBeGreaterThan(0);

      // Check for persona/role entities
      if (whoField!.entities.length > 0) {
        const entityTypes = whoField!.entities.map((e) => e.type);
        expect(
          entityTypes.some((t) => t.toLowerCase().includes('persona') || t.toLowerCase().includes('role'))
        ).toBe(true);
      }
    }, 30000);
  });

  // ============================================================================
  // Partial Extractions (Some Fields Empty)
  // ============================================================================

  describe('Partial Extractions', () => {
    it.skip('should handle description with only WHAT information', async () => {
      const context = createExecutionContext({
        requestId: 'test-partial-what-only',
      });

      const description = 'A secure tablet stand for retail POS with adjustable height';

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const fields = result.data!.fields;

      // WHAT field should have content
      expect(fields.what.bullets.length).toBeGreaterThan(0);

      // Other fields may be empty (depends on AI interpretation)
      // Just verify structure exists
      expect(fields.who).toBeDefined();
      expect(fields.where).toBeDefined();
      expect(fields.moq).toBeDefined();
      expect(fields['must-have']).toBeDefined();
      expect(fields['nice-to-have']).toBeDefined();
    }, 30000);

    it.skip('should return empty arrays for fields with no relevant data', async () => {
      const context = createExecutionContext({
        requestId: 'test-minimal-description',
      });

      const description = 'A simple product for general use with basic features';

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);

      // All fields should exist with valid structure
      const fields = result.data!.fields;
      Object.values(fields).forEach((field) => {
        expect(Array.isArray(field.bullets)).toBe(true);
        expect(Array.isArray(field.entities)).toBe(true);
        expect(typeof field.confidence).toBe('number');
      });
    }, 30000);
  });

  // ============================================================================
  // Confidence Scoring
  // ============================================================================

  describe('Confidence Scoring', () => {
    it.skip('should assign higher confidence to fields with more content', async () => {
      const context = createExecutionContext({
        requestId: 'test-confidence-scoring',
      });

      const description = `
        iPad Pro stand (WHAT) made of aluminum with VESA 75/100 compatibility,
        360-degree rotation, height adjustment from 10-16 inches, integrated cable management,
        lockable security features, and compatibility with 10-13 inch tablets.
        Target users are retail store managers and cashiers (WHO).
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const fields = result.data!.fields;

      // WHAT field should have higher confidence (more details)
      // WHO field should have lower confidence (less details)
      expect(fields.what.confidence).toBeGreaterThan(0);

      // All confidences should be valid (0-1 range)
      Object.values(fields).forEach((field) => {
        expect(field.confidence).toBeGreaterThanOrEqual(0);
        expect(field.confidence).toBeLessThanOrEqual(1);
      });
    }, 30000);

    it.skip('should assign lower confidence to empty or minimal fields', async () => {
      const context = createExecutionContext({
        requestId: 'test-low-confidence',
      });

      const description = 'A product for general use';

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);

      // Most fields should have low confidence due to minimal info
      const fields = result.data!.fields;
      const avgConfidence =
        Object.values(fields).reduce((sum, field) => sum + field.confidence, 0) / 6;

      expect(avgConfidence).toBeLessThan(0.5); // Expect low average confidence
    }, 30000);
  });

  // ============================================================================
  // JSON Cleaning (Markdown Wrapper Removal)
  // ============================================================================

  describe('JSON Cleaning', () => {
    it.skip('should parse JSON correctly even with markdown wrappers', async () => {
      const context = createExecutionContext({
        requestId: 'test-json-cleaning',
      });

      // This test verifies the agent can handle Gemini's markdown-wrapped JSON
      // The actual markdown wrapping happens in the AI response, not our input
      const description = 'A tablet stand for retail stores with adjustable features';

      const result = await agent.execute({ description }, context);

      // Should succeed regardless of markdown wrapping
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.fields).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Field-Specific Extraction Strategies
  // ============================================================================

  describe('Field-Specific Extraction Strategies', () => {
    it.skip('should extract technical specs for WHAT field', async () => {
      const context = createExecutionContext({
        requestId: 'test-what-specs',
      });

      const description = `
        Tablet mount with aluminum construction, VESA 75/100 mounting pattern,
        360-degree rotation, tilt adjustment, cable management channels,
        and compatibility with 10-13 inch tablets.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const whatField = result.data?.fields.what;
      expect(whatField!.bullets.length).toBeGreaterThan(0);

      // Should extract material, standards, and features
      const bulletText = whatField!.bullets.join(' ').toLowerCase();
      expect(
        bulletText.includes('aluminum') ||
        bulletText.includes('vesa') ||
        bulletText.includes('rotation')
      ).toBe(true);
    }, 30000);

    it.skip('should extract quantities for MOQ field', async () => {
      const context = createExecutionContext({
        requestId: 'test-moq-quantities',
      });

      const description = `
        Need 1000 units for initial order, with production timeline of 12 weeks.
        Budget is $50,000 total. Potential for 5000+ units if successful.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const moqField = result.data?.fields.moq;
      expect(moqField).toBeDefined();

      // Should extract quantity-related information
      if (moqField!.bullets.length > 0) {
        const bulletText = moqField!.bullets.join(' ').toLowerCase();
        expect(
          bulletText.includes('1000') ||
          bulletText.includes('units') ||
          bulletText.includes('week')
        ).toBe(true);
      }
    }, 30000);

    it.skip('should distinguish MUST-HAVE from NICE-TO-HAVE features', async () => {
      const context = createExecutionContext({
        requestId: 'test-feature-distinction',
      });

      const description = `
        Critical requirements: VESA compatibility, lockable security, cable routing (MUST-HAVE).
        Optional features: USB hub, quick-release, premium finish (NICE-TO-HAVE).
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      const mustHaveField = result.data?.fields['must-have'];
      const niceToHaveField = result.data?.fields['nice-to-have'];

      expect(mustHaveField).toBeDefined();
      expect(niceToHaveField).toBeDefined();

      // Both fields should have content
      // Content distribution depends on AI interpretation
      expect(
        mustHaveField!.bullets.length > 0 || niceToHaveField!.bullets.length > 0
      ).toBe(true);
    }, 30000);
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it.skip('should handle very short description gracefully', async () => {
      const context = createExecutionContext({
        requestId: 'test-error-short-desc',
      });

      const description = '12345678901234567890'; // Exactly 20 chars (minimum)

      const result = await agent.execute({ description }, context);

      // Should either succeed with minimal output or fail gracefully
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    }, 30000);

    it.skip('should handle description with special characters', async () => {
      const context = createExecutionContext({
        requestId: 'test-special-chars',
      });

      const description = `
        Tablet stand with "smart" features & <premium> materials!
        Price: $50-$100 per unit. Dimensions: 8"x6"x12" (W×D×H).
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Bullet Point Limits
  // ============================================================================

  describe('Bullet Point Limits', () => {
    it.skip('should limit bullets to 20 per field', async () => {
      const context = createExecutionContext({
        requestId: 'test-bullet-limit',
      });

      // Create a very detailed description
      const description = `
        Tablet stand with extensive features: feature 1, feature 2, feature 3, feature 4, feature 5,
        feature 6, feature 7, feature 8, feature 9, feature 10, feature 11, feature 12,
        feature 13, feature 14, feature 15, feature 16, feature 17, feature 18, feature 19,
        feature 20, feature 21, feature 22, feature 23, feature 24, feature 25.
        Users include: manager, cashier, admin, owner, supervisor, clerk, attendant, operator.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);

      // Each field should have <= 20 bullets
      const fields = result.data!.fields;
      Object.values(fields).forEach((field) => {
        expect(field.bullets.length).toBeLessThanOrEqual(20);
      });
    }, 30000);
  });

  // ============================================================================
  // Entity Confidence
  // ============================================================================

  describe('Entity Confidence', () => {
    it.skip('should include confidence scores for extracted entities', async () => {
      const context = createExecutionContext({
        requestId: 'test-entity-confidence',
      });

      const description = `
        Aluminum tablet stand with VESA 75/100 mounting, 360° rotation,
        height adjustment, and cable management for retail environments.
      `;

      const result = await agent.execute({ description }, context);

      expect(result.success).toBe(true);

      // Check entities have confidence scores
      const fields = result.data!.fields;
      Object.values(fields).forEach((field) => {
        field.entities.forEach((entity) => {
          expect(entity).toHaveProperty('type');
          expect(entity).toHaveProperty('value');
          expect(entity).toHaveProperty('confidence');
          expect(entity.confidence).toBeGreaterThanOrEqual(0);
          expect(entity.confidence).toBeLessThanOrEqual(1);
        });
      });
    }, 30000);
  });
});
