/**
 * MRD Chat Agent Tests
 *
 * Comprehensive tests for MRDChatAgent covering:
 * - Agent metadata validation
 * - Input validation (sectionId, userMessage, required fields)
 * - Successful chat interactions
 * - Response parsing (SUGGESTED_CONTENT marker)
 * - Conversation history handling
 * - Gap context integration
 */

import { MRDChatAgent } from '@/agent/agents/mrd/mrd-chat-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import type { MRDChatInput } from '@/agent/agents/mrd/types';

describe('MRDChatAgent', () => {
  let agent: MRDChatAgent;

  beforeEach(() => {
    agent = new MRDChatAgent();
  });

  // ============================================================================
  // Agent Metadata
  // ============================================================================

  describe('Agent Metadata', () => {
    it('should have correct metadata', () => {
      expect(agent.id).toBe('mrd-chat-agent');
      expect(agent.name).toBe('MRD Chat Agent');
      expect(agent.version).toBe('1.0.0');
      expect(agent.description).toContain('Conversational');
    });

    it('should require text generation capability', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
    });

    it('should have exactly 1 required capability', () => {
      expect(agent.requiredCapabilities?.length).toBe(1);
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
        currentContent: 'Some content',
        userMessage: 'Please refine this',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject null sectionId', () => {
      const result = agent.validateInput({
        sectionId: null,
        currentContent: 'Some content',
        userMessage: 'Please refine this',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject undefined sectionId', () => {
      const result = agent.validateInput({
        sectionId: undefined,
        currentContent: 'Some content',
        userMessage: 'Please refine this',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject invalid sectionId', () => {
      const result = agent.validateInput({
        sectionId: 'invalid-section-id' as any,
        currentContent: 'Some content',
        userMessage: 'Please refine this',
        conversationHistory: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sectionId must be a valid MRD section id');
    });

    it('should reject missing userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage must be a non-empty string');
    });

    it('should reject null userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        userMessage: null,
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage must be a non-empty string');
    });

    it('should reject undefined userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        userMessage: undefined,
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage must be a non-empty string');
    });

    it('should reject non-string userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        userMessage: 123,
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage must be a non-empty string');
    });

    it('should reject empty string userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        userMessage: '',
        conversationHistory: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage must be a non-empty string');
    });

    it('should reject whitespace-only userMessage', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Some content',
        userMessage: '   \n\t  ',
        conversationHistory: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userMessage cannot be empty');
    });

    it('should reject non-string currentContent', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 123,
        userMessage: 'Please refine',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('currentContent must be a string');
    });

    it('should reject null currentContent', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: null,
        userMessage: 'Please refine',
        conversationHistory: [],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('currentContent must be a string');
    });

    it('should accept valid input with valid sectionId', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Current section content',
        userMessage: 'Can you add more detail?',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should accept valid input with empty currentContent', () => {
      const result = agent.validateInput({
        sectionId: 'problem_statement' as any,
        currentContent: '',
        userMessage: 'Start writing the problem statement',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept valid input with all optional fields', () => {
      const result = agent.validateInput({
        sectionId: 'target_market' as any,
        currentContent: 'Market information',
        gaps: [
          {
            id: 'gap-1',
            category: 'Market',
            description: 'Need more details',
            priority: 'high',
            suggestedQuestion: 'Who are the primary users?',
          },
        ],
        userMessage: 'Can you elaborate on the market?',
        conversationHistory: [
          { role: 'user', content: 'Tell me about the market' },
          { role: 'assistant', content: 'The market is retail.' },
        ],
        initialConcept: 'A tablet stand for retail stores',
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
          currentContent: 'Some content',
          userMessage: 'Refine this please',
          conversationHistory: [],
        });
        expect(result.valid).toBe(true);
      });
    });
  });

  // ============================================================================
  // Successful Chat Interactions (AI-dependent, skipped by default)
  // ============================================================================

  describe('Successful Chat Interactions', () => {
    it.skip('should respond to chat message for section refinement', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-basic',
      });

      const input: MRDChatInput = {
        sectionId: 'purpose_vision' as any,
        currentContent: 'A tablet stand for retail point-of-sale systems',
        userMessage: 'Can you make this more compelling and detailed?',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.message).toBeDefined();
      expect(typeof result.data?.message).toBe('string');
      expect(result.data?.message.length).toBeGreaterThan(0);
    }, 30000);

    it.skip('should suggest content revision when asked', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-suggest-content',
      });

      const input: MRDChatInput = {
        sectionId: 'problem_statement' as any,
        currentContent: 'Existing retail solutions are not secure',
        userMessage: 'Please provide a complete revised version of this section',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isFinalSuggestion).toBeDefined();
    }, 30000);

    it.skip('should maintain conversation context across messages', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-history',
      });

      const input: MRDChatInput = {
        sectionId: 'target_market' as any,
        currentContent: 'Retail stores and restaurants',
        conversationHistory: [
          { role: 'user', content: 'What markets should we focus on?' },
          { role: 'assistant', content: 'Focus on retail and hospitality sectors' },
        ],
        userMessage: 'Can you be more specific about the restaurant market?',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);

    it.skip('should incorporate gaps into chat context', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-with-gaps',
      });

      const input: MRDChatInput = {
        sectionId: 'key_requirements' as any,
        currentContent: 'VESA 75/100 mounting, lockable security',
        gaps: [
          {
            id: 'gap-1',
            category: 'Features',
            description: 'Missing performance specifications',
            priority: 'high',
            suggestedQuestion: 'What are the load capacity and rotation speed requirements?',
          },
        ],
        userMessage: 'Address the gap about performance specifications',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Response Parsing
  // ============================================================================

  describe('Response Parsing', () => {
    it.skip('should parse conversational response without suggested content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-conversational',
      });

      const input: MRDChatInput = {
        sectionId: 'purpose_vision' as any,
        currentContent: 'A secure tablet stand for retail',
        userMessage: 'Is this clear enough?',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
      expect(result.data?.isFinalSuggestion).toBe(false);
    }, 30000);

    it.skip('should parse response with SUGGESTED_CONTENT marker', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-suggested-content',
      });

      const input: MRDChatInput = {
        sectionId: 'problem_statement' as any,
        currentContent: 'Retail lacks secure tablet solutions',
        userMessage: 'Revise this to be more comprehensive',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      // If AI provides suggested content, isFinalSuggestion should be true
      if (result.data?.isFinalSuggestion) {
        expect(result.data.suggestedContent).toBeDefined();
        expect(typeof result.data.suggestedContent).toBe('string');
        expect(result.data.suggestedContent?.length).toBeGreaterThan(0);
      }
    }, 30000);

    it.skip('should separate conversational message from suggested content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-separation',
      });

      const input: MRDChatInput = {
        sectionId: 'target_users' as any,
        currentContent: 'Retail managers and cashiers',
        userMessage: 'Please provide a revised version with more detail',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);

      if (result.data?.isFinalSuggestion) {
        // Both message and suggestedContent should exist
        expect(result.data.message).toBeDefined();
        expect(result.data.suggestedContent).toBeDefined();
        // They should be different
        expect(result.data.message).not.toEqual(result.data.suggestedContent);
      }
    }, 30000);
  });

  // ============================================================================
  // Conversation History Handling
  // ============================================================================

  describe('Conversation History Handling', () => {
    it('should accept empty conversation history', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept single-turn conversation history', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [{ role: 'user', content: 'Previous question' }],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept multi-turn conversation history', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First answer' },
          { role: 'user', content: 'Follow-up question' },
          { role: 'assistant', content: 'Follow-up answer' },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it.skip('should incorporate conversation history into prompt', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-multi-turn',
      });

      const input: MRDChatInput = {
        sectionId: 'target_market' as any,
        currentContent: 'Retail and hospitality',
        conversationHistory: [
          { role: 'user', content: 'What are the primary markets?' },
          { role: 'assistant', content: 'The primary markets are retail stores and restaurants.' },
          { role: 'user', content: 'What about kiosks?' },
          { role: 'assistant', content: 'Yes, kiosks are an emerging market segment.' },
        ],
        userMessage: 'Can you elaborate on all three markets in the section content?',
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Gap Context Integration
  // ============================================================================

  describe('Gap Context Integration', () => {
    it('should accept input with no gaps', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept input with single gap', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        gaps: [
          {
            id: 'gap-1',
            category: 'Detail',
            description: 'Need more specifics',
            priority: 'high',
            suggestedQuestion: 'What specifically?',
          },
        ],
        userMessage: 'Message',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept input with multiple gaps', () => {
      const result = agent.validateInput({
        sectionId: 'key_requirements' as any,
        currentContent: 'Requirements listed',
        gaps: [
          {
            id: 'gap-1',
            category: 'Performance',
            description: 'Missing load capacity',
            priority: 'high',
            suggestedQuestion: 'What is the load capacity?',
          },
          {
            id: 'gap-2',
            category: 'Compatibility',
            description: 'Missing device compatibility',
            priority: 'medium',
            suggestedQuestion: 'What devices will it support?',
          },
        ],
        userMessage: 'Address all gaps',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it.skip('should reference gaps when refining content', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-gap-context',
      });

      const input: MRDChatInput = {
        sectionId: 'product_description' as any,
        currentContent: 'Aluminum stand with rotating mount',
        gaps: [
          {
            id: 'gap-1',
            category: 'Materials',
            description: 'Missing material specifications',
            priority: 'high',
            suggestedQuestion: 'What specific aluminum alloy is used?',
          },
        ],
        userMessage: 'Please address the gap about materials',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Initial Concept Integration
  // ============================================================================

  describe('Initial Concept Integration', () => {
    it('should accept input without initialConcept', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should accept input with initialConcept', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Message',
        conversationHistory: [],
        initialConcept: 'A tablet stand for retail point-of-sale systems',
      });
      expect(result.valid).toBe(true);
    });

    it.skip('should use initialConcept to provide context', async () => {
      const context = createExecutionContext({
        requestId: 'test-mrd-chat-initial-concept',
      });

      const input: MRDChatInput = {
        sectionId: 'problem_statement' as any,
        currentContent: '',
        initialConcept:
          'A secure, adjustable aluminum tablet stand for retail point-of-sale systems with VESA 75/100 mounting',
        userMessage: 'Generate a comprehensive problem statement based on the product concept',
        conversationHistory: [],
      };

      const result = await agent.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.data?.message).toBeDefined();
    }, 30000);
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long userMessage', () => {
      const longMessage = 'Please refine this section. '.repeat(100); // Very long message
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: longMessage,
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle userMessage with special characters', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: 'Content',
        userMessage: 'Please refine with "quotes" & <tags> and special chars: @#$%',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle currentContent with markdown', () => {
      const result = agent.validateInput({
        sectionId: 'purpose_vision' as any,
        currentContent: `
          # This is **bold** and *italic*
          - Bullet point 1
          - Bullet point 2

          \`\`\`json
          { "example": "code block" }
          \`\`\`
        `,
        userMessage: 'Enhance this content',
        conversationHistory: [],
      });
      expect(result.valid).toBe(true);
    });
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
        sectionId: 'invalid' as any,
        currentContent: 'Content',
        userMessage: '',
        conversationHistory: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('sectionId'))).toBe(true);
    });
  });
});
