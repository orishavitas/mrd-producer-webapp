/**
 * MRD Generator - AI Chat API
 *
 * POST /api/mrd/chat
 *
 * Conversational AI endpoint for refining and improving MRD sections.
 * Supports message history for multi-turn conversations with context awareness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { MRDChatAgent } from '@/agent/agents/mrd/mrd-chat-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { sanitizeInput } from '@/lib/sanitize';
import { MRD_SECTION_IDS } from '@/app/mrd-generator/lib/mrd-state';
import type { MRDSection, Gap } from '@/app/mrd-generator/lib/mrd-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface ChatRequest {
  sectionId: MRDSection;
  currentContent: string;
  userMessage: string;
  gaps?: Gap[];
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  initialConcept?: string;
}

interface ChatResponse {
  success: boolean;
  message?: string;
  suggestedContent?: string;
  isFinalSuggestion?: boolean;
  error?: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  // Validate sectionId
  if (!b.sectionId || typeof b.sectionId !== 'string') {
    return { valid: false, error: 'sectionId is required and must be a string' };
  }

  if (!MRD_SECTION_IDS.includes(b.sectionId as MRDSection)) {
    return {
      valid: false,
      error: `sectionId must be one of: ${MRD_SECTION_IDS.join(', ')}`,
    };
  }

  // Validate currentContent
  if (typeof b.currentContent !== 'string') {
    return { valid: false, error: 'currentContent must be a string' };
  }

  // Validate userMessage (required and non-empty)
  if (!b.userMessage || typeof b.userMessage !== 'string') {
    return { valid: false, error: 'userMessage is required and must be a string' };
  }

  if ((b.userMessage as string).trim().length === 0) {
    return { valid: false, error: 'userMessage cannot be empty' };
  }

  // Validate gaps if provided
  if (b.gaps !== undefined) {
    if (!Array.isArray(b.gaps)) {
      return { valid: false, error: 'gaps must be an array when provided' };
    }

    for (const gap of b.gaps as unknown[]) {
      if (
        !gap ||
        typeof gap !== 'object' ||
        typeof (gap as Record<string, unknown>).category !== 'string' ||
        typeof (gap as Record<string, unknown>).suggestedQuestion !== 'string'
      ) {
        return {
          valid: false,
          error: 'Each gap must have category and suggestedQuestion fields',
        };
      }
    }
  }

  // Validate conversation history if provided
  if (b.conversationHistory !== undefined) {
    if (!Array.isArray(b.conversationHistory)) {
      return {
        valid: false,
        error: 'conversationHistory must be an array when provided',
      };
    }

    for (const msg of b.conversationHistory as unknown[]) {
      if (
        !msg ||
        typeof msg !== 'object' ||
        !['user', 'assistant'].includes((msg as Record<string, unknown>).role as string) ||
        typeof (msg as Record<string, unknown>).content !== 'string'
      ) {
        return {
          valid: false,
          error:
            'Each conversation message must have role (user/assistant) and content',
        };
      }
    }

    // Limit history length
    if (b.conversationHistory.length > 20) {
      return {
        valid: false,
        error: 'conversationHistory limited to 20 messages',
      };
    }
  }

  // Validate initialConcept if provided
  if (b.initialConcept !== undefined && typeof b.initialConcept !== 'string') {
    return { valid: false, error: 'initialConcept must be a string when provided' };
  }

  return {
    valid: true,
    data: {
      sectionId: b.sectionId as MRDSection,
      currentContent: (b.currentContent as string) ?? '',
      userMessage: (b.userMessage as string).trim(),
      gaps: (b.gaps as Gap[] | undefined) ?? undefined,
      conversationHistory: (b.conversationHistory as ChatRequest['conversationHistory']) ?? undefined,
      initialConcept: typeof b.initialConcept === 'string' ? b.initialConcept : undefined,
    },
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
        } as ChatResponse,
        { status: 400 }
      );
    }

    const {
      sectionId,
      currentContent,
      userMessage,
      gaps,
      conversationHistory,
      initialConcept,
    } = validation.data;

    // Sanitize user message
    const sanitizedMessage = sanitizeInput(userMessage, { maxLength: 1000 });

    // Sanitize current content
    const sanitizedContent = sanitizeInput(currentContent, {
      maxLength: 50000,
      allowMarkdown: true,
    });

    // Sanitize conversation history
    const sanitizedHistory = conversationHistory?.map((msg) => ({
      role: msg.role,
      content: sanitizeInput(msg.content, { maxLength: 1000 }),
    }));

    // Sanitize initial concept if provided
    const sanitizedConcept = initialConcept
      ? sanitizeInput(initialConcept, { maxLength: 5000 })
      : undefined;

    // Create execution context with unique request ID
    const context = createExecutionContext({
      requestId: `mrd-chat-${Date.now()}`,
    });

    // Create and execute chat agent
    const agent = new MRDChatAgent();
    const result = await agent.execute(
      {
        sectionId,
        currentContent: sanitizedContent,
        userMessage: sanitizedMessage,
        gaps,
        conversationHistory: sanitizedHistory || [],
        initialConcept: sanitizedConcept,
      },
      context
    );

    // Handle agent failure
    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat request failed',
          details: result.error || 'Unknown error',
        } as ChatResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: result.data.message,
        suggestedContent: result.data.suggestedContent,
        isFinalSuggestion: result.data.isFinalSuggestion,
      } as ChatResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[MRD Chat API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ChatResponse,
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
