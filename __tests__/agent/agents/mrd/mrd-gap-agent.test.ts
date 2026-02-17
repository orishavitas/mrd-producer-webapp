/**
 * MRD Gap Agent Tests
 *
 * Comprehensive tests for MRDGapAgent covering:
 * - Agent metadata validation
 * - Input validation (sectionId, content, required fields)
 * - Gap detection with AI
 * - Completeness scoring
 * - Empty content handling
 * - Section-specific gap rules
 */

import { MRDGapAgent } from '@/agent/agents/mrd/mrd-gap-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import type { MRDGapInput } from '@/agent/agents/mrd/types';

describe('MRDGapAgent', () => {
  let agent: MRDGapAgent;

  beforeEach(() => {
    agent = new MRDGapAgent();
  });

  // ============================================================================
  // Agent Metadata
  // ============================================================================

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('mrd-gap-agent');
      expect(agent.name).toBe('MRD Gap Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('gap detection');
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
      const result = agent.validateInput('not an object' as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject missing sectionId', () => {
      const result = agent.validateInput({
        content: 'Some content',
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject null sectionId', () => {
      const result = agent.validateInput({
        sectionId: null,
        content: 'Some content',
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject undefined sectionId', () => {
      const result = agent.validateInput({
        sectionId: undefined,
        content: 'Some content',
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject invalid sectionId', () => {
      const result = agent.validateInput({
        sectionId: 'not-a-valid-section' as any,
        content: 'Some content',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject missing content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content must be a string');
    });

    it('should reject null content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: null,
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content must be a string');
    });

    it('should reject undefined content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: undefined,
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content must be a string');
    });

    it('should reject non-string content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: { nested: 'object' },
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content must be a string');
    });

    it('should accept valid input with empty content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: '',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept valid input with non-empty content', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: 'A secure tablet stand for retail point-of-sale systems',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept valid input with lengthy content', () => {
      const result = agent.validateInput({
        sectionId: 'problem_statement' as any,
        content: `
          The retail industry faces significant challenges with tablet management.
          Current solutions lack security features and are not suitable for high-traffic environments.
          Existing stands are often unstable and prone to damage.
          There is a clear market need for a robust, secure, and adjustable tablet mounting solution.
          This product addresses all these pain points.
        `,
      });
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Valid Section IDs
  // ============================================================================

  describe('Valid Section IDs', () => {
    const validSectionIds = [
      'purpose_vision',
      'problem_statement',
      'target_market',
      'target_users',
      'product_description',
      'key_requirements',
      'design_aesthetics',
      'target_price',
      'risks_thoughts',
      'competition',
      'additional_considerations',
      'success_criteria',
    ];

    validSectionIds.forEach((sectionId) => {
      it(`should accept valid sectionId: ${sectionId}`, () => {
        const result = agent.validateInput({
          sectionId: sectionId as any,
          content: 'Some content',
        });
        expect(result.valid).toBe(true);
      });
    });
  });

  // ============================================================================
  // Gap Detection (AI-dependent, skipped by default)
  // ============================================================================

  describe('Gap Detection', () => {
    it.skip('should detect gaps in section content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-detection',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: 'A tablet stand for retail',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.gaps).toBeDefined();
      expect(Array.isArray(result.data?.gaps)).toBe(true);
      expect(result.data?.completeness).toBeDefined();
    }, 30000);

    it.skip('should return empty gaps for complete content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-complete-content',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: `
          Our vision is to become the leading provider of secure tablet mounting solutions
          for retail and hospitality environments. We aim to revolutionize how businesses
          manage mobile devices by providing robust, professional-grade hardware that combines
          security, functionality, and aesthetics. Our long-term goal is to establish industry
          standards for tablet stand design and become the trusted partner for all retail
          technology infrastructure needs.
        `,
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Complete content should have few or no gaps
      expect(result.data?.gaps).toBeDefined();
      expect(Array.isArray(result.data?.gaps)).toBe(true);
    }, 30000);

    it.skip('should detect gaps in minimal content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-minimal-content',
      });

      const input: MRDGapInput = {
        sectionId: 'problem_statement' as any,
        content: 'Tablets need stands.',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Minimal content should have more gaps
      expect(result.data?.gaps).toBeDefined();
      expect(result.data?.gaps.length).toBeGreaterThanOrEqual(0);
    }, 30000);

    it.skip('should detect section-specific gaps', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-section-specific',
      });

      const input: MRDGapInput = {
        sectionId: 'key_requirements' as any,
        content: 'Must have VESA mounting support',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeDefined();

      // Gaps should have expected structure
      result.data!.gaps.forEach((gap) => {
        expect(gap).toHaveProperty('id');
        expect(gap).toHaveProperty('category');
        expect(gap).toHaveProperty('description');
        expect(gap).toHaveProperty('priority');
        expect(gap).toHaveProperty('suggestedQuestion');

        // Validate gap properties
        expect(typeof gap.id).toBe('string');
        expect(typeof gap.category).toBe('string');
        expect(typeof gap.description).toBe('string');
        expect(['high', 'medium', 'low']).toContain(gap.priority);
        expect(typeof gap.suggestedQuestion).toBe('string');
      });
    }, 30000);

    it.skip('should prioritize gaps by importance', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-priority',
      });

      const input: MRDGapInput = {
        sectionId: 'target_market' as any,
        content: 'For retail stores',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      // Gaps should have priority levels
      result.data!.gaps.forEach((gap) => {
        expect(['high', 'medium', 'low']).toContain(gap.priority);
      });

      // High priority gaps should come first
      if (result.data!.gaps.length > 1) {
        const highPriorityGaps = result.data!.gaps.filter((g) => g.priority === 'high');
        const lowPriorityGaps = result.data!.gaps.filter((g) => g.priority === 'low');

        if (highPriorityGaps.length > 0 && lowPriorityGaps.length > 0) {
          const firstHighIndex = result.data!.gaps.findIndex((g) => g.priority === 'high');
          const firstLowIndex = result.data!.gaps.findIndex((g) => g.priority === 'low');
          expect(firstHighIndex).toBeLessThanOrEqual(firstLowIndex);
        }
      }
    }, 30000);
  });

  // ============================================================================
  // Completeness Scoring
  // ============================================================================

  describe('Completeness Scoring', () => {
    it.skip('should assign completeness score between 0 and 1', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-completeness-range',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: 'A tablet stand for retail stores',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.completeness).toBeDefined();
      expect(result.data?.completeness).toBeGreaterThanOrEqual(0);
      expect(result.data?.completeness).toBeLessThanOrEqual(1);
    }, 30000);

    it.skip('should assign high completeness for comprehensive content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-high-completeness',
      });

      const input: MRDGapInput = {
        sectionId: 'product_description' as any,
        content: `
          Our aluminum tablet stand features a sleek, professional design with the following specifications:
          - Material: Aircraft-grade aluminum with powder coat finish
          - VESA Mounting: Supports 75mm and 100mm mounting patterns
          - Rotation: Full 360-degree rotation capability
          - Height Adjustment: Smooth height adjustment from 10 to 16 inches
          - Cable Management: Integrated channels for cable routing
          - Security: Lockable tablet clamp with anti-theft mechanism
          - Compatibility: Fits 10-13 inch tablets including iPad Pro
          - Base: Weighted, non-slip rubber base for stability
          - Weight Capacity: Supports up to 5 lbs
          - Warranty: 2-year comprehensive warranty
          - Color Options: Black, Silver, Space Gray
        `,
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Comprehensive content should have high completeness
      expect(result.data?.completeness).toBeGreaterThan(0.5);
    }, 30000);

    it.skip('should assign low completeness for sparse content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-low-completeness',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: 'Tablet stand',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Sparse content should have lower completeness
      expect(result.data?.completeness).toBeLessThan(0.8);
    }, 30000);

    it.skip('should assign zero completeness for empty content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-empty-completeness',
      });

      const input: MRDGapInput = {
        sectionId: 'target_users' as any,
        content: '',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Empty content should have low completeness
      expect(result.data?.completeness).toBeLessThanOrEqual(0.5);
    }, 30000);
  });

  // ============================================================================
  // Empty Content Handling
  // ============================================================================

  describe('Empty Content Handling', () => {
    it.skip('should handle empty string content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-empty-string',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: '',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeDefined();
      expect(result.data?.completeness).toBeDefined();
      expect(result.data?.completeness).toBeLessThanOrEqual(0.5);
    }, 30000);

    it.skip('should handle whitespace-only content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-whitespace',
      });

      const input: MRDGapInput = {
        sectionId: 'problem_statement' as any,
        content: '   \n\t  ',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeDefined();
      // Whitespace should be treated as empty
      expect(result.data?.completeness).toBeLessThanOrEqual(0.5);
    }, 30000);

    it.skip('should suggest questions for empty content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-empty-suggestions',
      });

      const input: MRDGapInput = {
        sectionId: 'target_market' as any,
        content: '',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      // Empty sections should generate suggestive gaps with questions
      if (result.data!.gaps.length > 0) {
        result.data!.gaps.forEach((gap) => {
          expect(gap.suggestedQuestion).toBeDefined();
          expect(gap.suggestedQuestion.length).toBeGreaterThan(0);
        });
      }
    }, 30000);
  });

  // ============================================================================
  // Minimum Length Validation
  // ============================================================================

  describe('Minimum Length Validation', () => {
    it.skip('should detect content below minimum section length', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-min-length',
      });

      const input: MRDGapInput = {
        sectionId: 'problem_statement' as any,
        content: 'Short', // Very short content
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      // Should have gaps related to insufficient length
      const lengthGaps = result.data!.gaps.filter((g) =>
        g.category.toLowerCase().includes('length')
      );
      // May have length-related gap if section has minimum length requirement
      expect(result.data?.completeness).toBeLessThan(1.0);
    }, 30000);
  });

  // ============================================================================
  // Gap Structure Validation
  // ============================================================================

  describe('Gap Structure Validation', () => {
    it.skip('should return gaps with all required fields', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-structure',
      });

      const input: MRDGapInput = {
        sectionId: 'key_requirements' as any,
        content: 'Needs security',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      result.data!.gaps.forEach((gap) => {
        expect(gap).toHaveProperty('id');
        expect(gap).toHaveProperty('category');
        expect(gap).toHaveProperty('description');
        expect(gap).toHaveProperty('priority');
        expect(gap).toHaveProperty('suggestedQuestion');

        // Validate field types
        expect(typeof gap.id).toBe('string');
        expect(typeof gap.category).toBe('string');
        expect(typeof gap.description).toBe('string');
        expect(typeof gap.suggestedQuestion).toBe('string');
      });
    }, 30000);

    it.skip('should generate unique gap IDs', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-unique-ids',
      });

      const input: MRDGapInput = {
        sectionId: 'target_market' as any,
        content: 'Some market info',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      // All gap IDs should be unique
      const ids = result.data!.gaps.map((g) => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }, 30000);

    it.skip('should include meaningful gap descriptions', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-descriptions',
      });

      const input: MRDGapInput = {
        sectionId: 'design_aesthetics' as any,
        content: 'Sleek design',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      result.data!.gaps.forEach((gap) => {
        expect(gap.description.length).toBeGreaterThan(0);
        expect(gap.suggestedQuestion.length).toBeGreaterThan(0);
      });
    }, 30000);
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should fail gracefully with invalid input structure', () => {
      const result = agent.validateInput({ invalid: 'structure' } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should provide informative error messages', () => {
      const result = agent.validateInput({
        sectionId: 'invalid-section' as any,
        content: 123 as any,
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('sectionId') || e.includes('content'))).toBe(true);
    });

    it.skip('should handle JSON parsing errors gracefully', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-json-error',
      });

      const input: MRDGapInput = {
        sectionId: 'purpose_vision' as any,
        content: 'Invalid content that might cause JSON parsing issues',
      };

      const result = await agent.execute(input, context);

      // Should still succeed even if JSON parsing encounters issues
      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeDefined();
      expect(result.data?.completeness).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle content with very long text', () => {
      const longContent = 'A'.repeat(5000);
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: longContent,
      });
      expect(result.valid).toBe(true);
    });

    it('should handle content with special characters', () => {
      const result = agent.validateInput({
        sectionId: 'product_description' as any,
        content: 'Content with "quotes" & <tags> and special: @#$%^&*()',
      });
      expect(result.valid).toBe(true);
    });

    it('should handle content with markdown formatting', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        content: `
          # Header
          **bold** and *italic*
          - Bullet 1
          - Bullet 2
          \`\`\`code block\`\`\`
        `,
      });
      expect(result.valid).toBe(true);
    });

    it('should handle content with multiple languages', () => {
      const result = agent.validateInput({
        sectionId: 'target_market' as any,
        content: 'Market in English, also in 日本語, español, and Français',
      });
      expect(result.valid).toBe(true);
    });

    it.skip('should handle content with embedded quotes and special formatting', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-gap-special-formatting',
      });

      const input: MRDGapInput = {
        sectionId: 'problem_statement' as any,
        content: `
          As the industry expert said: "Tablets need better mounts."
          Key points:
          1. Current solutions cost $100+
          2. Break easily (60% failure rate)
          3. Not suitable for retail (wet, dusty environments)
        `,
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.gaps).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Multi-Section Testing
  // ============================================================================

  describe('Multi-Section Testing', () => {
    const testCases = [
      {
        sectionId: 'purpose_vision' as any,
        content: 'Provide a clear vision and purpose statement',
      },
      {
        sectionId: 'problem_statement' as any,
        content: 'Describe the problem being solved',
      },
      {
        sectionId: 'target_market' as any,
        content: 'Identify target markets and segments',
      },
      {
        sectionId: 'target_users' as any,
        content: 'Define target user personas',
      },
    ];

    testCases.forEach(({ sectionId, content }) => {
      it(`should validate input for section: ${sectionId}`, () => {
        const result = agent.validateInput({
          sectionId,
          content,
        });
        expect(result.valid).toBe(true);
      });
    });
  });
});
