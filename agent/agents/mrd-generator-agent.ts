/**
 * MRD Generator Agent
 *
 * Wraps skills/mrd_generator.ts as an agent.  This is the only core agent
 * that actually invokes the AI provider -- the underlying generateMRD
 * function handles Gemini-or-template fallback internally.
 *
 * Input: the assembled MRDInput (product concept, market, research findings,
 *        clarification history).
 * Output: a fully populated MRDOutput envelope containing the markdown
 *         content, deduplicated sources, and any assumptions/limitations
 *         carried forward from the gap assessment.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { MRDOutput } from '@/lib/schemas';
import { generateMRD, MRDInput, ResearchSource } from '@/skills/mrd_generator';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

/**
 * Input required to generate an MRD.  The orchestrator assembles this from
 * the outputs of the parser, gap analyzer, and research stages.
 */
export interface MRDGeneratorInput {
  /** Raw product concept text from the user. */
  productConcept: string;
  /** Raw target market text from the user. */
  targetMarket: string;
  /** Optional additional details from the user. */
  additionalDetails?: string;
  /** Research sources gathered during the research stage. */
  researchFindings: ResearchSource[];
  /**
   * Full-text research summary (typically the first market-trend entry
   * returned by Gemini search grounding).
   */
  researchSummary?: string;
  /**
   * Flattened list of all clarification Q&A pairs across every round.
   */
  clarifications?: { question: string; answer: string }[];
  /**
   * The request ID to stamp on the output envelope.
   */
  requestId: string;
  /**
   * Gaps flagged by the gap analyzer for inclusion in the output
   * limitations array.
   */
  gapsToFlag?: string[];
  /**
   * Assumptions noted by the gap analyzer for inclusion in the output
   * assumptions array.
   */
  assumptionsToMake?: string[];
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class MRDGeneratorAgent extends BaseAgent<MRDGeneratorInput, MRDOutput> {
  readonly id = 'mrd-generator-agent';
  readonly name = 'MRD Generator Agent';
  readonly version = '1.0.0';
  readonly description =
    'Generates a complete 12-section Market Requirements Document using AI or a structured template fallback';

  // The underlying generateMRD calls Gemini when available; declare the
  // capability as informational only -- BaseAgent will warn but not block if
  // the provider lacks it, because the skill has its own template fallback.
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: MRDGeneratorInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.productConcept || typeof input.productConcept !== 'string' || input.productConcept.trim().length === 0) {
      errors.push('productConcept is required and must be a non-empty string');
    }

    if (!input.targetMarket || typeof input.targetMarket !== 'string' || input.targetMarket.trim().length === 0) {
      errors.push('targetMarket is required and must be a non-empty string');
    }

    if (!Array.isArray(input.researchFindings)) {
      errors.push('researchFindings must be an array');
    }

    if (!input.requestId || typeof input.requestId !== 'string') {
      errors.push('requestId is required');
    }

    if (input.clarifications !== undefined && !Array.isArray(input.clarifications)) {
      errors.push('clarifications must be an array when provided');
    }

    if (input.gapsToFlag !== undefined && !Array.isArray(input.gapsToFlag)) {
      errors.push('gapsToFlag must be an array when provided');
    }

    if (input.assumptionsToMake !== undefined && !Array.isArray(input.assumptionsToMake)) {
      errors.push('assumptionsToMake must be an array when provided');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: MRDGeneratorInput,
    context: ExecutionContext
  ): Promise<MRDOutput> {
    context.log('info', `[${this.id}] Starting MRD generation`, {
      sourcesCount: input.researchFindings.length,
      hasSummary: !!input.researchSummary,
      clarificationsCount: input.clarifications?.length ?? 0,
    });

    // Assemble the input shape expected by the skill
    const mrdInput: MRDInput = {
      productConcept: input.productConcept,
      targetMarket: input.targetMarket,
      additionalDetails: input.additionalDetails,
      researchFindings: input.researchFindings,
      researchSummary: input.researchSummary,
      clarifications: input.clarifications,
    };

    // Delegate to the existing skill (handles Gemini / template fallback)
    const content = await generateMRD(mrdInput);

    context.log('info', `[${this.id}] MRD generation complete`, {
      contentLength: content.length,
    });

    // Deduplicate sources by URL
    const uniqueSources = new Map<string, { title: string; url: string }>();
    for (const source of input.researchFindings) {
      if (source.url && !uniqueSources.has(source.url)) {
        uniqueSources.set(source.url, { title: source.title, url: source.url });
      }
    }

    // Build the output envelope
    const mrdOutput: MRDOutput = {
      requestId: input.requestId,
      generatedAt: new Date().toISOString(),
      content,
      format: 'markdown',
      sectionConfidence: [],
      sources: Array.from(uniqueSources.values()),
      limitations: input.gapsToFlag || [],
      assumptions: input.assumptionsToMake || [],
    };

    return mrdOutput;
  }
}
