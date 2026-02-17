/**
 * Integration tests for /api/mrd/batch-extract endpoint
 *
 * Tests POST endpoint that accepts a product concept and returns
 * extracted MRD sections with gap detection.
 */

import { POST } from '@/app/api/mrd/batch-extract/route';
import { BatchMRDAgent } from '@/agent/agents/mrd/batch-mrd-agent';
import { MRDGapAgent } from '@/agent/agents/mrd/mrd-gap-agent';
import type { MRDSection } from '@/app/mrd-generator/lib/mrd-state';

// Mock the agents
jest.mock('@/agent/agents/mrd/batch-mrd-agent');
jest.mock('@/agent/agents/mrd/mrd-gap-agent');

describe('POST /api/mrd/batch-extract', () => {
  let mockBatchMRDAgent: jest.Mocked<BatchMRDAgent>;
  let mockMRDGapAgent: jest.Mocked<MRDGapAgent>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BatchMRDAgent
    mockBatchMRDAgent = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BatchMRDAgent>;

    // Mock MRDGapAgent
    mockMRDGapAgent = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<MRDGapAgent>;

    (BatchMRDAgent as jest.MockedClass<typeof BatchMRDAgent>).mockImplementation(
      () => mockBatchMRDAgent
    );
    (MRDGapAgent as jest.MockedClass<typeof MRDGapAgent>).mockImplementation(
      () => mockMRDGapAgent
    );
  });

  describe('Request Validation', () => {
    it('should reject missing concept field', async () => {
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('concept');
    });

    it('should reject non-string concept', async () => {
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept: 12345 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('string');
    });

    it('should reject concept shorter than 50 characters', async () => {
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept: 'Too short' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('50');
    });

    it('should reject concept longer than 5000 characters', async () => {
      const concept = 'a'.repeat(5001);
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toMatch(/5,?000/);
    });

    it('should accept valid concept at minimum length', async () => {
      const concept = 'a'.repeat(50);
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Test-MRD',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should accept valid concept at maximum length', async () => {
      const concept = 'a'.repeat(5000);
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Test-MRD',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Input Sanitization', () => {
    it('should strip HTML tags from concept', async () => {
      const concept = '<script>alert("xss")</script>'.repeat(10); // Make it long enough
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Test-MRD',
        },
      });

      await POST(request);

      // Verify sanitized input was passed to agent
      expect(mockBatchMRDAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          concept: expect.not.stringContaining('<script>'),
        }),
        expect.anything()
      );
    });

    it('should preserve markdown formatting in concept', async () => {
      const concept =
        '**Bold text** and *italic text* with [links](https://example.com). ' +
        'This is a long enough concept to pass validation. '.repeat(3);

      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Test-MRD',
        },
      });

      await POST(request);

      expect(mockBatchMRDAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          concept: expect.stringContaining('**Bold text**'),
        }),
        expect.anything()
      );
    });
  });

  describe('Agent Execution', () => {
    it('should call BatchMRDAgent with sanitized concept', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {
            purpose_vision: { content: 'Purpose content', confidence: 0.9 },
          },
          suggestedDocumentName: 'Product-Concept-MRD',
        },
      });

      mockMRDGapAgent.execute.mockResolvedValue({
        success: true,
        data: {
          gaps: [],
          completeness: 1.0,
        },
      });

      await POST(request);

      expect(mockBatchMRDAgent.execute).toHaveBeenCalledWith(
        { concept: expect.any(String) },
        expect.objectContaining({
          requestId: expect.any(String),
        })
      );
    });

    it('should call MRDGapAgent for each extracted section', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {
            purpose_vision: { content: 'Purpose content' },
            problem_statement: { content: 'Problem content' },
            target_market: { content: 'Market content' },
          },
          suggestedDocumentName: 'Product-MRD',
        },
      });

      mockMRDGapAgent.execute.mockResolvedValue({
        success: true,
        data: {
          gaps: [],
          completeness: 1.0,
        },
      });

      await POST(request);

      // Should call gap agent 3 times (once per section)
      expect(mockMRDGapAgent.execute).toHaveBeenCalledTimes(3);
      expect(mockMRDGapAgent.execute).toHaveBeenCalledWith(
        { sectionId: 'purpose_vision', content: 'Purpose content' },
        expect.anything()
      );
      expect(mockMRDGapAgent.execute).toHaveBeenCalledWith(
        { sectionId: 'problem_statement', content: 'Problem content' },
        expect.anything()
      );
      expect(mockMRDGapAgent.execute).toHaveBeenCalledWith(
        { sectionId: 'target_market', content: 'Market content' },
        expect.anything()
      );
    });

    it('should return sections, gaps, and documentName on success', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {
            purpose_vision: { content: 'Purpose content', confidence: 0.9 },
          },
          suggestedDocumentName: 'Product-Concept-MRD',
        },
      });

      mockMRDGapAgent.execute.mockResolvedValue({
        success: true,
        data: {
          gaps: [
            {
              id: 'gap-1',
              category: 'Missing Info',
              description: 'Need more details',
              priority: 'medium',
              suggestedQuestion: 'What about X?',
            },
          ],
          completeness: 0.7,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sections).toEqual({
        purpose_vision: {
          content: 'Purpose content',
          confidence: 0.9,
        },
      });
      expect(data.gaps).toEqual({
        purpose_vision: [
          {
            id: 'gap-1',
            category: 'Missing Info',
            description: 'Need more details',
            priority: 'medium',
            suggestedQuestion: 'What about X?',
          },
        ],
      });
      expect(data.documentName).toBe('Product-Concept-MRD');
    });
  });

  describe('Error Handling', () => {
    it('should handle BatchMRDAgent execution failure', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: false,
        error: 'Agent execution failed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle MRDGapAgent execution failure gracefully', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {
            purpose_vision: { content: 'Purpose content' },
          },
          suggestedDocumentName: 'Product-MRD',
        },
      });

      // Gap agent fails
      mockMRDGapAgent.execute.mockResolvedValue({
        success: false,
        error: 'Gap detection failed',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed but with no gaps for failed section
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sections).toBeDefined();
      expect(data.gaps?.purpose_vision).toBeUndefined();
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
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
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockRejectedValue(new Error('Unexpected error'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections from BatchMRDAgent', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Empty-MRD',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sections).toEqual({});
      expect(data.gaps).toEqual({});
    });

    it('should handle sections with subsections', async () => {
      const concept = 'A valid product concept that is long enough to pass validation checks.';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {
            target_market: {
              content: 'Main market content',
              subsections: {
                primary_markets: { content: 'Primary content' },
                core_use_cases: { content: 'Use cases content' },
              },
            },
          },
          suggestedDocumentName: 'Market-MRD',
        },
      });

      mockMRDGapAgent.execute.mockResolvedValue({
        success: true,
        data: {
          gaps: [],
          completeness: 1.0,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections?.target_market?.subsections).toEqual({
        primary_markets: { content: 'Primary content' },
        core_use_cases: { content: 'Use cases content' },
      });
    });

    it('should trim whitespace from concept', async () => {
      const concept = '   \n  A valid product concept that has enough characters and lots of whitespace.  \n   ';
      const request = new Request('http://localhost:3000/api/mrd/batch-extract', {
        method: 'POST',
        body: JSON.stringify({ concept }),
      });

      mockBatchMRDAgent.execute.mockResolvedValue({
        success: true,
        data: {
          sections: {},
          suggestedDocumentName: 'Test-MRD',
        },
      });

      await POST(request);

      expect(mockBatchMRDAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          concept: expect.not.stringMatching(/^\s+|\s+$/),
        }),
        expect.anything()
      );
    });
  });
});
