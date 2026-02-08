/**
 * MRD Generation Workflow
 *
 * Implements a multi-stage pipeline for MRD generation:
 * 1. Parse Request - Extract structured data from user input
 * 2. Gap Analysis - Identify missing information
 * 3. Clarify (optional) - Ask user for missing info (max 2 rounds)
 * 4. Research - Conduct competitive research
 * 5. Generate MRD - Create the final document
 */

import {
  WorkflowStage,
  WorkflowState,
  RequestData,
  GapAssessment,
  ResearchData,
  MRDOutput,
  ClarificationAnswers,
  SearchResultData,
  createInitialState,
  generateRequestId,
} from '@/lib/schemas';
import { analyzeGaps, mergeClarificationAnswers } from '@/skills/gap_analyzer';
import { conductResearch, isGeminiAvailable, GroundedSource } from '@/lib/gemini';
import { generateMRD } from '@/skills/mrd_generator';
import { sanitizeMRDInput } from '@/lib/sanitize';
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
 * @param input - Workflow input containing request data or clarification answers.
 * @returns Workflow response with current state and relevant data.
 */
export async function executeWorkflow(input: WorkflowInput): Promise<WorkflowResponse> {
  // ---------------------------------------------------------------------------
  // Feature flag: USE_MULTI_AGENT=true routes to the new orchestrator-based
  // pipeline.  The legacy path below remains untouched for backward
  // compatibility.
  // ---------------------------------------------------------------------------
  if (process.env.USE_MULTI_AGENT === 'true') {
    console.log('[Workflow] USE_MULTI_AGENT enabled -- routing to MRD Orchestrator');
    return executeMultiAgentWorkflow(input);
  }

  let state: WorkflowState;

  // Initialize or continue from existing state
  if (input.existingState) {
    state = { ...input.existingState, updatedAt: new Date().toISOString() };
  } else {
    state = createInitialState();
  }

  try {
    // Execute stages based on current state
    while (state.stage !== WorkflowStage.COMPLETE && state.stage !== WorkflowStage.ERROR) {
      const result = await executeStage(state, input);
      state = result.state;

      // If we need clarification, return early
      if (result.needsClarification) {
        return result;
      }

      // If an error occurred, break
      if (state.stage === WorkflowStage.ERROR) {
        break;
      }
    }

    // Build final response
    return buildFinalResponse(state);
  } catch (error) {
    console.error('[Workflow] Error:', error);
    state.stage = WorkflowStage.ERROR;
    state.error = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      state,
      needsClarification: false,
      error: state.error,
    };
  }
}

/**
 * Executes a single stage of the workflow.
 */
async function executeStage(
  state: WorkflowState,
  input: WorkflowInput
): Promise<WorkflowResponse> {
  console.log(`[Workflow] Executing stage: ${state.stage}`);

  switch (state.stage) {
    case WorkflowStage.PARSE_REQUEST:
      return await executeParseRequest(state, input);

    case WorkflowStage.GAP_ANALYSIS:
      return executeGapAnalysis(state);

    case WorkflowStage.CLARIFY:
      return executeClarify(state, input);

    case WorkflowStage.RESEARCH:
      return await executeResearch(state);

    case WorkflowStage.GENERATE_MRD:
      return await executeGenerateMRD(state);

    default:
      return { state, needsClarification: false };
  }
}

/**
 * Stage 1: Parse Request
 */
async function executeParseRequest(
  state: WorkflowState,
  input: WorkflowInput
): Promise<WorkflowResponse> {
  if (!input.productConcept || !input.targetMarket) {
    state.stage = WorkflowStage.ERROR;
    state.error = 'Product concept and target market are required';
    return { state, needsClarification: false, error: state.error };
  }

  // Sanitize inputs
  const sanitized = sanitizeMRDInput({
    productConcept: input.productConcept,
    targetMarket: input.targetMarket,
    additionalDetails: input.additionalDetails,
  });

  // Parse and extract structured data
  const requestData: RequestData = {
    requestId: state.requestId,
    sender: {
      email: null,
      name: 'Unknown',
      department: 'Unknown',
      inferredFrom: null,
    },
    productConcept: {
      name: extractProductName(sanitized.productConcept),
      summary: sanitized.productConcept,
      category: inferProductCategory(sanitized.productConcept),
    },
    rawInput: {
      productConcept: sanitized.productConcept,
      targetMarket: sanitized.targetMarket,
      additionalDetails: sanitized.additionalDetails || null,
    },
    extractedData: {
      targetMarkets: inferTargetMarkets(sanitized.targetMarket),
      useCases: extractUseCases(sanitized.productConcept, sanitized.additionalDetails),
      targetPrice: extractTargetPrice(sanitized.additionalDetails),
      technicalRequirements: extractTechnicalRequirements(sanitized.additionalDetails),
      volumeExpectation: null,
      timeline: {
        urgency: 'medium',
        targetDate: null,
        notes: null,
      },
      additionalContext: sanitized.additionalDetails || null,
    },
    gaps: { critical: [], optional: [] },
    scopeFlags: [],
    metadata: {
      parsedAt: new Date().toISOString(),
      parserVersion: '1.0.0',
      confidence: 0.8,
    },
  };

  state.requestData = requestData;
  state.stage = WorkflowStage.GAP_ANALYSIS;

  return { state, needsClarification: false };
}

