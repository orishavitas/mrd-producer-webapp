/**
 * Brief Helper - Gap Detection API
 *
 * POST /api/brief/gaps
 *
 * Identifies missing critical information in brief fields.
 * Uses GapDetectionAgent with product pattern matching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { GapDetectionAgent } from '@/agent/agents/brief/gap-detection-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface GapDetectionRequest {
  fieldType: BriefField;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    span?: string;
  }>;
  bulletPoints: string[];
}

interface GapDetectionResponse {
  success: boolean;
  gaps?: Array<{
    id: string;
    category: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    suggestedQuestion: string;
    exampleAnswer?: string;
  }>;
  completeness?: number;
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

function validateRequest(
  body: unknown
): { valid: true; data: GapDetectionRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { fieldType, entities, bulletPoints } = body as Record<string, unknown>;

  if (!fieldType || typeof fieldType !== 'string') {
    return { valid: false, error: 'fieldType is required and must be a string' };
  }

  if (!VALID_FIELDS.includes(fieldType as BriefField)) {
    return {
      valid: false,
      error: `fieldType must be one of: ${VALID_FIELDS.join(', ')}`,
    };
  }

  if (!Array.isArray(entities)) {
    return { valid: false, error: 'entities must be an array' };
  }

  if (!Array.isArray(bulletPoints)) {
    return { valid: false, error: 'bulletPoints must be an array' };
  }

  // Validate entity structure
  for (const entity of entities) {
    if (
      !entity ||
      typeof entity !== 'object' ||
      typeof entity.type !== 'string' ||
      typeof entity.value !== 'string' ||
      typeof entity.confidence !== 'number'
    ) {
      return {
        valid: false,
        error: 'Each entity must have type, value, and confidence fields',
      };
    }
  }

  // Validate bullet points are strings
  for (const bullet of bulletPoints) {
    if (typeof bullet !== 'string') {
      return { valid: false, error: 'All bullet points must be strings' };
    }
  }

  return {
    valid: true,
    data: { fieldType: fieldType as BriefField, entities, bulletPoints },
  };
}

// ============================================================================
// API Handler
// ============================================================================

const isProd = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        } as GapDetectionResponse,
        { status: 400 }
      );
    }

    const { fieldType, entities, bulletPoints } = validation.data;

    // Create execution context
    const requestId = crypto.randomUUID();
    const logger = createLogger(requestId);
    const context = createExecutionContext({ requestId });

    // Create and execute agent
    const agent = new GapDetectionAgent();
    const result = await agent.execute(
      {
        fieldType,
        entities,
        bulletPoints,
      },
      context
    );

    // Handle agent failure
    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gap detection failed',
          details: isProd ? 'Internal server error' : (result.error || 'Unknown error'),
        } as GapDetectionResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        gaps: result.data.gaps,
        completeness: result.data.completeness,
      } as GapDetectionResponse,
      { status: 200 }
    );
  } catch (error) {
    const logger = createLogger();
    logger.error('Unexpected error', { route: 'brief/gaps', error: error instanceof Error ? error.message : String(error) });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: isProd ? 'Internal server error' : (error instanceof Error ? error.message : 'Unknown error'),
      } as GapDetectionResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS handler for CORS
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
