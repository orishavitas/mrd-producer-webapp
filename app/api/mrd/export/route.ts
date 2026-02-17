/**
 * MRD Generator - Document Export API
 *
 * POST /api/mrd/export
 *
 * Exports completed MRD state to DOCX (Word document) format.
 * Assembles markdown from all sections and generates professionally styled document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { assembleMarkdownFromSections } from '@/lib/mrd/section-definitions';
import { generateDocx } from '@/lib/document-generator';
import type { MRDState, MRDSection } from '@/app/mrd-generator/lib/mrd-state';

// ============================================================================
// Request/Response Types
// ============================================================================

interface ExportRequest {
  state: MRDState;
  productName?: string;
}

interface ExportResponse {
  success?: boolean;
  documentName?: string;
  error?: string;
  details?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; data: ExportRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  // Validate state object
  if (!b.state || typeof b.state !== 'object') {
    return { valid: false, error: 'state is required and must be an object' };
  }

  const state = b.state as Record<string, unknown>;

  // Validate state structure
  if (typeof state.sessionId !== 'string' || !state.sessionId) {
    return { valid: false, error: 'state.sessionId is required' };
  }

  if (typeof state.initialConcept !== 'string') {
    return { valid: false, error: 'state.initialConcept must be a string' };
  }

  if (!state.sections || typeof state.sections !== 'object') {
    return { valid: false, error: 'state.sections must be an object' };
  }

  // Validate productName if provided
  if (b.productName !== undefined && typeof b.productName !== 'string') {
    return { valid: false, error: 'productName must be a string when provided' };
  }

  return {
    valid: true,
    data: {
      state: b.state as MRDState,
      productName: typeof b.productName === 'string' ? b.productName : undefined,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a sanitized filename for the DOCX document.
 * Format: "ProductName - MRD - YYYY-MM-DD.docx"
 */
function generateDocumentFilename(
  state: MRDState,
  productName?: string
): string {
  // Use provided productName or extract from documentName or initialConcept
  let name = productName || state.documentName || 'MRD';

  // Sanitize: keep alphanumeric, spaces, hyphens, underscores
  name = name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();

  // Limit length
  if (name.length > 50) {
    name = name.substring(0, 50).trim();
  }

  // If still empty, use generic
  if (!name) {
    name = 'MRD';
  }

  // Add timestamp
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  return `${name} - MRD - ${dateStr}`;
}

/**
 * Convert MRDState sections to format expected by assembleMarkdownFromSections.
 */
function prepareSectionsForExport(
  state: MRDState
): Record<
  string,
  { content: string; subsections?: Record<string, string> }
> {
  const prepared: Record<
    string,
    { content: string; subsections?: Record<string, string> }
  > = {};

  for (const [sectionId, sectionState] of Object.entries(state.sections)) {
    if (!sectionState || !sectionState.content) continue;

    const sectionData: { content: string; subsections?: Record<string, string> } =
      {
        content: sectionState.content,
      };

    // Include subsections if they exist
    if (sectionState.subsections && Object.keys(sectionState.subsections).length > 0) {
      sectionData.subsections = {};
      for (const [subId, subState] of Object.entries(sectionState.subsections)) {
        if (subState && subState.content) {
          sectionData.subsections[subId] = subState.content;
        }
      }
    }

    prepared[sectionId] = sectionData;
  }

  return prepared;
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
        } as ExportResponse,
        { status: 400 }
      );
    }

    const { state, productName } = validation.data;

    // Prepare sections for markdown assembly
    const sectionsForExport = prepareSectionsForExport(state);

    // Assemble markdown from sections
    const markdown = assembleMarkdownFromSections(sectionsForExport, {
      productName,
    });

    // Check if markdown has substantial content
    if (!markdown || markdown.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document content is insufficient',
          details:
            'MRD must have at least some content in sections to export. Please fill in section content first.',
        } as ExportResponse,
        { status: 400 }
      );
    }

    // Generate DOCX buffer from markdown
    const documentName = generateDocumentFilename(state, productName);
    const docxBuffer = await generateDocx(markdown, productName || 'Market Requirements Document');

    // Return DOCX file with appropriate headers
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${documentName}.docx"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[MRD Export API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ExportResponse,
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