/**
 * Stage 2: Gap Analysis
 */
function executeGapAnalysis(state: WorkflowState): WorkflowResponse {
  if (!state.requestData) {
    state.stage = WorkflowStage.ERROR;
    state.error = 'No request data available for gap analysis';
    return { state, needsClarification: false, error: state.error };
  }

  // Get previous questions to avoid repeats
  const previousQuestions = state.clarificationHistory.flatMap(
    (ch) => ch.answers.map((a) => a.question)
  );

  const gapAssessment = analyzeGaps(
    state.requestData,
    state.clarificationRound,
    previousQuestions
  );

  state.gapAssessment = gapAssessment;

  if (gapAssessment.decision === 'clarify') {
    state.stage = WorkflowStage.CLARIFY;
    return {
      state,
      needsClarification: true,
      questions: gapAssessment.clarification,
    };
  }

  if (gapAssessment.decision === 'escalate') {
    state.stage = WorkflowStage.ERROR;
    state.error = gapAssessment.escalateReason || 'Request requires human review';
    return { state, needsClarification: false, error: state.error };
  }

  // Proceed to research
  state.stage = WorkflowStage.RESEARCH;
  return { state, needsClarification: false };
}

/**
 * Stage 3: Clarification (handles user answers and continues)
 */
function executeClarify(
  state: WorkflowState,
  input: WorkflowInput
): WorkflowResponse {
  if (!input.clarificationAnswers || input.clarificationAnswers.length === 0) {
    // Still waiting for answers
    return {
      state,
      needsClarification: true,
      questions: state.gapAssessment?.clarification,
    };
  }

  if (!state.requestData) {
    state.stage = WorkflowStage.ERROR;
    state.error = 'No request data available for clarification';
    return { state, needsClarification: false, error: state.error };
  }

  // Record clarification answers
  const clarificationRecord: ClarificationAnswers = {
    round: state.clarificationRound + 1,
    answers: input.clarificationAnswers,
  };
  state.clarificationHistory.push(clarificationRecord);
  state.clarificationRound++;

  // Merge answers into request data
  state.requestData = mergeClarificationAnswers(state.requestData, clarificationRecord);

  // Re-run gap analysis
  state.stage = WorkflowStage.GAP_ANALYSIS;
  return { state, needsClarification: false };
}

/**
 * Stage 4: Research
 * Uses Gemini with Google Search grounding to conduct market research.
 */
