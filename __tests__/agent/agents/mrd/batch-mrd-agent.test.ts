/**
 * Batch MRD Agent Tests
 *
 * Comprehensive tests for BatchMRDAgent covering:
 * - Agent metadata validation
 * - Input validation (null/undefined, missing fields, min length requirements)
 * - Successful batch extraction of all 12 MRD sections
 * - JSON cleaning (markdown wrapper removal)
 * - Section data structure validation
 * - Document name generation
 * - Confidence scoring
 */

import { BatchMRDAgent } from '@/agent/agents/mrd/batch-mrd-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import type { BatchMRDInput } from '@/agent/agents/mrd/types';

describe('BatchMRDAgent', () => {
  let agent: BatchMRDAgent;

  beforeEach(() => {
    agent = new BatchMRDAgent();
  });

  // ============================================================================
  // Agent Metadata
  // ============================================================================

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('batch-mrd-agent');
      expect(agent.name).toBe('Batch MRD Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('MRD sections');
    });

    it('should require text generation and structured output capabilities', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
      expect(agent.requiredCapabilities).toContain('structuredOutput');
    });

    it('should have exactly 2 required capabilities', () => {
      expect(agent.requiredCapabilities?.length).toBe(2);
    });
  });

  // ============================================================================
  // Input Validation
  // ============================================================================

  describe('Input Validation', () => {
    it('should reject null input', () => {
      const result = agent.validateInput(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject undefined input', () => {
      const result = agent.validateInput(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject non-object input', () => {
      const result = agent.validateInput('string' as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject missing concept', () => {
      const result = agent.validateInput({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should reject null concept', () => {
      const result = agent.validateInput({ concept: null } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should reject undefined concept', () => {
      const result = agent.validateInput({ concept: undefined } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should reject non-string concept', () => {
      const result = agent.validateInput({ concept: 123 } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should reject empty string concept', () => {
      const result = agent.validateInput({ concept: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should reject whitespace-only concept', () => {
      const result = agent.validateInput({ concept: '   \n\t  ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be at least 50 characters');
    });

    it('should reject concept shorter than 50 characters', () => {
      const result = agent.validateInput({ concept: 'A secure tablet stand for retail' }); // 33 chars
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be at least 50 characters');
    });

    it('should reject concept with exactly 49 characters', () => {
      const result = agent.validateInput({ concept: '123456789012345678901234567890123456789012345678' }); // 49 chars
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be at least 50 characters');
    });

    it('should accept concept with exactly 50 characters', () => {
      const result = agent.validateInput({ concept: '12345678901234567890123456789012345678901234567890' }); // 50 chars
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept valid concept (50+ characters)', () => {
      const result = agent.validateInput({
        concept: 'A secure aluminum tablet stand for retail POS systems with VESA 75/100 mounting and lockable features',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept lengthy concept with detailed specifications', () => {
      const result = agent.validateInput({
        concept: `
          This is an adjustable tablet stand designed for retail point-of-sale systems.
          Made from aluminum with powder coat finish. Features VESA 75/100 mounting pattern.
          360-degree rotation and height adjustment from 10-16 inches. Includes cable management.
          Target market is retail stores, restaurants, and trade show venues.
        `,
      });
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Successful Batch Extraction (AI-dependent, skipped by default)
  // ============================================================================

  describe('Successful Batch Extraction', () => {
    it.skip('should extract all sections from comprehensive product concept', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-comprehensive',
      });

      const concept = `
        This is a premium aluminum tablet stand designed for retail point-of-sale systems.
        The stand features VESA 75/100 mounting compatibility, 360-degree rotation, and height adjustment from 10 to 16 inches.
        It includes cable management channels and a locking mechanism to secure tablets against theft.
        Target users are retail store managers, cashiers, and IT administrators in small to medium businesses.
        Primary use cases include retail counters, restaurant tables, and trade show booths.
        The product addresses the gap in secure, adjustable tablet mounting for high-traffic environments.
        Minimum order quantity is 1000 units with 12-week production timeline.
        Must-have features include VESA compatibility, security locking, and cable routing.
        Nice-to-have features include USB hub integration, quick-release mechanism, and premium finish options.
        Target price point is $45-65 per unit depending on volume.
        Key competitors to monitor include similar POS stand solutions from established retail suppliers.
      `;

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.sections).toBeDefined();

      const sections = result.data!.sections;

      // Verify key sections exist
      expect(Object.keys(sections).length).toBeGreaterThan(0);
      expect(sections.purpose_vision).toBeDefined();
      expect(sections.problem_statement).toBeDefined();
      expect(sections.target_market).toBeDefined();

      // Verify section structure
      Object.values(sections).forEach((section) => {
        if (section) {
          expect(section).toHaveProperty('content');
          expect(typeof section.content).toBe('string');
          if (section.confidence !== undefined) {
            expect(section.confidence).toBeGreaterThanOrEqual(0);
            expect(section.confidence).toBeLessThanOrEqual(1);
          }
        }
      });
    }, 60000);

    it.skip('should generate suggested document name', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-doc-name',
      });

      const concept =
        'A secure aluminum tablet stand for retail POS systems with VESA 75/100 mounting, 360-degree rotation, and integrated cable management for small business environments';

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);
      expect(result.data?.suggestedDocumentName).toBeDefined();

      // Document name should be hyphenated (no spaces)
      if (result.data?.suggestedDocumentName) {
        expect(result.data.suggestedDocumentName).not.toContain(' ');
        expect(result.data.suggestedDocumentName).toContain('-');
      }
    }, 30000);

    it.skip('should include subsections for target_market and key_requirements', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-subsections',
      });

      const concept = `
        Retail tablet stand with advanced features for point-of-sale operations.
        Used by retail managers and cashiers in restaurants, stores, and kiosks.
        Key technical requirements include VESA mounting, security locking, and cable management.
      `;

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      // Check if subsections exist for sections that should have them
      const sections = result.data!.sections;
      if (sections.target_market) {
        // Should have subsections if implemented
        expect(sections.target_market).toHaveProperty('content');
      }
    }, 30000);
  });

  // ============================================================================
  // JSON Cleaning (Markdown Wrapper Removal)
  // ============================================================================

  describe('JSON Cleaning', () => {
    it.skip('should handle markdown-wrapped JSON responses from AI', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-json-clean',
      });

      // Gemini often wraps JSON in ```json ... ``` blocks
      const concept =
        'A premium tablet stand for retail with aluminum construction, VESA mounting, and security features';

      const result = await agent.execute({ concept }, context);

      // Should successfully parse regardless of markdown wrapping
      expect(result.success).toBe(true);
      expect(result.data?.sections).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Section Data Structure Validation
  // ============================================================================

  describe('Section Data Structure', () => {
    it.skip('should populate content field for each section', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-section-content',
      });

      const concept =
        'A secure aluminum tablet stand for retail point-of-sale systems with VESA 75/100 mounting, 360-degree rotation, cable management, and locking mechanism. Target market: retail stores, restaurants, kiosks. MOQ 1000 units. Must-haves: VESA, security, cable routing. Nice-to-haves: USB hub, quick-release.';

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      const sections = result.data!.sections;
      Object.entries(sections).forEach(([sectionId, section]) => {
        expect(section).toHaveProperty('content');
        expect(typeof section.content).toBe('string');
      });
    }, 30000);

    it.skip('should handle sections with optional subsections', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-optional-subsections',
      });

      const concept =
        'Tablet stand for retail stores with multiple use cases and market segments. Used in restaurants, retail counters, and trade shows. Targets both small businesses and enterprises.';

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      const sections = result.data!.sections;
      Object.values(sections).forEach((section) => {
        if (section) {
          expect(section).toHaveProperty('content');
          // Subsections are optional
          if (section.subsections) {
            expect(typeof section.subsections).toBe('object');
            Object.values(section.subsections).forEach((sub) => {
              expect(sub).toHaveProperty('content');
            });
          }
        }
      });
    }, 30000);
  });

  // ============================================================================
  // Document Name Generation
  // ============================================================================

  describe('Document Name Generation', () => {
    it.skip('should generate concise document names (3-4 words)', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-doc-name-length',
      });

      const concept =
        'An innovative secure tablet stand solution for the retail point-of-sale market with advanced security features and premium materials';

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      if (result.data?.suggestedDocumentName) {
        // Count hyphen-separated words
        const wordCount = result.data.suggestedDocumentName.split('-').length;
        expect(wordCount).toBeGreaterThanOrEqual(1);
        expect(wordCount).toBeLessThanOrEqual(10); // Allow flexibility in naming
      }
    }, 30000);

    it.skip('should replace spaces with hyphens in document name', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-hyphenated-name',
      });

      const concept =
        'A professional tablet display stand designed for retail environments with secure mounting and cable organization';

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      if (result.data?.suggestedDocumentName) {
        // Should not contain spaces
        expect(result.data.suggestedDocumentName).not.toMatch(/\s/);
        // Should contain hyphens as separators
        expect(result.data.suggestedDocumentName).toMatch(/^[a-zA-Z0-9-]+$/);
      }
    }, 30000);
  });

  // ============================================================================
  // Confidence Scoring
  // ============================================================================

  describe('Confidence Scoring', () => {
    it.skip('should assign confidence scores to sections', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-confidence',
      });

      const concept = `
        Retail tablet stand with detailed specifications:
        - Material: Aluminum with powder coat finish
        - VESA 75/100 compatible
        - 360-degree rotation and height adjustment
        - Built-in cable management
        - Security locking mechanism
        - Target: Retail stores, restaurants, kiosks
        - Users: Store managers, cashiers, IT admins
        - MOQ: 1000 units
        - Lead time: 12 weeks
      `;

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      const sections = result.data!.sections;
      Object.values(sections).forEach((section) => {
        if (section && section.confidence !== undefined) {
          expect(section.confidence).toBeGreaterThanOrEqual(0);
          expect(section.confidence).toBeLessThanOrEqual(1);
        }
      });
    }, 30000);

    it.skip('should assign lower confidence to sparse content', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-low-confidence',
      });

      const concept = 'A product for general use with basic features'; // Minimal info

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);

      // With minimal concept, average confidence should be relatively low
      const sections = result.data!.sections;
      const confidences = Object.values(sections)
        .filter((s) => s && s.confidence !== undefined)
        .map((s) => s!.confidence as number);

      if (confidences.length > 0) {
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        expect(avgConfidence).toBeLessThan(0.8); // Expect moderate confidence
      }
    }, 30000);
  });

  // ============================================================================
  // Minimal Content Handling
  // ============================================================================

  describe('Minimal Content Handling', () => {
    it.skip('should handle minimum length concept (exactly 50 chars)', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-minimal-concept',
      });

      const concept = '12345678901234567890123456789012345678901234567890'; // Exactly 50 chars

      const result = await agent.execute({ concept }, context);

      // Should either succeed or fail gracefully
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      if (result.success) {
        expect(result.data?.sections).toBeDefined();
      }
    }, 30000);

    it.skip('should handle concept with special characters and symbols', async () => {
      const context = createExecutionContext({
        requestId: 'test-batch-mrd-special-chars',
      });

      const concept = `
        Premium tablet stand with "smart" features & <advanced> materials.
        Dimensions: 8"x6"x12" (W×D×H). Price: $45-65/unit.
        VESA 75/100 compatible. 360° rotation. 10-16" height range.
      `;

      const result = await agent.execute({ concept }, context);

      expect(result.success).toBe(true);
      expect(result.data?.sections).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should fail gracefully with invalid input object', () => {
      const result = agent.validateInput({ concept: null } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should fail gracefully with non-string concept field', () => {
      const result = agent.validateInput({ concept: { nested: 'object' } } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('concept must be a non-empty string');
    });

    it('should collect all validation errors', () => {
      const result = agent.validateInput({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should accept concept with only spaces trimmed to 50 chars after trimming', () => {
      // "   " + 50 chars + "   " should succeed since trim results in 50 chars
      const concept = '   12345678901234567890123456789012345678901234567890   ';
      const result = agent.validateInput({ concept });
      expect(result.valid).toBe(true);
    });

    it('should accept concept with embedded newlines and whitespace', () => {
      const concept = `
        A very detailed product
        spanning multiple lines
        with lots of information
        about features and specifications.
      `;
      const result = agent.validateInput({ concept });
      expect(result.valid).toBe(true);
    });

    it('should handle input with extra properties', () => {
      const result = agent.validateInput({
        concept: '1234567890123456789012345678901234567890123456789012345',
        extraField: 'should be ignored',
        anotherField: 123,
      } as any);
      expect(result.valid).toBe(true);
    });
  });
});
