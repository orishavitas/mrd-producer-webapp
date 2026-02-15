/**
 * Brief Helper - Batch Extraction API
 *
 * POST /api/brief/batch-extract
 *
 * Extracts structured data for ALL 6 fields from initial product description.
 * Uses BatchExtractionAgent for efficient single AI call.
 * Also runs GapDetectionAgent on each field separately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BatchExtractionAgent } from '@/agent/agents/brief/batch-extraction-agent';
import { GapDetectionAgent } from '@/agent/agents/brief/gap-detection-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { sanitizeInput } from '@/lib/sanitize';
import { BriefField } from '@/app/brief-helper/lib/brief-state';
import { Gap } from '@/app/brief-helper/lib/brief-state';
import { ExtractedEntity } from '@/agent/agents/brief/types';

// ============================================================================
// Request/Response Types
// ============================================================================

interface BatchExtractRequest {
  description: string;
}

interface BatchExtractResponse {
  success: boolean;
  fields?: {
    [K in BriefField]?: {
      bullets: string[];
      entities: ExtractedEntity[];
      confidence: number;
    };
  };
  gaps?: {
    [K in BriefField]?: Gap[];
  };
  error?: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(
  body: any
): { valid: true; data: BatchExtractRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { description } = body;

  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'description is required and must be a string' };
  }

  if (description.trim().length < 20) {
    return {
      valid: false,
      error: 'description must be at least 20 characters',
    };
  }

  if (description.length > 2000) {
    return {
      valid: false,
      error: 'description exceeds maximum length of 2,000 characters',
    };
  }

  return {
    valid: true,
    data: { description },
  };
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error,
        } as BatchExtractResponse,
        { status: 400 }
      );
    }

    const { description } = validation.data;

    // Sanitize input
    const sanitizedDescription = sanitizeInput(description, {
      maxLength: 2000,
      allowMarkdown: true,
    });

    // Create execution context
    const context = createExecutionContext({
      requestId: `brief-batch-extract-${Date.now()}`,
    });

    // Create and execute batch extraction agent
    const batchAgent = new BatchExtractionAgent();
    const batchResult = await batchAgent.execute(
      {
        description: sanitizedDescription,
      },
      context
    );

    // Handle batch extraction failure
    if (!batchResult.success || !batchResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Batch extraction failed',
          details: batchResult.error || 'Unknown error',
        } as BatchExtractResponse,
        { status: 500 }
      );
    }

    // Run gap detection on each field separately
    const gapAgent = new GapDetectionAgent();
    const gaps: { [K in BriefField]?: Gap[] } = {};

    const fieldTypes: BriefField[] = [
      'what',
      'who',
      'where',
      'moq',
      'must-have',
      'nice-to-have',
    ];

    for (const fieldType of fieldTypes) {
      const fieldData = batchResult.data.fields[fieldType];

      // Run gap detection
      const gapResult = await gapAgent.execute(
        {
          fieldType,
          entities: fieldData.entities,
          bulletPoints: fieldData.bullets,
        },
        context
      );

      // Store gaps if detection succeeded
      if (gapResult.success && gapResult.data) {
        gaps[fieldType] = gapResult.data.gaps;
      }
    }

    // Return success response with fields and gaps
    return NextResponse.json(
      {
        success: true,
        fields: batchResult.data.fields,
        gaps,
      } as BatchExtractResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[Brief Batch Extract API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as BatchExtractResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS handler for CORS (if needed)
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
