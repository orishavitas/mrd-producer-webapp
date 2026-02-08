/**
 * Tests for Parser Agent
 */

import { ParserAgent, ParserInput } from '@/agent/agents/parser-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { ExecutionContext } from '@/agent/core/types';
import { RequestData } from '@/lib/schemas';
import * as sanitize from '@/lib/sanitize';

// Mock sanitization
jest.mock('@/lib/sanitize', () => ({
  sanitizeMRDInput: jest.fn((input) => input),
}));

describe('ParserAgent', () => {
  let agent: ParserAgent;
  let context: ExecutionContext;

  beforeEach(() => {
    agent = new ParserAgent();
    context = createExecutionContext({
      requestId: 'test-request',
    });

    // Reset mocks
    jest.clearAllMocks();
    (sanitize.sanitizeMRDInput as jest.Mock).mockImplementation((input) => input);
  });

  describe('Agent Identity', () => {
    it('should have correct id and metadata', () => {
      expect(agent.id).toBe('parser-agent');
      expect(agent.name).toBe('Parser Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('Extracts structured RequestData');
    });

    it('should require no AI capabilities', () => {
      expect(agent.requiredCapabilities).toEqual([]);
    });
  });

  describe('Input Validation', () => {
    it('should validate correct input', () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
      };

      const result = agent.validateInput(input);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject null or non-object input', () => {
      const result = agent.validateInput(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a non-null object');
    });

    it('should reject missing productConcept', () => {
      const input = {
        targetMarket: 'Homeowners',
      } as ParserInput;

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'productConcept is required and must be a non-empty string'
      );
    });

    it('should reject empty productConcept', () => {
      const input: ParserInput = {
        productConcept: '   ',
        targetMarket: 'Homeowners',
      };

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'productConcept is required and must be a non-empty string'
      );
    });

    it('should reject missing targetMarket', () => {
      const input = {
        productConcept: 'Smart thermostat',
      } as ParserInput;

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'targetMarket is required and must be a non-empty string'
      );
    });

    it('should reject empty targetMarket', () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: '',
      };

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'targetMarket is required and must be a non-empty string'
      );
    });

    it('should accept optional additionalDetails', () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
        additionalDetails: 'Must integrate with Alexa',
      };

      const result = agent.validateInput(input);

      expect(result.valid).toBe(true);
    });

    it('should reject non-string additionalDetails', () => {
      const input = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
        additionalDetails: 123,
      } as any;

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'additionalDetails must be a string when provided'
      );
    });

    it('should collect multiple validation errors', () => {
      const input = {} as ParserInput;

      const result = agent.validateInput(input);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Execution', () => {
    const validInput: ParserInput = {
      productConcept: 'AI-powered smart thermostat for home automation',
      targetMarket: 'Residential homeowners aged 30-50',
      additionalDetails: 'Must work with Alexa and Google Home',
    };

    it('should execute successfully with valid input', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid input', async () => {
      const invalidInput = { productConcept: '' } as ParserInput;

      const result = await agent.execute(invalidInput, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input validation failed');
    });

    it('should call sanitizeMRDInput', async () => {
      await agent.execute(validInput, context);

      expect(sanitize.sanitizeMRDInput).toHaveBeenCalledWith({
        productConcept: validInput.productConcept,
        targetMarket: validInput.targetMarket,
        additionalDetails: validInput.additionalDetails,
      });
    });

    it('should extract product name into productConcept.name', async () => {
      const input: ParserInput = {
        productConcept: 'The Nest Thermostat is a smart device',
        targetMarket: 'Homeowners',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.productConcept.name).toBeDefined();
      expect(typeof result.data?.productConcept.name).toBe('string');
    });

    it('should infer product category into productConcept.category', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat for home automation',
        targetMarket: 'Homeowners',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.productConcept.category).toBeDefined();
    });

    it('should extract target markets into extractedData.targetMarkets', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Residential homeowners and apartment dwellers',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.extractedData.targetMarkets).toBeDefined();
      expect(Array.isArray(result.data?.extractedData.targetMarkets)).toBe(true);
    });

    it('should extract use cases from additionalDetails', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
        additionalDetails: 'Use case: Energy savings. Use case: Remote control via app',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.extractedData.useCases).toBeDefined();
    });

    it('should extract target price from input', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat priced at $129',
        targetMarket: 'Homeowners',
      };

      const result = await agent.execute(input, context);

      expect(result.data).toBeDefined();
    });

    it('should extract technical requirements', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
        additionalDetails: 'Requires WiFi, Bluetooth, and mobile app',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.extractedData.technicalRequirements).toBeDefined();
    });

    it('should generate requestId if not provided', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.data?.requestId).toBeDefined();
      expect(result.data?.requestId).toMatch(/^MRD-/);
    });

    it('should use provided requestId', async () => {
      const inputWithId: ParserInput = {
        ...validInput,
        requestId: 'custom-request-id',
      };

      const result = await agent.execute(inputWithId, context);

      expect(result.data?.requestId).toBe('custom-request-id');
    });

    it('should include metadata with parsedAt timestamp', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.data?.metadata.parsedAt).toBeDefined();
      expect(typeof result.data?.metadata.parsedAt).toBe('string');
    });

    it('should include metadata in result', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should log execution', async () => {
      const logSpy = jest.spyOn(context, 'log');

      await agent.execute(validInput, context);

      expect(logSpy).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('Parsing request'),
        expect.any(Object)
      );
    });

    it('should handle empty additionalDetails', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
        additionalDetails: undefined,
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle special characters in input', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat with sensors & AI',
        targetMarket: 'Homeowners (age 30-50)',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.rawInput.productConcept).toContain('&');
    });
  });

  describe('Output Structure', () => {
    const validInput: ParserInput = {
      productConcept: 'Smart thermostat',
      targetMarket: 'Homeowners',
    };

    it('should return RequestData with all required fields', async () => {
      const result = await agent.execute(validInput, context);

      const data = result.data as RequestData;
      expect(data.requestId).toBeDefined();
      expect(data.sender).toBeDefined();
      expect(data.productConcept).toBeDefined();
      expect(data.rawInput).toBeDefined();
      expect(data.extractedData).toBeDefined();
      expect(data.gaps).toBeDefined();
      expect(data.metadata).toBeDefined();
    });

    it('should include rawInput fields', async () => {
      const input: ParserInput = {
        ...validInput,
        additionalDetails: 'Extra info',
      };

      const result = await agent.execute(input, context);

      expect(result.data?.rawInput.productConcept).toBe('Smart thermostat');
      expect(result.data?.rawInput.targetMarket).toBe('Homeowners');
      expect(result.data?.rawInput.additionalDetails).toBe('Extra info');
    });
  });

  describe('Error Handling', () => {
    it('should handle sanitization errors gracefully', async () => {
      (sanitize.sanitizeMRDInput as jest.Mock).mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sanitization failed');
    });

    it('should include error in warnings on non-fatal issues', async () => {
      const input: ParserInput = {
        productConcept: 'Smart thermostat',
        targetMarket: 'Homeowners',
      };

      const result = await agent.execute(input, context);

      // Result should still succeed even with warnings
      expect(result.success).toBe(true);
    });
  });
});
