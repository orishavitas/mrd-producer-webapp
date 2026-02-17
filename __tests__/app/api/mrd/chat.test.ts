/**
 * Integration tests for /api/mrd/chat endpoint
 *
 * Tests POST endpoint that accepts section context and user message,
 * returns conversational AI response with suggestions.
 */

import { POST } from '@/app/api/mrd/chat/route';
import { MRDChatAgent } from '@/agent/agents/mrd/mrd-chat-agent';
import { MRD_SECTION_IDS, type MRDSection } from '@/app/mrd-generator/lib/mrd-state';

// Mock the agent
jest.mock('@/agent/agents/mrd/mrd-chat-agent');

describe('POST /api/mrd/chat', () => {
  let mockMRDChatAgent: jest.Mocked<MRDChatAgent>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMRDChatAgent = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MRDChatAgent>;

    (MRDChatAgent as jest.MockedClass<typeof MRDChatAgent>).mockImplementation(
      () => mockMRDChatAgent
    );
  });

  describe('Request Validation', () => {
    it('should reject missing sectionId', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('sectionId');
    });

    it('should reject invalid sectionId', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'invalid_section',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('must be one of');
    });

    it('should reject missing userMessage', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('userMessage');
    });

    it('should reject empty userMessage', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: '   ',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('cannot be empty');
    });

    it.each(MRD_SECTION_IDS)('should accept valid sectionId: %s', async (sectionId) => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId,
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should accept empty currentContent', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: '',
          userMessage: 'Help me get started',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize currentContent', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: '<script>alert("xss")</script>Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          currentContent: expect.not.stringContaining('<script>'),
        }),
        expect.anything()
      );
    });

    it('should sanitize userMessage', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: '<img src=x onerror=alert(1)>Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: expect.not.stringContaining('<img'),
        }),
        expect.anything()
      );
    });

    it('should preserve markdown in currentContent', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: '**Bold** and *italic* text',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          currentContent: expect.stringContaining('**Bold**'),
        }),
        expect.anything()
      );
    });
  });

  describe('Agent Execution', () => {
    it('should call MRDChatAgent with required fields', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
          conversationHistory: [],
        }),
        expect.objectContaining({
          requestId: expect.any(String),
        })
      );
    });

    it('should pass optional fields to agent', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
          gaps: [
            {
              id: 'gap-1',
              category: 'Missing',
              description: 'Need info',
              priority: 'high',
              suggestedQuestion: 'What about X?',
            },
          ],
          conversationHistory: [
            { role: 'user', content: 'Previous question' },
            { role: 'assistant', content: 'Previous answer' },
          ],
          initialConcept: 'AI-powered smart device',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          gaps: expect.arrayContaining([
            expect.objectContaining({
              id: 'gap-1',
            }),
          ]),
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' }),
          ]),
          initialConcept: 'AI-powered smart device',
        }),
        expect.anything()
      );
    });

    it('should return AI message and suggestion on success', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'Here is more information about your product.',
          suggestedContent: 'Updated content with more details.',
          isFinalSuggestion: true,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Here is more information about your product.');
      expect(data.suggestedContent).toBe('Updated content with more details.');
      expect(data.isFinalSuggestion).toBe(true);
    });

    it('should handle response without suggestedContent', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'I need more information from you first.',
          isFinalSuggestion: false,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('I need more information from you first.');
      expect(data.suggestedContent).toBeUndefined();
      expect(data.isFinalSuggestion).toBe(false);
    });
  });

  describe('Conversation History', () => {
    it('should reject conversation history exceeding 20 messages', async () => {
      const longHistory = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Message ${i}`,
      }));

      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
          conversationHistory: longHistory,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('20');
    });

    it('should validate conversation history message structure', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
          conversationHistory: [
            { role: 'invalid', content: 'Bad message' },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle MRDChatAgent execution failure', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: false,
        error: 'Agent execution failed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: 'not json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockRejectedValue(new Error('Unexpected error'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long currentContent', async () => {
      const longContent = 'Long content. '.repeat(1000);
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: longContent,
          userMessage: 'Tell me more',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle special characters in userMessage', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: 'What about 50% market share & €500 price?',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should trim whitespace from userMessage', async () => {
      const request = new Request('http://localhost:3000/api/mrd/chat', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: 'purpose_vision',
          currentContent: 'Some content',
          userMessage: '   Tell me more   \n  ',
        }),
      });

      mockMRDChatAgent.execute.mockResolvedValue({
        success: true,
        data: {
          message: 'AI response',
          isFinalSuggestion: false,
        },
      });

      await POST(request);

      expect(mockMRDChatAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessage: 'Tell me more',
        }),
        expect.anything()
      );
    });
  });
});
