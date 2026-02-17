/**
 * Brief Helper - AI Expansion API
 *
 * POST /api/brief/expand
 *
 * Conversational AI endpoint for expanding and refining brief fields.
 * Supports message history for multi-turn conversations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExpansionAgent } from '@/agent/agents/brief/expansion-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { sanitizeInput } from '@/lib/sanitize';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface ExpansionRequest {
  fieldType: BriefField;
  currentBullets: string[];
  gaps?: Array<{
    category: string;
    suggestedQuestion: string;
    exampleAnswer?: string;
  }>;
  userMessage?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface ExpansionResponse {
  success: boolean;
  message?: string;
  suggestedBullets?: string[];
  isFinalSuggestion?: boolean;
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
): { valid: true; data: ExpansionRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;
  const { fieldType, currentBullets, gaps, userMessage, conversationHistory } =
    b;

  if (!fieldType || typeof fieldType !== 'string') {
    return { valid: false, error: 'fieldType is required and must be a string' };
  }

  if (!VALID_FIELDS.includes(fieldType as BriefField)) {
    return {
      valid: false,
      error: `fieldType must be one of: ${VALID_FIELDS.join(', ')}`,
    };
  }

  if (!Array.isArray(currentBullets)) {
    return { valid: false, error: 'currentBullets must be an array' };
  }

  // Validate bullet points are strings
  for (const bullet of currentBullets) {
    if (typeof bullet !== 'string') {
      return { valid: false, error: 'All bullet points must be strings' };
    }
  }

  // Validate gaps if provided
  if (gaps !== undefined) {
    if (!Array.isArray(gaps)) {
      return { valid: false, error: 'gaps must be an array when provided' };
    }

    for (const gap of gaps) {
      if (
        !gap ||
        typeof gap !== 'object' ||
        typeof gap.category !== 'string' ||
        typeof gap.suggestedQuestion !== 'string'
      ) {
        return {
          valid: false,
          error: 'Each gap must have category and suggestedQuestion fields',
        };
      }
    }
  }

  // Validate userMessage if provided
  if (userMessage !== undefined && typeof userMessage !== 'string') {
    return { valid: false, error: 'userMessage must be a string when provided' };
  }

  // Validate conversation history if provided
  if (conversationHistory !== undefined) {
    if (!Array.isArray(conversationHistory)) {
      return {
        valid: false,
        error: 'conversationHistory must be an array when provided',
      };
    }

    for (const msg of conversationHistory) {
      if (
        !msg ||
        typeof msg !== 'object' ||
        !['user', 'assistant'].includes(msg.role) ||
        typeof msg.content !== 'string'
      ) {
        return {
          valid: false,
          error:
            'Each conversation message must have role (user/assistant) and content',
        };
      }
    }

    // Limit history length
    if (conversationHistory.length > 20) {
      return {
        valid: false,
        error: 'conversationHistory limited to 20 messages',
      };
    }
  }

  return {
    valid: true,
    data: { fieldType: fieldType as BriefField, currentBullets, gaps, userMessage, conversationHistory },
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
        } as ExpansionResponse,
        { status: 400 }
      );
    }

    const { fieldType, currentBullets, gaps, userMessage, conversationHistory } =
      validation.data;

    // Sanitize user message if provided
    const sanitizedMessage = userMessage
      ? sanitizeInput(userMessage, { maxLength: 1000 })
      : undefined;

    // Sanitize conversation history
    const sanitizedHistory = conversationHistory?.map((msg) => ({
      role: msg.role,
      content: sanitizeInput(msg.content, { maxLength: 1000 }),
    }));

    // Create execution context
    const context = createExecutionContext({
      requestId: `brief-expand-${Date.now()}`,
    });

    // Create and execute agent
    const agent = new ExpansionAgent();
    const result = await agent.execute(
      {
        fieldType,
        currentBullets,
        gaps,
        userMessage: sanitizedMessage,
        conversationHistory: sanitizedHistory,
      },
      context
    );

    // Handle agent failure
    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expansion failed',
          details: result.error || 'Unknown error',
        } as ExpansionResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: result.data.message,
        suggestedBullets: result.data.suggestedBullets,
        isFinalSuggestion: result.data.isFinalSuggestion,
      } as ExpansionResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[Brief Expand API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ExpansionResponse,
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