async function executeResearch(state: WorkflowState): Promise<WorkflowResponse> {
  if (!state.requestData) {
    state.stage = WorkflowStage.ERROR;
    state.error = 'No request data available for research';
    return { state, needsClarification: false, error: state.error };
  }

  const { productConcept, extractedData, rawInput } = state.requestData;
  const { targetMarkets } = extractedData;

  // Build research topic and context
  const researchTopic = `${productConcept.name} for ${targetMarkets.join(', ')} market`;
  const researchContext = `Product concept: ${rawInput.productConcept}\nTarget market: ${rawInput.targetMarket}${rawInput.additionalDetails ? `\nAdditional details: ${rawInput.additionalDetails}` : ''}`;

  console.log(`[Workflow] Conducting research on: ${researchTopic}`);

  let allSearchResults: SearchResultData[] = [];
  let searchQueries: string[] = [];
  let researchSummary = '';

  // Use Gemini with Google Search grounding if available
  if (isGeminiAvailable()) {
    try {
      console.log('[Workflow] Using Gemini with Google Search grounding');
      const research = await conductResearch(researchTopic, researchContext);

      researchSummary = research.text;
      searchQueries = research.searchQueries;

      // Convert grounded sources to search results
      allSearchResults = research.sources.map((source: GroundedSource) => ({
        title: source.title,
        url: source.url,
        snippet: source.snippet || '',
        query: 'Gemini Search Grounding',
      }));

      console.log(`[Workflow] Gemini research complete: ${allSearchResults.length} sources, ${searchQueries.length} queries`);
    } catch (error) {
      console.error('[Workflow] Gemini research failed:', error);
      // Fall back to mock data
      allSearchResults = getMockResearchResults(productConcept.name, targetMarkets);
      searchQueries = ['fallback'];
    }
  } else {
    console.log('[Workflow] Gemini not available, using mock research data');
    allSearchResults = getMockResearchResults(productConcept.name, targetMarkets);
    searchQueries = ['mock'];
  }

  // Build research data
  const researchData: ResearchData = {
    researchId: `RES-${state.requestId}`,
    conductedAt: new Date().toISOString(),
    searchResults: allSearchResults,
    searchQueries: searchQueries,
    competitorsSearched: ['Google Search (via Gemini)'],
    productsFound: [],
    marketAnalysis: {
      priceRangeObserved: null,
      pricePositioningRecommendation: 'See research summary for pricing insights',
      marketGaps: [],
      differentiationOpportunities: [],
      competitiveThreats: [],
      marketTrends: researchSummary ? [researchSummary] : allSearchResults.map((r) => r.snippet).filter(Boolean).slice(0, 5),
    },
    limitations: isGeminiAvailable()
      ? ['Research based on Gemini AI with Google Search grounding']
      : ['Research based on mock data - configure GOOGLE_API_KEY for real research'],
    researchQuality: {
      productsFoundCount: allSearchResults.length,
      meetsMinimum: allSearchResults.length >= 1,
      confidenceScore: allSearchResults.length >= 3 ? 80 : (allSearchResults.length >= 1 ? 60 : 30),
      gapsInResearch: allSearchResults.length === 0 ? ['No search results found'] : [],
    },
  };

  state.researchData = researchData;
  state.stage = WorkflowStage.GENERATE_MRD;

  return { state, needsClarification: false };
}

/**
 * Returns mock research results when Gemini is not available.
 */
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

/**
 * Stage 5: Generate MRD
 */
async function executeGenerateMRD(state: WorkflowState): Promise<WorkflowResponse> {
  if (!state.requestData || !state.researchData) {
    state.stage = WorkflowStage.ERROR;
    state.error = 'Missing data for MRD generation';
    return { state, needsClarification: false, error: state.error };
  }

  const { rawInput } = state.requestData;

  // Use actual search results from research phase
  const researchFindings = state.researchData.searchResults.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));

  // Get research summary (first market trend contains the full summary from Gemini)
  const researchSummary = state.researchData.marketAnalysis.marketTrends[0] || '';

  console.log(`[Workflow] Generating MRD with ${researchFindings.length} sources`);

  // Generate MRD
  const mrd = await generateMRD({
    productConcept: rawInput.productConcept,
    targetMarket: rawInput.targetMarket,
    additionalDetails: rawInput.additionalDetails || undefined,
    researchFindings,
    researchSummary,
    clarifications: state.clarificationHistory.flatMap((ch) => ch.answers),
  });

  // Build sources from actual search results (deduplicate by URL)
  const uniqueSources = new Map<string, { title: string; url: string }>();
  state.researchData.searchResults.forEach((r) => {
    if (!uniqueSources.has(r.url)) {
      uniqueSources.set(r.url, { title: r.title, url: r.url });
    }
  });

  // Build MRD output with real sources
  const mrdOutput: MRDOutput = {
    requestId: state.requestId,
    generatedAt: new Date().toISOString(),
    content: mrd,
    format: 'markdown',
    sectionConfidence: [],
    sources: Array.from(uniqueSources.values()),
    limitations: state.gapAssessment?.proceedNotes?.gapsToFlag || [],
    assumptions: state.gapAssessment?.proceedNotes?.assumptionsToMake || [],
  };

  state.mrdOutput = mrdOutput;
  state.stage = WorkflowStage.COMPLETE;

  return { state, needsClarification: false };
}

/**
 * Builds the final response when workflow is complete.
 */
