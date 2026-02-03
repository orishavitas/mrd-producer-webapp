/**
 * Data Schemas for Multi-Stage MRD Pipeline
 *
 * Defines structured data types for each stage of the pipeline:
 * 1. Parse Request -> RequestData
 * 2. Gap Analysis -> GapAssessment
 * 3. Research -> ResearchData
 * 4. Generate MRD -> MRDOutput
 */

/**
 * Product categories for classification.
 */
export type ProductCategory =
  | 'enclosure'
  | 'mount'
  | 'stand'
  | 'lock'
  | 'charging'
  | 'accessory'
  | 'software'
  | 'other';

/**
 * Target market verticals.
 */
export type TargetVertical =
  | 'Retail'
  | 'Hospitality'
  | 'Healthcare'
  | 'Corporate'
  | 'Education'
  | 'Government'
  | 'Other';

/**
 * Scope flag levels for risk assessment.
 */
export type ScopeLevel = 'green' | 'yellow' | 'red';

/**
 * Gap severity classification.
 */
export type GapSeverity = 'blocking' | 'important' | 'minor';

/**
 * Workflow decision types.
 */
export type WorkflowDecision = 'clarify' | 'proceed' | 'escalate';

/**
 * Pipeline stage identifiers.
 */
export enum WorkflowStage {
  PARSE_REQUEST = 'parse_request',
  GAP_ANALYSIS = 'gap_analysis',
  CLARIFY = 'clarify',
  RESEARCH = 'research',
  GENERATE_MRD = 'generate_mrd',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * Generates a unique request ID.
 */
export function generateRequestId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MRD-${date}-${random}`;
}

/**
 * Sender/requestor information.
 */
export interface SenderInfo {
  email: string | null;
  name: string;
  department: string;
  inferredFrom: string | null;
}

/**
 * Product concept extracted from request.
 */
export interface ProductConcept {
  name: string;
  summary: string;
  category: ProductCategory;
}

/**
 * Technical requirements for the product.
 */
export interface TechnicalRequirements {
  deviceCompatibility: string[];
  vesaPattern: string | null;
  materials: string[];
  other: string[];
}

/**
 * Price target information.
 */
export interface PriceTarget {
  value: number | null;
  type: 'exact' | 'range' | 'maximum' | 'approximate' | null;
  min: number | null;
  max: number | null;
  currency: string;
}

/**
 * Volume expectation.
 */
export interface VolumeExpectation {
  quantity: number | null;
  period: string | null;
  notes: string | null;
}

/**
 * Timeline information.
 */
export interface Timeline {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  targetDate: string | null;
  notes: string | null;
}

/**
 * Extracted data from request.
 */
export interface ExtractedData {
  targetMarkets: TargetVertical[];
  useCases: string[];
  targetPrice: PriceTarget | null;
  technicalRequirements: TechnicalRequirements;
  volumeExpectation: VolumeExpectation | null;
  timeline: Timeline;
  additionalContext: string | null;
}

/**
 * Information gap with field and reason.
 */
export interface GapInfo {
  field: string;
  reason: string;
}

/**
 * Gaps assessment categorized by severity.
 */
export interface GapsAssessment {
  critical: GapInfo[];
  optional: GapInfo[];
}

/**
 * Scope flag for risk assessment.
 */
export interface ScopeFlag {
  level: ScopeLevel;
  reason: string;
  recommendation: string | null;
}

/**
 * Parsed request data (output of Stage 1).
 */
export interface RequestData {
  requestId: string;
  sender: SenderInfo;
  productConcept: ProductConcept;
  rawInput: {
    productConcept: string;
    targetMarket: string;
    additionalDetails: string | null;
  };
  extractedData: ExtractedData;
  gaps: GapsAssessment;
  scopeFlags: ScopeFlag[];
  metadata: {
    parsedAt: string;
    parserVersion: string;
    confidence: number;
  };
}

/**
 * Clarification question.
 */
export interface ClarificationQuestion {
  number: number;
  field: string;
  question: string;
  context: string;
  options: string[] | null;
}

/**
 * Gap assessment with severity levels (output of Stage 2).
 */
export interface GapAssessment {
  decision: WorkflowDecision;
  reasoning: string;
  gapAssessment: {
    blocking: GapInfo[];
    important: GapInfo[];
    minor: GapInfo[];
  };
  clarification: {
    questions: ClarificationQuestion[];
  } | null;
  proceedNotes: {
    gapsToFlag: string[];
    assumptionsToMake: string[];
  } | null;
  escalateReason: string | null;
}

/**
 * User's answers to clarification questions.
 */
export interface ClarificationAnswers {
  round: number;
  answers: { question: string; answer: string }[];
}

/**
 * Price information for a competitor product.
 */
export interface CompetitorPrice {
  value: number | null;
  currency: string;
  type: 'msrp' | 'estimated' | 'range';
  range: { min: number; max: number } | null;
  source: string;
}

/**
 * Competitor product data.
 */
export interface CompetitorProduct {
  company: string;
  productName: string;
  url: string;
  price: CompetitorPrice;
  keyFeatures: string[];
  deviceCompatibility: string[];
  formFactor: string;
  materials: string[];
  strengths: string[];
  weaknesses: string[];
  relevanceScore: number;
  notes: string;
}

/**
 * Market analysis summary.
 */
export interface MarketAnalysis {
  priceRangeObserved: { min: number; max: number; median: number } | null;
  pricePositioningRecommendation: string;
  marketGaps: string[];
  differentiationOpportunities: string[];
  competitiveThreats: string[];
  marketTrends: string[];
}

/**
 * Research data (output of Stage 3).
 */
export interface ResearchData {
  researchId: string;
  conductedAt: string;
  competitorsSearched: string[];
  productsFound: CompetitorProduct[];
  marketAnalysis: MarketAnalysis;
  limitations: string[];
  researchQuality: {
    productsFoundCount: number;
    meetsMinimum: boolean;
    confidenceScore: number;
    gapsInResearch: string[];
  };
}

/**
 * Section confidence metadata.
 */
export interface SectionConfidence {
  section: string;
  confidence: number;
  dataSources: ('requestor' | 'inferred' | 'research')[];
  gaps: string[];
}

/**
 * MRD output (output of Stage 4).
 */
export interface MRDOutput {
  requestId: string;
  generatedAt: string;
  content: string;
  format: 'markdown' | 'docx';
  sectionConfidence: SectionConfidence[];
  sources: { title: string; url: string }[];
  limitations: string[];
  assumptions: string[];
}

/**
 * Complete workflow state.
 */
export interface WorkflowState {
  stage: WorkflowStage;
  requestId: string;
  requestData: RequestData | null;
  gapAssessment: GapAssessment | null;
  clarificationRound: number;
  clarificationHistory: ClarificationAnswers[];
  researchData: ResearchData | null;
  mrdOutput: MRDOutput | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates an initial workflow state.
 */
export function createInitialState(): WorkflowState {
  const now = new Date().toISOString();
  return {
    stage: WorkflowStage.PARSE_REQUEST,
    requestId: generateRequestId(),
    requestData: null,
    gapAssessment: null,
    clarificationRound: 0,
    clarificationHistory: [],
    researchData: null,
    mrdOutput: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}
