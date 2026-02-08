/**
 * MRD Orchestrator
 *
 * Coordinates the full MRD generation pipeline using the Phase 2 agents:
 *   1. ParserAgent      -- extract structured data from raw input
 *   2. GapAnalyzerAgent -- detect missing info, decide clarify/proceed
 *   3. (clarification loop -- up to 2 rounds, managed here)
 *   4. Research stage   -- Gemini search grounding (reuses lib/gemini
 *                          directly; dedicated research sub-agents are
 *                          planned for Phase 3)
 *   5. MRDGeneratorAgent -- produce the final document
 *
 * The orchestrator produces the same WorkflowResponse shape used by the
 * legacy workflow so the API route requires no changes.  It also stores
 * intermediate results in context.state for observability and potential
 * re-use by downstream agents.
 *
 * Extends BaseOrchestratorAgent which provides executeParallel /
 * executeSequence helpers, though this orchestrator orchestrates manually
 * to support the clarification loop (which is inherently interactive and
 * cannot be expressed as a straight sequence).
 */

import { BaseOrchestratorAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult, Agent, AgentResult } from '@/agent/core/types';
import {
  WorkflowState,
  WorkflowStage,
  RequestData,
  GapAssessment,
  ResearchData,
  SearchResultData,
  ClarificationAnswers,
  MRDOutput,
  createInitialState,
} from '@/lib/schemas';
import { conductResearch, isGeminiAvailable, GroundedSource } from '@/lib/gemini';

import { ParserAgent, ParserInput } from '@/agent/agents/parser-agent';
import { GapAnalyzerAgent, GapAnalyzerInput } from '@/agent/agents/gap-analyzer-agent';
import { MRDGeneratorAgent, MRDGeneratorInput } from '@/agent/agents/mrd-generator-agent';

// ---------------------------------------------------------------------------
// Re-export WorkflowResponse so workflow.ts can import from one place
// ---------------------------------------------------------------------------

export interface OrchestratorInput {
  /** Product concept text (required for new requests). */
  productConcept?: string;
  /** Target market text (required for new requests). */
  targetMarket?: string;
  /** Optional additional details. */
  additionalDetails?: string;
  /** Clarification answers when continuing after a clarification round. */
  clarificationAnswers?: { question: string; answer: string }[];
  /** Existing workflow state when continuing a previously paused workflow. */
  existingState?: WorkflowState;
}

