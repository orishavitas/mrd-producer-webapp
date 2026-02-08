/**
 * Tests for Market Section Generator
 */

import { MarketSectionGenerator } from '@/agent/agents/generators/market-section-generator';
import { ExecutionContext } from '@/agent/core/types';
import { createMockExecutionContext, createMockProvider } from '@/__tests__/mocks/agent-mocks';

describe('MarketSectionGenerator', () => {
  let generator: MarketSectionGenerator;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    generator = new MarketSectionGenerator();
    mockContext = createMockExecutionContext();
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(generator.id).toBe('market-section-generator');
      expect(generator.name).toBe('Market Section Generator');
      expect(generator.domain).toBe('market');
      expect(generator.sectionRange).toEqual([1, 4]);
    });
  });

  describe('input validation', () => {
    it('should validate required fields', () => {
      const invalidInput = {} as any;
      const result = generator.validateInput(invalidInput);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should accept valid input', () => {
      const validInput = {
        productConcept: 'Floor stand for tablets',
        targetMarket: 'Retail and hospitality',
        researchFindings: [],
        requestId: 'TEST-001',
      };
      const result = generator.validateInput(validInput);
      expect(result.valid).toBe(true);
    });
  });

  describe('section generation', () => {
    it('should generate all 4 market sections', async () => {
      const input = {
        productConcept: 'Adjustable floor stand for tablets',
        targetMarket: 'Retail stores and corporate offices',
        additionalDetails: 'Height adjustable, VESA compatible',
        researchFindings: [
          {
            title: 'Market Research for Tablet Stands',
            url: 'https://example.com/research',
            snippet: 'Growing demand for flexible display solutions',
          },
        ],
        requestId: 'TEST-001',
      };

      const result = await generator.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.sections[1]).toContain('Purpose & Vision');
        expect(result.data.sections[2]).toContain('Problem Statement');
        expect(result.data.sections[3]).toContain('Target Market');
        expect(result.data.sections[4]).toContain('Target Users');

        expect(result.data.confidence[1]).toBeGreaterThan(0);
        expect(result.data.confidence[2]).toBeGreaterThan(0);
        expect(result.data.confidence[3]).toBeGreaterThan(0);
        expect(result.data.confidence[4]).toBeGreaterThan(0);

        expect(result.data.domain).toBe('market');
      }
    });

    it('should include bold formatting for key features', async () => {
      const input = {
        productConcept: 'Premium floor stand',
        targetMarket: 'Healthcare',
        researchFindings: [],
        requestId: 'TEST-002',
      };

      const result = await generator.execute(input, mockContext);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.sections[1]).toContain('**');
      }
    });

    it('should generate use cases based on product type', async () => {
      const input = {
        productConcept: 'Kiosk enclosure for self-service',
        targetMarket: 'Retail and hospitality',
        researchFindings: [],
        requestId: 'TEST-003',
      };

      const result = await generator.execute(input, mockContext);

      expect(result.success).toBe(true);
      if (result.data) {
        const section3 = result.data.sections[3];
        expect(section3).toContain('Use Cases');
        expect(section3).toContain('*');
      }
    });
  });

  describe('data source tracking', () => {
    it('should track data sources correctly', async () => {
      const input = {
        productConcept: 'Wall mount',
        targetMarket: 'Corporate',
        researchFindings: [
          { title: 'Research 1', url: 'https://example.com/1', snippet: 'Data 1' },
        ],
        requestId: 'TEST-004',
      };

      const result = await generator.execute(input, mockContext);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.dataSources[1]).toContain('user');
        expect(result.data.dataSources[3]).toContain('user');
      }
    });
  });
});
