/**
 * Integration tests for /api/mrd/export endpoint
 *
 * Tests POST endpoint that accepts MRD state and returns DOCX file.
 */

import { POST } from '@/app/api/mrd/export/route';
import { generateDocx } from '@/lib/document-generator';
import type { MRDState, MRDSection } from '@/app/mrd-generator/lib/mrd-state';

// Mock the document generator
jest.mock('@/lib/document-generator', () => ({
  generateDocx: jest.fn(),
}));

// Mock section definitions
jest.mock('@/lib/mrd/section-definitions', () => ({
  assembleMarkdownFromSections: jest.fn((sections: Record<string, any>) => {
    // Simple mock implementation
    return Object.entries(sections)
      .map(([id, data]) => `# ${id}\n${data.content || ''}`)
      .join('\n\n');
  }),
  getAllSections: jest.fn(() => [
    { id: 'purpose_vision', number: 1, title: 'Purpose & Vision' },
    { id: 'problem_statement', number: 2, title: 'Problem Statement' },
  ]),
}));

describe('POST /api/mrd/export', () => {
  const mockGenerateDocx = generateDocx as jest.MockedFunction<typeof generateDocx>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockGenerateDocx.mockResolvedValue(Buffer.from('mock-docx-content'));
  });

  const createMockState = (overrides?: Partial<MRDState>): MRDState => ({
    sessionId: 'test-session',
    initialConcept: 'AI-powered smart device',
    sections: {
      purpose_vision: {
        content: 'Purpose and vision content',
        gaps: [],
        hiddenGaps: [],
        isComplete: true,
        isAIProcessing: false,
      },
      problem_statement: {
        content: 'Problem statement content',
        gaps: [],
        hiddenGaps: [],
        isComplete: true,
        isAIProcessing: false,
      },
    },
    activeSectionId: null,
    chatMessages: [],
    processingSections: [],
    previewMode: 'full',
    documentName: 'Smart-Device-MRD-2026-02-16',
    ...overrides,
  });

  describe('Request Validation', () => {
    it('should reject missing state field', async () => {
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('state');
    });

    it('should reject invalid state structure', async () => {
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({
          state: 'not an object',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
    });

    it('should reject state without sections', async () => {
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({
          state: {
            sessionId: 'test',
            initialConcept: 'Test concept',
            documentName: 'Test',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      expect(data.details).toContain('sections');
    });

    it('should accept valid state', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Optional Fields', () => {
    it('should use productName as title if provided', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({
          state,
          productName: 'Custom Product Name',
        }),
      });

      await POST(request);

      // generateDocx is called with markdown and productName as title
      expect(mockGenerateDocx).toHaveBeenCalledWith(
        expect.any(String),
        'Custom Product Name'
      );
    });

    it('should use default title if productName not provided', async () => {
      const state = createMockState({
        documentName: 'State-Document-Name',
      });
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      await POST(request);

      // generateDocx is called with markdown and default title
      expect(mockGenerateDocx).toHaveBeenCalledWith(
        expect.any(String),
        'Market Requirements Document'
      );
    });

    it('should use default title if productName and documentName not provided', async () => {
      const state = createMockState({
        documentName: '',
      });
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      await POST(request);

      // generateDocx is called with markdown and default title
      expect(mockGenerateDocx).toHaveBeenCalledWith(
        expect.any(String),
        'Market Requirements Document'
      );
    });
  });

  describe('DOCX Generation', () => {
    it('should call generateDocx with assembled markdown', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      await POST(request);

      expect(mockGenerateDocx).toHaveBeenCalledWith(
        expect.stringContaining('purpose_vision'),
        expect.any(String)
      );
    });

    it('should return DOCX buffer as response', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      const buffer = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should set correct Content-Disposition header', async () => {
      const state = createMockState({
        documentName: 'Smart-Device-MRD',
      });
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      const disposition = response.headers.get('Content-Disposition');

      expect(disposition).toContain('attachment');
      expect(disposition).toContain('.docx');
    });
  });

  describe('Filename Generation', () => {
    it('should sanitize filename removing special characters', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({
          state,
          productName: 'Product@#$%Name!',
        }),
      });

      const response = await POST(request);
      const disposition = response.headers.get('Content-Disposition');

      expect(disposition).not.toContain('@');
      expect(disposition).not.toContain('#');
      expect(disposition).not.toContain('$');
    });

    it('should preserve spaces in filename', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({
          state,
          productName: 'Product With Spaces',
        }),
      });

      const response = await POST(request);
      const disposition = response.headers.get('Content-Disposition');

      expect(disposition).toContain('Product With Spaces');
    });

    it('should include date in filename', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      const disposition = response.headers.get('Content-Disposition');

      // Should contain YYYY-MM-DD format
      expect(disposition).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should include "MRD" in filename', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      const disposition = response.headers.get('Content-Disposition');

      expect(disposition).toContain('MRD');
    });
  });

  describe('Section Content Processing', () => {
    it('should include all section content in export', async () => {
      const state = createMockState({
        sections: {
          purpose_vision: {
            content: 'Purpose content',
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
          problem_statement: {
            content: 'Problem content',
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
          target_market: {
            content: 'Market content',
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
        },
      });

      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      await POST(request);

      const markdownArg = mockGenerateDocx.mock.calls[0][0];
      expect(markdownArg).toContain('Purpose content');
      expect(markdownArg).toContain('Problem content');
      expect(markdownArg).toContain('Market content');
    });

    it('should handle sections with subsections', async () => {
      const state = createMockState({
        sections: {
          target_market: {
            content: 'Main market content with sufficient detail for this test case',
            subsections: {
              primary_markets: { content: 'Primary markets content with details' },
              core_use_cases: { content: 'Core use cases content with information' },
            },
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
        },
      });

      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);

      // Verify successful response and that generateDocx was called
      expect(response.status).toBe(200);
      expect(mockGenerateDocx).toHaveBeenCalled();
    });

    it('should reject insufficient content (< 50 chars)', async () => {
      const state = createMockState({
        sections: {
          purpose_vision: {
            content: 'Short',
            gaps: [],
            hiddenGaps: [],
            isComplete: false,
            isAIProcessing: false,
          },
        },
      });

      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('insufficient');
    });
  });

  describe('Error Handling', () => {
    it('should handle DOCX generation failure', async () => {
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      mockGenerateDocx.mockRejectedValue(new Error('DOCX generation failed'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost:3000/api/mrd/export', {
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
      const state = createMockState();
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      mockGenerateDocx.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle state with all 12 sections', async () => {
      const allSections: Record<string, any> = {};
      const sectionIds: MRDSection[] = [
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

      sectionIds.forEach((id) => {
        allSections[id] = {
          content: `${id} content`,
          gaps: [],
          hiddenGaps: [],
          isComplete: true,
          isAIProcessing: false,
        };
      });

      const state = createMockState({ sections: allSections });
      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle very long section content', async () => {
      const longContent = 'Long content. '.repeat(5000);
      const state = createMockState({
        sections: {
          purpose_vision: {
            content: longContent,
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
        },
      });

      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle markdown formatting in section content', async () => {
      const state = createMockState({
        sections: {
          purpose_vision: {
            content: '**Bold** text\n\n* Bullet 1\n* Bullet 2\n\n### Subsection',
            gaps: [],
            hiddenGaps: [],
            isComplete: true,
            isAIProcessing: false,
          },
        },
      });

      const request = new Request('http://localhost:3000/api/mrd/export', {
        method: 'POST',
        body: JSON.stringify({ state }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