export interface OrchestratorOutput {
  /** The live workflow state after this execution step. */
  state: WorkflowState;
  /** True when the workflow is paused waiting for user clarification. */
  needsClarification: boolean;
  /** Clarification questions to present to the user (when needsClarification is true). */
  questions?: GapAssessment['clarification'];
  /** The final MRD markdown (when the workflow reaches COMPLETE). */
  mrd?: string;
  /** Deduplicated sources used in the MRD. */
  sources?: { title: string; url: string }[];
  /** Error message if something went wrong. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class MRDOrchestrator extends BaseOrchestratorAgent<OrchestratorInput, OrchestratorOutput> {
  readonly id = 'mrd-orchestrator';
  readonly name = 'MRD Orchestrator';
  readonly version = '1.0.0';
  readonly description =
    'Coordinates the full MRD generation pipeline: parsing, gap analysis, clarification loop, research, and document generation';

  // Sub-agent instances
  private readonly parserAgent = new ParserAgent();
  private readonly gapAnalyzerAgent = new GapAnalyzerAgent();
  private readonly mrdGeneratorAgent = new MRDGeneratorAgent();

  // -----------------------------------------------------------------------
  // OrchestratorAgent contract
  // -----------------------------------------------------------------------

  getSubAgents(): Agent[] {
    return [this.parserAgent, this.gapAnalyzerAgent, this.mrdGeneratorAgent];
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: OrchestratorInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    // If no existing state is provided this is a fresh request -- both
    // productConcept and targetMarket are required.
    if (!input.existingState) {
      const errors: string[] = [];
      if (!input.productConcept || input.productConcept.trim().length === 0) {
        errors.push('productConcept is required for new requests');
      }
      if (!input.targetMarket || input.targetMarket.trim().length === 0) {
        errors.push('targetMarket is required for new requests');
      }
      if (errors.length > 0) return { valid: false, errors };
    }

    return { valid: true };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: OrchestratorInput,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    // Restore or create workflow state
    let state: WorkflowState = input.existingState
      ? { ...input.existingState, updatedAt: new Date().toISOString() }
      : createInitialState();

    context.log('info', `[${this.id}] Starting orchestration`, {
      stage: state.stage,
      isResume: !!input.existingState,
    });

    try {
      // Walk through stages until we hit a terminal state or need user input
      while (state.stage !== WorkflowStage.COMPLETE && state.stage !== WorkflowStage.ERROR) {
        const stepResult = await this.executeStage(state, input, context);
        state = stepResult.state;

        // Pause and return to caller if clarification is needed
        if (stepResult.needsClarification) {
          context.log('info', `[${this.id}] Pausing for clarification`, {
            round: state.clarificationRound,
            questions: stepResult.questions?.questions.length ?? 0,
          });
          // Persist state so caller can resume
          context.state.set('workflowState', state);
          return stepResult;
        }

        if (state.stage === WorkflowStage.ERROR) {
          break;
        }
      }

      // Pipeline reached a terminal state
      context.state.set('workflowState', state);
      return this.buildFinalOutput(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown orchestrator error';
      context.log('error', `[${this.id}] Orchestration failed`, { error: message });
      state.stage = WorkflowStage.ERROR;
      state.error = message;
      context.state.set('workflowState', state);
      return { state, needsClarification: false, error: message };
    }
  }

  // -----------------------------------------------------------------------
  // Stage dispatcher
  // -----------------------------------------------------------------------

  private async executeStage(
    state: WorkflowState,
    input: OrchestratorInput,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    context.log('info', `[${this.id}] Executing stage: ${state.stage}`);

    switch (state.stage) {
      case WorkflowStage.PARSE_REQUEST:
        return this.stageParse(state, input, context);

      case WorkflowStage.GAP_ANALYSIS:
        return this.stageGapAnalysis(state, context);

      case WorkflowStage.CLARIFY:
        return this.stageClarify(state, input, context);

      case WorkflowStage.RESEARCH:
        return this.stageResearch(state, context);

      case WorkflowStage.GENERATE_MRD:
        return this.stageGenerateMRD(state, context);

      default:
        return { state, needsClarification: false };
    }
  }

  // -----------------------------------------------------------------------
  // Stage 1: Parse
  // -----------------------------------------------------------------------

  private async stageParse(
    state: WorkflowState,
    input: OrchestratorInput,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    if (!input.productConcept || !input.targetMarket) {
      state.stage = WorkflowStage.ERROR;
      state.error = 'Product concept and target market are required';
      return { state, needsClarification: false, error: state.error };
    }

    const parserInput: ParserInput = {
      productConcept: input.productConcept,
      targetMarket: input.targetMarket,
      additionalDetails: input.additionalDetails,
      requestId: state.requestId,
    };

    const result = await this.parserAgent.execute(parserInput, context);

    if (!result.success || !result.data) {
      state.stage = WorkflowStage.ERROR;
      state.error = result.error || 'Parser agent failed without error detail';
      return { state, needsClarification: false, error: state.error };
    }

    state.requestData = result.data;
    state.stage = WorkflowStage.GAP_ANALYSIS;
    context.state.set('requestData', result.data);

    return { state, needsClarification: false };
  }

  // -----------------------------------------------------------------------
  // Stage 2: Gap Analysis
  // -----------------------------------------------------------------------

  private async stageGapAnalysis(
    state: WorkflowState,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    if (!state.requestData) {
      state.stage = WorkflowStage.ERROR;
      state.error = 'No request data available for gap analysis';
      return { state, needsClarification: false, error: state.error };
    }

    // Collect questions already asked across all previous rounds
    const previousQuestions = state.clarificationHistory.flatMap((ch) =>
      ch.answers.map((a) => a.question)
    );

    const gapInput: GapAnalyzerInput = {
      requestData: state.requestData,
      clarificationRound: state.clarificationRound,
      previousQuestions,
    };

    const result = await this.gapAnalyzerAgent.execute(gapInput, context);

    if (!result.success || !result.data) {
      state.stage = WorkflowStage.ERROR;
      state.error = result.error || 'Gap analyzer agent failed without error detail';
      return { state, needsClarification: false, error: state.error };
    }

    const assessment = result.data;
    state.gapAssessment = assessment;
    context.state.set('gapAssessment', assessment);

    // Route based on the decision
    if (assessment.decision === 'clarify') {
      state.stage = WorkflowStage.CLARIFY;
      return {
        state,
        needsClarification: true,
        questions: assessment.clarification,
      };
    }

    if (assessment.decision === 'escalate') {
      state.stage = WorkflowStage.ERROR;
      state.error = assessment.escalateReason || 'Request requires human review';
      return { state, needsClarification: false, error: state.error };
    }

    // Decision is 'proceed'
    state.stage = WorkflowStage.RESEARCH;
    return { state, needsClarification: false };
  }

  // -----------------------------------------------------------------------
  // Stage 3: Clarify (receive user answers and re-run gap analysis)
  // -----------------------------------------------------------------------

  private async stageClarify(
    state: WorkflowState,
    input: OrchestratorInput,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    // If no answers have arrived yet, remain paused
    if (!input.clarificationAnswers || input.clarificationAnswers.length === 0) {
      return {
        state,
        needsClarification: true,
        questions: state.gapAssessment?.clarification,
      };
    }

    if (!state.requestData) {
      state.stage = WorkflowStage.ERROR;
      state.error = 'No request data available for clarification merge';
      return { state, needsClarification: false, error: state.error };
    }

    context.log('info', `[${this.id}] Merging clarification answers`, {
      answerCount: input.clarificationAnswers.length,
      newRound: state.clarificationRound + 1,
    });

    // Record the round
    const clarificationRecord: ClarificationAnswers = {
      round: state.clarificationRound + 1,
      answers: input.clarificationAnswers,
    };
    state.clarificationHistory.push(clarificationRecord);
    state.clarificationRound++;

    // Merge answers into request data using the static helper on GapAnalyzerAgent
    state.requestData = GapAnalyzerAgent.mergeAnswers(state.requestData, clarificationRecord);
    context.state.set('requestData', state.requestData);

    // Loop back to gap analysis
    state.stage = WorkflowStage.GAP_ANALYSIS;
    return { state, needsClarification: false };
  }

  // -----------------------------------------------------------------------
  // Stage 4: Research
  //
  // Reuses lib/gemini conductResearch directly.  Dedicated research
  // sub-agents (competitor-researcher, trend-researcher, pricing-researcher)
  // are defined in default.yaml and AGENT.md but are planned for Phase 3.
  // -----------------------------------------------------------------------

  private async stageResearch(
    state: WorkflowState,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    if (!state.requestData) {
      state.stage = WorkflowStage.ERROR;
      state.error = 'No request data available for research';
      return { state, needsClarification: false, error: state.error };
    }

    const { productConcept, extractedData, rawInput } = state.requestData;
    const { targetMarkets } = extractedData;

    const researchTopic = `${productConcept.name} for ${targetMarkets.join(', ')} market`;
    const researchContext =
      `Product concept: ${rawInput.productConcept}\n` +
      `Target market: ${rawInput.targetMarket}` +
      (rawInput.additionalDetails ? `\nAdditional details: ${rawInput.additionalDetails}` : '');

    context.log('info', `[${this.id}] Conducting research`, { topic: researchTopic });

    let allSearchResults: SearchResultData[] = [];
    let searchQueries: string[] = [];
    let researchSummary = '';

    if (isGeminiAvailable()) {
      try {
        const research = await conductResearch(researchTopic, researchContext);
        researchSummary = research.text;
        searchQueries = research.searchQueries;
        allSearchResults = research.sources.map((source: GroundedSource) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet || '',
          query: 'Gemini Search Grounding',
        }));

        context.log('info', `[${this.id}] Research complete via Gemini`, {
          sources: allSearchResults.length,
          queries: searchQueries.length,
        });
      } catch (error) {
        context.log('warn', `[${this.id}] Gemini research failed, using mock data`, {
          error: error instanceof Error ? error.message : String(error),
        });
        allSearchResults = getMockResearchResults(productConcept.name, targetMarkets);
        searchQueries = ['fallback'];
      }
    } else {
      context.log('info', `[${this.id}] Gemini not available, using mock research data`);
      allSearchResults = getMockResearchResults(productConcept.name, targetMarkets);
      searchQueries = ['mock'];
    }

    const researchData: ResearchData = {
      researchId: `RES-${state.requestId}`,
      conductedAt: new Date().toISOString(),
      searchResults: allSearchResults,
      searchQueries,
      competitorsSearched: ['Google Search (via Gemini)'],
      productsFound: [],
      marketAnalysis: {
        priceRangeObserved: null,
        pricePositioningRecommendation: 'See research summary for pricing insights',
        marketGaps: [],
        differentiationOpportunities: [],
        competitiveThreats: [],
        marketTrends: researchSummary
          ? [researchSummary]
          : allSearchResults.map((r) => r.snippet).filter(Boolean).slice(0, 5),
      },
      limitations: isGeminiAvailable()
        ? ['Research based on Gemini AI with Google Search grounding']
        : ['Research based on mock data - configure GOOGLE_API_KEY for real research'],
      researchQuality: {
        productsFoundCount: allSearchResults.length,
        meetsMinimum: allSearchResults.length >= 1,
        confidenceScore: allSearchResults.length >= 3 ? 80 : allSearchResults.length >= 1 ? 60 : 30,
        gapsInResearch: allSearchResults.length === 0 ? ['No search results found'] : [],
      },
    };

    state.researchData = researchData;
    state.stage = WorkflowStage.GENERATE_MRD;
    context.state.set('researchData', researchData);

    return { state, needsClarification: false };
  }

  // -----------------------------------------------------------------------
  // Stage 5: Generate MRD
  // -----------------------------------------------------------------------

  private async stageGenerateMRD(
    state: WorkflowState,
    context: ExecutionContext
  ): Promise<OrchestratorOutput> {
    if (!state.requestData || !state.researchData) {
      state.stage = WorkflowStage.ERROR;
      state.error = 'Missing data for MRD generation';
      return { state, needsClarification: false, error: state.error };
    }

    const { rawInput } = state.requestData;

    // Flatten all clarification Q&A across rounds
    const clarifications = state.clarificationHistory.flatMap((ch) => ch.answers);

    // Build research findings list from search results
    const researchFindings = state.researchData.searchResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));

    // The first market trend entry holds the full Gemini research summary
    const researchSummary = state.researchData.marketAnalysis.marketTrends[0] || '';

    const generatorInput: MRDGeneratorInput = {
      productConcept: rawInput.productConcept,
      targetMarket: rawInput.targetMarket,
      additionalDetails: rawInput.additionalDetails || undefined,
      researchFindings,
      researchSummary,
      clarifications,
      requestId: state.requestId,
      gapsToFlag: state.gapAssessment?.proceedNotes?.gapsToFlag,
      assumptionsToMake: state.gapAssessment?.proceedNotes?.assumptionsToMake,
    };

    const result = await this.mrdGeneratorAgent.execute(generatorInput, context);

    if (!result.success || !result.data) {
      state.stage = WorkflowStage.ERROR;
      state.error = result.error || 'MRD generator agent failed without error detail';
      return { state, needsClarification: false, error: state.error };
    }

    state.mrdOutput = result.data;
    state.stage = WorkflowStage.COMPLETE;
    context.state.set('mrdOutput', result.data);

    return { state, needsClarification: false };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildFinalOutput(state: WorkflowState): OrchestratorOutput {
    if (state.stage === WorkflowStage.ERROR) {
      return {
        state,
        needsClarification: false,
        error: state.error || 'Unknown error',
      };
    }

    return {
      state,
      needsClarification: false,
      mrd: state.mrdOutput?.content,
      sources: state.mrdOutput?.sources,
    };
  }
}

// ---------------------------------------------------------------------------
// Module-level helper: mock research results (mirrors workflow.ts)
// ---------------------------------------------------------------------------

function getMockResearchResults(productName: string, markets: string[]): SearchResultData[] {
  return [
    {
      title: `Market Analysis: ${productName}`,
      url: 'https://example.com/mock-market-analysis',
      snippet: `Mock market research for ${productName} targeting ${markets.join(', ')}. Configure GOOGLE_API_KEY for real research.`,
      query: 'mock',
    },
  ];
}