function buildFinalResponse(state: WorkflowState): WorkflowResponse {
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

// ---------------------------------------------------------------------------
// Multi-agent entry point
// ---------------------------------------------------------------------------

/**
 * Executes the MRD generation workflow via the new multi-agent orchestrator.
 *
 * Translates WorkflowInput into OrchestratorInput, runs the orchestrator,
 * and maps OrchestratorOutput back to WorkflowResponse so callers see an
 * identical shape regardless of which code path was taken.
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

// --- Helper Functions for Parsing ---

function extractProductName(concept: string): string {
  // Take first sentence or first 50 characters
  const firstSentence = concept.split(/[.!?]/)[0];
  return firstSentence.slice(0, 50).trim() || 'Unnamed Product';
}

function inferProductCategory(concept: string): RequestData['productConcept']['category'] {
  const lower = concept.toLowerCase();
  if (lower.includes('enclosure') || lower.includes('case')) return 'enclosure';
  if (lower.includes('mount') || lower.includes('mounting')) return 'mount';
  if (lower.includes('stand') || lower.includes('kiosk')) return 'stand';
  if (lower.includes('lock') || lower.includes('security')) return 'lock';
  if (lower.includes('charg') || lower.includes('power')) return 'charging';
  if (lower.includes('app') || lower.includes('software') || lower.includes('platform')) return 'software';
  return 'other';
}

function inferTargetMarkets(market: string): RequestData['extractedData']['targetMarkets'] {
  const lower = market.toLowerCase();
  const markets: RequestData['extractedData']['targetMarkets'] = [];

  if (lower.includes('retail') || lower.includes('store')) markets.push('Retail');
  if (lower.includes('hotel') || lower.includes('hospitality') || lower.includes('restaurant')) markets.push('Hospitality');
  if (lower.includes('health') || lower.includes('hospital') || lower.includes('medical')) markets.push('Healthcare');
  if (lower.includes('corporate') || lower.includes('enterprise') || lower.includes('office')) markets.push('Corporate');
  if (lower.includes('school') || lower.includes('education') || lower.includes('university')) markets.push('Education');
  if (lower.includes('government') || lower.includes('public')) markets.push('Government');

  return markets.length > 0 ? markets : ['Other'];
}

function extractUseCases(concept: string, details?: string | null): string[] {
  const useCases: string[] = [];
  const text = `${concept} ${details || ''}`.toLowerCase();

  if (text.includes('check-in') || text.includes('checkin')) useCases.push('Self-service check-in');
  if (text.includes('display') || text.includes('signage')) useCases.push('Digital signage');
  if (text.includes('point of sale') || text.includes('pos') || text.includes('payment')) useCases.push('Point of sale');
  if (text.includes('inventory') || text.includes('stock')) useCases.push('Inventory management');
  if (text.includes('survey') || text.includes('feedback')) useCases.push('Customer feedback');

  return useCases;
}

function extractTargetPrice(details?: string | null): RequestData['extractedData']['targetPrice'] {
  if (!details) return null;

  const priceMatch = details.match(/\$\s*([\d,]+)/);
  if (priceMatch) {
    return {
      value: parseInt(priceMatch[1].replace(/,/g, ''), 10),
      type: 'approximate',
      min: null,
      max: null,
      currency: 'USD',
    };
  }

  return null;
}

function extractTechnicalRequirements(details?: string | null): RequestData['extractedData']['technicalRequirements'] {
  const requirements: RequestData['extractedData']['technicalRequirements'] = {
    deviceCompatibility: [],
    vesaPattern: null,
    materials: [],
    other: [],
  };

  if (!details) return requirements;

  const lower = details.toLowerCase();

  // Device detection
  if (lower.includes('ipad')) requirements.deviceCompatibility.push('iPad');
  if (lower.includes('android')) requirements.deviceCompatibility.push('Android tablet');
  if (lower.includes('surface')) requirements.deviceCompatibility.push('Surface');

  // VESA detection
  const vesaMatch = lower.match(/vesa\s*(\d+)\s*x?\s*(\d+)?/);
  if (vesaMatch) {
    requirements.vesaPattern = `${vesaMatch[1]}x${vesaMatch[2] || vesaMatch[1]}`;
  }

  // Material detection
  if (lower.includes('aluminum') || lower.includes('aluminium')) requirements.materials.push('Aluminum');
  if (lower.includes('steel')) requirements.materials.push('Steel');
  if (lower.includes('plastic')) requirements.materials.push('Plastic');

  return requirements;
}
