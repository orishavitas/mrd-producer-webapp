/**
 * MRD Generation Workflow
 *
 * Routes all MRD generation requests through a multi-agent orchestrator.
 * The orchestrator handles:
 * - Parsing user input
 * - Analyzing gaps and requesting clarification
 * - Conducting market research
 * - Generating the final MRD document
 */

import {
  WorkflowStage,
  WorkflowState,
  GapAssessment,
  createInitialState,
} from '@/lib/schemas';
import { MRDOrchestrator, OrchestratorInput, OrchestratorOutput } from '@/agent/orchestrators/mrd-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';

/**
 * Workflow response containing current state and any data for the client.
 */
export interface WorkflowResponse {
  state: WorkflowState;
  needsClarification: boolean;
  questions?: GapAssessment['clarification'];
  mrd?: string;
  sources?: { title: string; url: string }[];
  error?: string;
}

/**
 * Input for starting or continuing the workflow.
 */
export interface WorkflowInput {
  // Initial request data
  productConcept?: string;
  targetMarket?: string;
  additionalDetails?: string;
  // Clarification answers (for continuing workflow)
  clarificationAnswers?: { question: string; answer: string }[];
  // Existing state (for continuing workflow)
  existingState?: WorkflowState;
}

/**
 * Executes the MRD generation workflow.
 *
 * Routes all requests through the multi-agent orchestrator for consistent,
 * AI-powered MRD generation with gap analysis and adaptive clarification.
 *
 * @param input - Workflow input containing request data or clarification answers.
 * @returns Workflow response with current state and relevant data.
 */
export async function executeWorkflow(input: WorkflowInput): Promise<WorkflowResponse> {
  console.log('[Workflow] Routing to MRD Orchestrator');
  return executeMultiAgentWorkflow(input);
}

/**
 * Executes the MRD generation workflow via the multi-agent orchestrator.
 *
 * Translates WorkflowInput into OrchestratorInput, runs the orchestrator,
 * and maps OrchestratorOutput back to WorkflowResponse.
 */
async function executeMultiAgentWorkflow(input: WorkflowInput): Promise<WorkflowResponse> {
  const orchestrator = new MRDOrchestrator();

  // Build the execution context (provider chain, logging, shared state)
  const context = createExecutionContext({
    config: {
      maxRetries: 3,
      timeoutMs: 180000, // 3 minutes -- research + generation can be slow
      enableFallback: true,
      preferredProvider: 'gemini',
    },
  });

  // Map WorkflowInput to OrchestratorInput
  const orchestratorInput: OrchestratorInput = {
    productConcept: input.productConcept,
    targetMarket: input.targetMarket,
    additionalDetails: input.additionalDetails,
    clarificationAnswers: input.clarificationAnswers,
    existingState: input.existingState,
  };

  const result = await orchestrator.execute(orchestratorInput, context);

  // AgentResult wraps the OrchestratorOutput; unwrap and map to WorkflowResponse
  if (!result.success || !result.data) {
    // Build a minimal error state so the response shape is consistent
    const errorState: WorkflowState = input.existingState
      ? { ...input.existingState, stage: WorkflowStage.ERROR, error: result.error || 'Orchestrator failed', updatedAt: new Date().toISOString() }
      : { ...createInitialState(), stage: WorkflowStage.ERROR, error: result.error || 'Orchestrator failed' };

    return {
      state: errorState,
      needsClarification: false,
      error: result.error || 'Multi-agent orchestrator failed',
    };
  }

  const output: OrchestratorOutput = result.data;

  return {
    state: output.state,
    needsClarification: output.needsClarification,
    questions: output.questions,
    mrd: output.mrd,
    sources: output.sources,
    error: output.error,
  };
}
