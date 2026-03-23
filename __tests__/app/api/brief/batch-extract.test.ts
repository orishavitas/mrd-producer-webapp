/**
 * Batch Extract API Integration Tests
 *
 * Tests for POST /api/brief/batch-extract endpoint.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/brief/batch-extract/route';
import { BatchExtractionAgent } from '@/agent/agents/brief/batch-extraction-agent';
import { GapDetectionAgent } from '@/agent/agents/brief/gap-detection-agent';

// Mock the agents
jest.mock('@/agent/agents/brief/batch-extraction-agent');
jest.mock('@/agent/agents/brief/gap-detection-agent');

// ============================================================================
// Helper Functions
// ============================================================================

function createMockRequest(body: any): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /api/brief/batch-extract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Validation Tests
  // --------------------------------------------------------------------------

  describe('Request Validation', () => {
    it('should reject request with missing body', async () => {
      const request = createMockRequest(null);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should reject request with missing description', async () => {
      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toContain('description is required');
    });

    it('should reject description shorter than 20 characters', async () => {
      const request = createMockRequest({
        description: 'Short text',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toContain('at least 20 characters');
    });

    it('should reject description longer than 2000 characters', async () => {
      const longDescription = 'a'.repeat(2001);
      const request = createMockRequest({
        description: longDescription,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toContain('exceeds maximum length');
    });

    it('should accept valid description (20-2000 characters)', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        data: {
          fields: {
            what: { bullets: ['Test'], entities: [], confidence: 0.8 },
            who: { bullets: [], entities: [], confidence: 0 },
            where: { bullets: [], entities: [], confidence: 0 },
            moq: { bullets: [], entities: [], confidence: 0 },
            'must-have': { bullets: [], entities: [], confidence: 0 },
            'nice-to-have': { bullets: [], entities: [], confidence: 0 },
          },
        },
      });

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: 'Valid product description with at least twenty characters',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Sanitization Tests
  // --------------------------------------------------------------------------

  describe('Input Sanitization', () => {
    it('should sanitize HTML tags from description', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        data: {
          fields: {
            what: { bullets: ['Test'], entities: [], confidence: 0.8 },
            who: { bullets: [], entities: [], confidence: 0 },
            where: { bullets: [], entities: [], confidence: 0 },
            moq: { bullets: [], entities: [], confidence: 0 },
            'must-have': { bullets: [], entities: [], confidence: 0 },
            'nice-to-have': { bullets: [], entities: [], confidence: 0 },
          },
        },
      });

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: '<script>alert("xss")</script>Tablet stand for retail stores',
      });
      await POST(request);

      // Verify sanitized input was passed to agent
      expect(mockExecute).toHaveBeenCalled();
      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs.description).not.toContain('<script>');
    });

    it('should preserve markdown formatting', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        success: true,
        data: {
          fields: {
            what: { bullets: ['Test'], entities: [], confidence: 0.8 },
            who: { bullets: [], entities: [], confidence: 0 },
            where: { bullets: [], entities: [], confidence: 0 },
            moq: { bullets: [], entities: [], confidence: 0 },
            'must-have': { bullets: [], entities: [], confidence: 0 },
            'nice-to-have': { bullets: [], entities: [], confidence: 0 },
          },
        },
      });

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: mockExecute,
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: '**Bold** tablet stand with *italic* features for retail',
      });
      await POST(request);

      // Verify markdown is preserved
      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs.description).toContain('**Bold**');
      expect(callArgs.description).toContain('*italic*');
    });
  });

  // --------------------------------------------------------------------------
  // Successful Extraction
  // --------------------------------------------------------------------------

  describe('Successful Extraction', () => {
    it('should return extracted fields on success', async () => {
      const mockBatchData = {
        fields: {
          what: {
            bullets: ['iPad stand', 'Retail use'],
            entities: [
              {
                type: 'product_type',
                value: 'iPad stand',
                confidence: 0.95,
              },
            ],
            confidence: 0.9,
          },
          who: {
            bullets: ['Store managers'],
            entities: [],
            confidence: 0.7,
          },
          where: {
            bullets: ['Retail counters'],
            entities: [],
            confidence: 0.7,
          },
          moq: {
            bullets: ['1000 units'],
            entities: [],
            confidence: 0.8,
          },
          'must-have': {
            bullets: ['VESA compatible'],
            entities: [],
            confidence: 0.8,
          },
          'nice-to-have': {
            bullets: ['Quick release'],
            entities: [],
            confidence: 0.6,
          },
        },
      };

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: mockBatchData,
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: 'iPad stand for retail stores with VESA compatibility',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fields).toBeDefined();
      expect(data.fields.what).toBeDefined();
      expect(data.fields.what.bullets).toContain('iPad stand');
      expect(data.gaps).toBeDefined();
    });

    it('should run gap detection for each field', async () => {
      const mockGapExecute = jest.fn().mockResolvedValue({
        success: true,
        data: { gaps: [] },
      });

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: mockGapExecute,
      }));

      const request = createMockRequest({
        description: 'Tablet stand for retail stores with adjustable height',
      });
      await POST(request);

      // Gap detection should be called 6 times (once per field)
      expect(mockGapExecute).toHaveBeenCalledTimes(6);
    });

    it('should return gaps from gap detection', async () => {
      const mockGaps = [
        {
          id: 'gap-1',
          category: 'product',
          description: 'Missing rotation details',
          priority: 'high',
          suggestedQuestion: 'Does it rotate?',
        },
      ];

      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: mockGaps },
        }),
      }));

      const request = createMockRequest({
        description: 'Tablet stand for retail stores',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.gaps).toBeDefined();
      expect(data.gaps.what).toBeDefined();
      expect(data.gaps.what).toHaveLength(1);
      expect(data.gaps.what[0].id).toBe('gap-1');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should return 500 if batch extraction fails', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: false,
          error: 'AI service unavailable',
        }),
      }));

      const request = createMockRequest({
        description: 'Tablet stand for retail stores',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Batch extraction failed');
    });

    it('should handle gap detection failure gracefully', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: false,
          error: 'Gap detection failed',
        }),
      }));

      const request = createMockRequest({
        description: 'Tablet stand for retail stores',
      });
      const response = await POST(request);
      const data = await response.json();

      // Should still succeed, just without gaps
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fields).toBeDefined();
    });

    it('should return 500 on unexpected error', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      }));

      const request = createMockRequest({
        description: 'Tablet stand for retail stores',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.details).toContain('Unexpected error');
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle description with exactly 20 characters', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: '12345678901234567890', // Exactly 20 chars
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle description with exactly 2000 characters', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: 'a'.repeat(2000), // Exactly 2000 chars
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle special characters in description', async () => {
      (BatchExtractionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: {
            fields: {
              what: { bullets: ['Test'], entities: [], confidence: 0.8 },
              who: { bullets: [], entities: [], confidence: 0 },
              where: { bullets: [], entities: [], confidence: 0 },
              moq: { bullets: [], entities: [], confidence: 0 },
              'must-have': { bullets: [], entities: [], confidence: 0 },
              'nice-to-have': { bullets: [], entities: [], confidence: 0 },
            },
          },
        }),
      }));

      (GapDetectionAgent as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { gaps: [] },
        }),
      }));

      const request = createMockRequest({
        description: 'Tablet stand with "smart" features & <premium> materials! Price: $50-$100.',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
