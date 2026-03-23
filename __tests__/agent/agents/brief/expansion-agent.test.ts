/**
 * Expansion Agent Tests
 */

import { ExpansionAgent } from '@/agent/agents/brief/expansion-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

describe('ExpansionAgent', () => {
  let agent: ExpansionAgent;

  beforeEach(() => {
    agent = new ExpansionAgent();
  });

  describe('Input Validation', () => {
    it('should reject missing fieldType', () => {
      const result = agent.validateInput({
        fieldType: '' as BriefField,
        currentBullets: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fieldType is required');
    });

    it('should reject invalid fieldType', () => {
      const result = agent.validateInput({
        fieldType: 'invalid' as BriefField,
        currentBullets: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('fieldType must be one of');
    });

    it('should reject non-array currentBullets', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        currentBullets: 'not an array' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('currentBullets must be an array');
    });

    it('should accept valid input without optional fields', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        currentBullets: ['test'],
      });

      expect(result.valid).toBe(true);
    });

    it('should accept valid input with all optional fields', () => {
      const result = agent.validateInput({
        fieldType: 'what',
        currentBullets: ['test'],
        gaps: [{ category: 'test', suggestedQuestion: 'test?' }],
        userMessage: 'help me',
        conversationHistory: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: 'hi' },
        ],
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('expansion-agent');
      expect(agent.name).toBe('Expansion Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('conversational');
    });

    it('should require text generation capability', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
    });
  });

  describe('Initial Expansion', () => {
    it('should provide helpful initial message for empty field', async () => {
      const context = createExecutionContext({
        requestId: 'test-initial-empty',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: [],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
      expect(result.data?.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should suggest improvements for existing content', async () => {
      const context = createExecutionContext({
        requestId: 'test-initial-content',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['A tablet stand'],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
      expect(result.data?.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should address gaps when provided', async () => {
      const context = createExecutionContext({
        requestId: 'test-with-gaps',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['A tablet stand'],
          gaps: [
            {
              category: 'tablet_compatibility',
              suggestedQuestion: 'Which tablet sizes does it support?',
              exampleAnswer: '7", 10", 12.9" tablets',
            },
          ],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
      // Response should reference the gaps
      expect(result.data?.message.toLowerCase()).toMatch(/tablet|size/);
    }, 30000);
  });

  describe('Conversational Expansion', () => {
    it('should respond to user questions', async () => {
      const context = createExecutionContext({
        requestId: 'test-user-question',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['Tablet stand for retail'],
          userMessage: 'What materials would be best?',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
      expect(result.data?.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should maintain conversation context', async () => {
      const context = createExecutionContext({
        requestId: 'test-context',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['Tablet stand'],
          conversationHistory: [
            { role: 'user', content: 'What sizes should it support?' },
            {
              role: 'assistant',
              content: '7", 10", and 12.9" tablets are most common',
            },
          ],
          userMessage: 'Should it rotate?',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  describe('Suggested Bullets', () => {
    it('should provide suggested bullets when appropriate', async () => {
      const context = createExecutionContext({
        requestId: 'test-suggestions',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['Tablet stand'],
          userMessage: 'Give me specific bullet points to add',
        },
        context
      );

      expect(result.success).toBe(true);
      // Should have either a message or suggested bullets
      expect(
        result.data?.message || result.data?.suggestedBullets
      ).toBeDefined();
    }, 30000);
  });

  describe('Field-Specific Context', () => {
    it('should use appropriate context for "what" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-what-context',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: [],
          userMessage: 'Help me describe the product',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);

    it('should use appropriate context for "who" field', async () => {
      const context = createExecutionContext({
        requestId: 'test-who-context',
      });

      const result = await agent.execute(
        {
          fieldType: 'who',
          currentBullets: [],
          userMessage: 'Who should use this product?',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  describe('Response Parsing', () => {
    it('should detect final suggestions', async () => {
      const context = createExecutionContext({
        requestId: 'test-final',
      });

      const result = await agent.execute(
        {
          fieldType: 'what',
          currentBullets: ['Tablet stand'],
          userMessage: 'Give me the complete final list',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // isFinalSuggestion is a boolean
      expect(typeof result.data?.isFinalSuggestion).toBe('boolean');
    }, 30000);
  });
});
