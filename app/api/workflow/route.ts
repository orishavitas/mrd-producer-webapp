import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow, WorkflowInput } from '@/agent/workflow';
import { WorkflowState } from '@/lib/schemas';

/**
 * POST /api/workflow
 *
 * Multi-stage MRD generation workflow endpoint.
 *
 * Request body:
 * - productConcept: string (required for initial request)
 * - targetMarket: string (required for initial request)
 * - additionalDetails?: string
 * - clarificationAnswers?: { question: string; answer: string }[]
 * - existingState?: WorkflowState (for continuing workflow)
 *
 * Response:
 * - state: WorkflowState
 * - needsClarification: boolean
 * - questions?: { questions: ClarificationQuestion[] }
 * - mrd?: string (when complete)
 * - sources?: { title: string; url: string }[]
 * - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input: WorkflowInput = {
      productConcept: body.productConcept,
      targetMarket: body.targetMarket,
      additionalDetails: body.additionalDetails,
      clarificationAnswers: body.clarificationAnswers,
      existingState: body.existingState as WorkflowState | undefined,
    };

    // Validate initial request
    if (!input.existingState && (!input.productConcept || !input.targetMarket)) {
      return NextResponse.json(
        { error: 'Product concept and target market are required for initial request' },
        { status: 400 }
      );
    }

    console.log('[API/Workflow] Processing request...');

    const response = await executeWorkflow(input);

    console.log(`[API/Workflow] Stage: ${response.state.stage}, NeedsClarification: ${response.needsClarification}`);

    // Return appropriate response based on workflow state
    if (response.error) {
      return NextResponse.json(
        {
          error: response.error,
          state: response.state,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      state: response.state,
      needsClarification: response.needsClarification,
      questions: response.questions,
      mrd: response.mrd,
      sources: response.sources,
    });
  } catch (error) {
    console.error('[API/Workflow] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process workflow. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflow
 *
 * Returns information about the workflow API.
 */
export async function GET() {
  return NextResponse.json({
    name: 'MRD Generation Workflow API',
    version: '1.0.0',
    stages: [
      { id: 'parse_request', description: 'Parse and extract structured data from request' },
      { id: 'gap_analysis', description: 'Identify missing information' },
      { id: 'clarify', description: 'Ask user for missing information (max 2 rounds)' },
      { id: 'research', description: 'Conduct competitive market research' },
      { id: 'generate_mrd', description: 'Generate the final MRD document' },
    ],
    usage: {
      initial: {
        method: 'POST',
        body: {
          productConcept: 'string (required)',
          targetMarket: 'string (required)',
          additionalDetails: 'string (optional)',
        },
      },
      continue: {
        method: 'POST',
        body: {
          existingState: 'WorkflowState (required)',
          clarificationAnswers: '{ question: string; answer: string }[] (if clarifying)',
        },
      },
    },
  });
}
