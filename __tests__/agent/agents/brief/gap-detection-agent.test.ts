/**
 * Gap Detection Agent Tests
 */

import { GapDetectionAgent } from '@/agent/agents/brief/gap-detection-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

describe('GapDetectionAgent', () => {
  let agent: GapDetectionAgent;

  beforeEach(() => {
    agent = new GapDetectionAgent();
  });

  describe('Input Validation', () => {
    it('should reject missing fieldType', () => {
      const result = agent.validateInput({
        fieldType: '' as BriefField,
        entities: [],
        bulletPoints: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fieldType is required');
    });

    it('should reject invalid fieldType', () => {
      const result = agent.validateInput({
        fieldType: 'invalid' as BriefField,
        entities: [],
        bulletPoints: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('fieldType must be one of');
    });

    it('should reject non-array entities', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        entities: 'not an array' as any,
        bulletPoints: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('entities must be an array');
    });

    it('should accept valid input', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        entities: [],
        bulletPoints: ['test'],
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('gap-detection-agent');
      expect(agent.name).toBe('Gap Detection Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('missing critical information');
    });

    it('should not require AI capabilities', () => {
      expect(agent.requiredCapabilities).toEqual([]);
    });
  });

  describe('Product Type Detection', () => {
    it('should detect "tablet stand" from bullet points', async () => {
      const context = createExecutionContext({
        requestId: 'test-tablet-stand',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A secure tablet stand for retail POS'],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.gaps.length).toBeGreaterThan(0);

      // Should have gaps for tablet stand
      const categories = result.data?.gaps.map((g) => g.category) || [];
      expect(categories).toContain('tablet_compatibility');
    });

    it('should detect "display mount" from entities', async () => {
      const context = createExecutionContext({
        requestId: 'test-display-mount',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [
            { type: 'product_type', value: 'display mount', confidence: 0.9 },
          ],
          bulletPoints: ['Mounting solution'],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.gaps.length).toBeGreaterThan(0);

      // Should have gaps for display mount
      const categories = result.data?.gaps.map((g) => g.category) || [];
      expect(categories).toContain('display_size');
    });

    it('should detect "enclosure" product type', async () => {
      const context = createExecutionContext({
        requestId: 'test-enclosure',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['Secure enclosure for iPad'],
        },
        context
      );

      expect(result.success).toBe(true);
      const categories = result.data?.gaps.map((g) => g.category) || [];
      expect(categories).toContain('device_type');
    });
  });

  describe('Gap Detection Logic', () => {
    it('should identify missing dimensions in "what" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-dimensions',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A tablet stand made of aluminum'],
        },
        context
      );

      expect(result.success).toBe(true);
      const gaps = result.data?.gaps || [];

      // Should detect missing dimensions
      const hasDimensionGap = gaps.some(
        (g) => g.category === 'dimensions' || g.category === 'tablet_compatibility'
      );
      expect(hasDimensionGap).toBe(true);
    });

    it('should identify missing target user in "who" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-target-user',
      });

      const result = await agent.execute(
        {
          fieldType: 'who',
          entities: [],
          bulletPoints: ['For retail stores'],
        },
        context
      );

      expect(result.success).toBe(true);
      const gaps = result.data?.gaps || [];

      // Should detect missing target user
      const hasTargetUserGap = gaps.some((g) => g.category === 'target_user');
      expect(hasTargetUserGap).toBe(true);
    });

    it('should have fewer gaps with more complete information', async () => {
      const context = createExecutionContext({
        requestId: 'test-complete',
      });

      // Minimal information
      const resultMinimal = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A stand'],
        },
        context
      );

      // Detailed information
      const resultDetailed = await agent.execute(
        {
          fieldType: 'what',
          entities: [
            { type: 'dimension', value: '12 inches', confidence: 0.9 },
            { type: 'material', value: 'aluminum', confidence: 0.9 },
            { type: 'weight', value: '2 lbs', confidence: 0.9 },
          ],
          bulletPoints: [
            'Tablet stand with adjustable height',
            'Made of aluminum',
            'Weighs 2 lbs',
            'Dimensions: 12 x 8 x 6 inches',
          ],
        },
        context
      );

      expect(resultMinimal.data?.gaps.length).toBeGreaterThan(
        resultDetailed.data?.gaps.length || 0
      );
    });
  });

  describe('Gap Priority', () => {
    it('should prioritize gaps correctly', async () => {
      const context = createExecutionContext({
        requestId: 'test-priority',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A tablet stand'],
        },
        context
      );

      expect(result.success).toBe(true);
      const gaps = result.data?.gaps || [];

      // Should have high, medium, and low priority gaps
      const priorities = gaps.map((g) => g.priority);
      expect(priorities).toContain('high');
    });

    it('should include suggested questions', async () => {
      const context = createExecutionContext({
        requestId: 'test-questions',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A tablet stand'],
        },
        context
      );

      expect(result.success).toBe(true);
      const gaps = result.data?.gaps || [];

      // All gaps should have suggested questions
      for (const gap of gaps) {
        expect(gap.suggestedQuestion).toBeDefined();
        expect(gap.suggestedQuestion.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Completeness Score', () => {
    it('should calculate completeness score', async () => {
      const context = createExecutionContext({
        requestId: 'test-completeness',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          entities: [{ type: 'material', value: 'aluminum', confidence: 0.9 }],
          bulletPoints: ['Made of aluminum', 'Adjustable height'],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.completeness).toBeDefined();
      expect(result.data?.completeness).toBeGreaterThanOrEqual(0);
      expect(result.data?.completeness).toBeLessThanOrEqual(1);
    });

    it('should have higher completeness with more information', async () => {
      const context = createExecutionContext({
        requestId: 'test-completeness-comparison',
      });

      // Minimal info
      const resultMinimal = await agent.execute(
        {
          fieldType: 'what',
          entities: [],
          bulletPoints: ['A stand'],
        },
        context
      );

      // Complete info
      const resultComplete = await agent.execute(
        {
          fieldType: 'what',
          entities: [
            { type: 'dimension', value: '12 inches', confidence: 0.9 },
            { type: 'material', value: 'aluminum', confidence: 0.9 },
            { type: 'weight', value: '2 lbs', confidence: 0.9 },
          ],
          bulletPoints: [
            'Aluminum tablet stand',
            '12 x 8 x 6 inches',
            'Weighs 2 lbs',
            'VESA compatible',
          ],
        },
        context
      );

      expect(resultComplete.data?.completeness || 0).toBeGreaterThan(
        resultMinimal.data?.completeness || 0
      );
    });
  });
});
