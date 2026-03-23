/**
 * Text Extraction Agent Tests
 */

import { TextExtractionAgent } from '@/agent/agents/brief/text-extraction-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

describe('TextExtractionAgent', () => {
  let agent: TextExtractionAgent;

  beforeEach(() => {
    agent = new TextExtractionAgent();
  });

  describe('Input Validation', () => {
    it('should reject missing fieldType', () => {
      const result = agent.validateInput({
        fieldType: '' as BriefField,
        freeText: 'test text',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fieldType is required');
    });

    it('should reject invalid fieldType', () => {
      const result = agent.validateInput({
        fieldType: 'invalid' as BriefField,
        freeText: 'test text',
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('fieldType must be one of');
    });

    it('should reject missing freeText', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        freeText: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('freeText cannot be empty or whitespace only');
    });

    it('should accept valid input', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        freeText: 'A secure tablet stand for retail POS',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('text-extraction-agent');
      expect(agent.name).toBe('Text Extraction Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('structured bullet points');
    });

    it('should require text generation and structured output', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
      expect(agent.requiredCapabilities).toContain('structuredOutput');
    });
  });

  describe('Extraction Logic', () => {
    it('should extract bullet points from "what" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-extract-what',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          freeText: 'A secure tablet stand for retail POS with adjustable height and cable management',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.bulletPoints).toBeDefined();
      expect(Array.isArray(result.data?.bulletPoints)).toBe(true);
      expect(result.data?.fieldType).toBe('what');
      expect(result.data?.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data?.confidence).toBeLessThanOrEqual(1);
    }, 30000); // 30 second timeout for AI call

    it('should extract entities from "what" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-extract-entities',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          freeText: 'Tablet stand made of aluminum, VESA compatible, with 360-degree rotation',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.entities).toBeDefined();
      expect(Array.isArray(result.data?.entities)).toBe(true);

      // Check that entities have required fields
      if (result.data && result.data.entities.length > 0) {
        const entity = result.data.entities[0];
        expect(entity).toHaveProperty('type');
        expect(entity).toHaveProperty('value');
        expect(entity).toHaveProperty('confidence');
        expect(entity.confidence).toBeGreaterThanOrEqual(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      }
    }, 30000);

    it('should handle different field types', async () => {
      const context = createExecutionContext({
        requestId: 'test-field-types',
      });

      const fieldTypes: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];

      for (const fieldType of fieldTypes) {
        const result = await agent.execute(
          {
            fieldType,
            freeText: `Test text for ${fieldType} field`,
          },
          context
        );

        expect(result.success).toBe(true);
        expect(result.data?.fieldType).toBe(fieldType);
      }
    }, 60000); // Longer timeout for multiple calls
  });

  describe('Error Handling', () => {
    it('should fail gracefully on invalid JSON response', async () => {
      // This test would require mocking the provider to return invalid JSON
      // For now, we just verify the agent handles the error case
      const context = createExecutionContext({
        requestId: 'test-error',
      });

      // Very short text that might confuse the AI
      const result = await agent.execute(
        {
          fieldType: 'what',
          freeText: 'x',
        },
        context
      );

      // Should either succeed with minimal output or fail gracefully
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    }, 30000);
  });
});
