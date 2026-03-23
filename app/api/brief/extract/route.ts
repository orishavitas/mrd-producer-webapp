/**
 * Brief Helper - Text Extraction API
 *
 * POST /api/brief/extract
 *
 * Extracts structured bullet points and entities from free-form text.
 * Uses TextExtractionAgent with field-aware extraction strategies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TextExtractionAgent } from '@/agent/agents/brief/text-extraction-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { sanitizeInput } from '@/lib/sanitize';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface ExtractRequest {
  fieldType: BriefField;
  freeText: string;
}

interface ExtractResponse {
  success: boolean;
  bulletPoints?: string[];
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
    span?: string;
  }>;
  confidence?: number;
  error?: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

const VALID_FIELDS: BriefField[] = [
  'what',
  'who',
  'where',
  'moq',
  'must-have',
  'nice-to-have',
];

function validateRequest(body: any): { valid: true; data: ExtractRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { fieldType, freeText } = body;

  if (!fieldType || typeof fieldType !== 'string') {
    return { valid: false, error: 'fieldType is required and must be a string' };
  }

  if (!VALID_FIELDS.includes(fieldType as BriefField)) {
    return {
      valid: false,
      error: `fieldType must be one of: ${VALID_FIELDS.join(', ')}`,
    };
  }

  if (!freeText || typeof freeText !== 'string') {
    return { valid: false, error: 'freeText is required and must be a string' };
  }

  if (freeText.trim().length === 0) {
    return { valid: false, error: 'freeText cannot be empty' };
  }

  if (freeText.length > 10000) {
    return { valid: false, error: 'freeText exceeds maximum length of 10,000 characters' };
  }

  return {
    valid: true,
    data: { fieldType: fieldType as BriefField, freeText },
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
        } as ExtractResponse,
        { status: 400 }
      );
    }

    const { fieldType, freeText } = validation.data;

    // Sanitize input
    const sanitizedText = sanitizeInput(freeText, {
      maxLength: 10000,
      allowMarkdown: true,
    });

    // Create execution context
    const context = createExecutionContext({
      requestId: `brief-extract-${Date.now()}`,
    });

    // Create and execute agent
    const agent = new TextExtractionAgent();
    const result = await agent.execute(
      {
        fieldType,
        freeText: sanitizedText,
      },
      context
    );

    // Handle agent failure
    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Extraction failed',
          details: result.error || 'Unknown error',
        } as ExtractResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        bulletPoints: result.data.bulletPoints,
        entities: result.data.entities,
        confidence: result.data.confidence,
      } as ExtractResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[Brief Extract API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ExtractResponse,
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
