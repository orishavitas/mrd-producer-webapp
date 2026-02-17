/**
 * MRD Generator - Batch Extraction API
 *
 * POST /api/mrd/batch-extract
 *
 * Extracts structured content for ALL 12 MRD sections from initial product concept.
 * Uses BatchMRDAgent for efficient single AI call across all sections.
 * Also runs MRDGapAgent on each section separately to identify information gaps.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BatchMRDAgent } from '@/agent/agents/mrd/batch-mrd-agent';
import { MRDGapAgent } from '@/agent/agents/mrd/mrd-gap-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { sanitizeInput } from '@/lib/sanitize';
import { getEnabledSectionIds } from '@/lib/mrd/section-definitions';
import type { MRDSection } from '@/app/mrd-generator/lib/mrd-state';
import type { Gap } from '@/app/mrd-generator/lib/mrd-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface BatchExtractRequest {
  concept: string;
}

interface BatchExtractResponse {
  success: boolean;
  sections?: Partial<
    Record<
      MRDSection,
      {
        content: string;
        subsections?: Record<string, { content: string }>;
        confidence?: number;
      }
    >
  >;
  gaps?: Partial<Record<MRDSection, Gap[]>>;
  documentName?: string;
  error?: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; data: BatchExtractRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { concept } = body as Record<string, unknown>;

  if (!concept || typeof concept !== 'string') {
    return { valid: false, error: 'concept is required and must be a string' };
  }

  if (concept.trim().length < 50) {
    return {
      valid: false,
      error: 'concept must be at least 50 characters',
    };
  }

  if (concept.length > 5000) {
    return {
      valid: false,
      error: 'concept exceeds maximum length of 5,000 characters',
    };
  }

  return { valid: true, data: { concept } };
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

    const { concept } = validation.data;

    // Sanitize input
    const sanitizedConcept = sanitizeInput(concept, {
      maxLength: 5000,
      allowMarkdown: true,
    });

    // Create execution context with unique request ID
    const context = createExecutionContext({
      requestId: `mrd-batch-extract-${Date.now()}`,
    });

    // Create and execute batch extraction agent
    const batchAgent = new BatchMRDAgent();
    const batchResult = await batchAgent.execute(
      {
        concept: sanitizedConcept,
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

    // Run gap detection on each extracted section separately
    const gapAgent = new MRDGapAgent();
    const gaps: Partial<Record<MRDSection, Gap[]>> = {};

    // Get enabled section IDs to process
    const sectionIds = getEnabledSectionIds() as MRDSection[];

    // Run gap detection for each section that was extracted
    for (const sectionId of sectionIds) {
      const sectionData = batchResult.data.sections[sectionId];

      // Skip if section was not extracted
      if (!sectionData) continue;

      // Run gap detection
      const gapResult = await gapAgent.execute(
        {
          sectionId,
          content: sectionData.content,
        },
        context
      );

      // Store gaps if detection succeeded
      if (gapResult.success && gapResult.data) {
        gaps[sectionId] = gapResult.data.gaps;
      }
    }

    // Return success response with sections and gaps
    return NextResponse.json(
      {
        success: true,
        sections: batchResult.data.sections,
        gaps,
        documentName: batchResult.data.suggestedDocumentName,
      } as BatchExtractResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[MRD Batch Extract API] Unexpected error:', error);

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
