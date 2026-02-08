/**
 * Generation Orchestrator
 *
 * Coordinates section generators to produce a complete MRD document.
 * Supports two modes:
 * 1. Parallel mode: Run all section generators in parallel
 * 2. Sequential mode: Run section generators one after another
 *
 * Can optionally use ensemble voting for quality improvement.
 */

import { BaseOrchestratorAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult, Agent } from '@/agent/core/types';
import {
  SectionGeneratorInput,
  SectionGeneratorOutput,
} from '@/agent/agents/generators/base-section-generator';
import { MarketSectionGenerator } from '@/agent/agents/generators/market-section-generator';
import { TechnicalSectionGenerator } from '@/agent/agents/generators/technical-section-generator';
import { StrategySectionGenerator } from '@/agent/agents/generators/strategy-section-generator';
import { QualityReviewer, QualityReviewInput } from '@/agent/agents/reviewers/quality-reviewer';
import { EnsembleMerger } from '@/agent/patterns/ensemble-merger';

/**
 * Execution mode for the orchestrator.
 */
export type GenerationMode = 'parallel' | 'sequential';

/**
 * Input for generation orchestrator.
 */
export interface GenerationOrchestratorInput {
  /** Product concept text. */
  productConcept: string;
  /** Target market text. */
  targetMarket: string;
  /** Additional details. */
  additionalDetails?: string;
  /** Research findings. */
  researchFindings: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  /** Research summary. */
  researchSummary?: string;
  /** Clarifications. */
  clarifications?: Array<{
    question: string;
    answer: string;
  }>;
  /** Request ID. */
  requestId: string;
  /** Execution mode (default: parallel). */
  mode?: GenerationMode;
  /** Whether to run quality review (default: true). */
  enableQualityReview?: boolean;
  /** Use ensemble voting (default: false - for future enhancement). */
  useEnsembleVoting?: boolean;
}

/**
 * Output from generation orchestrator.
 */
export interface GenerationOrchestratorOutput {
  /** Complete MRD markdown content. */
  mrdContent: string;
  /** Sections by number. */
  sections: Record<number, string>;
  /** Confidence scores per section. */
  confidence: Record<number, number>;
  /** Quality review results (if enabled). */
  qualityReview?: {
    overallScore: number;
    passed: boolean;
    criticalIssues: string[];
  };
  /** Execution metadata. */
  metadata: {
    mode: GenerationMode;
    marketGenerationTime: number;
    technicalGenerationTime: number;
    strategyGenerationTime: number;
    totalGenerationTime: number;
    qualityReviewTime?: number;
  };
  /** Any warnings or notes. */
  warnings: string[];
}

/**
 * Generation Orchestrator Agent.
 *
 * Coordinates specialized section generators to produce a complete MRD.
 */
export class GenerationOrchestrator extends BaseOrchestratorAgent<
  GenerationOrchestratorInput,
  GenerationOrchestratorOutput
> {
  readonly id = 'generation-orchestrator';
  readonly name = 'Generation Orchestrator';
  readonly version = '1.0.0';
  readonly description =
    'Coordinates section generators (Market, Technical, Strategy) to produce complete MRD documents';

  // Section generators
  private readonly marketGenerator = new MarketSectionGenerator();
  private readonly technicalGenerator = new TechnicalSectionGenerator();
  private readonly strategyGenerator = new StrategySectionGenerator();
  private readonly qualityReviewer = new QualityReviewer();

  getSubAgents(): Agent[] {
    return [
      this.marketGenerator,
      this.technicalGenerator,
      this.strategyGenerator,
      this.qualityReviewer,
    ];
  }

  validateInput(input: GenerationOrchestratorInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.productConcept || typeof input.productConcept !== 'string') {
      errors.push('productConcept is required and must be a string');
    }

    if (!input.targetMarket || typeof input.targetMarket !== 'string') {
      errors.push('targetMarket is required and must be a string');
    }

    if (!Array.isArray(input.researchFindings)) {
      errors.push('researchFindings must be an array');
    }

    if (!input.requestId || typeof input.requestId !== 'string') {
      errors.push('requestId is required');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  protected async executeCore(
    input: GenerationOrchestratorInput,
    context: ExecutionContext
  ): Promise<GenerationOrchestratorOutput> {
    const mode = input.mode || 'parallel';
    const enableQualityReview = input.enableQualityReview !== false;
    const startTime = Date.now();

    context.log('info', `[${this.id}] Starting MRD generation`, {
      mode,
      enableQualityReview,
      useEnsembleVoting: input.useEnsembleVoting || false,
    });

    const warnings: string[] = [];

    // Prepare shared input for all generators
    const generatorInput: SectionGeneratorInput = {
      productConcept: input.productConcept,
      targetMarket: input.targetMarket,
      additionalDetails: input.additionalDetails,
      researchFindings: input.researchFindings,
      researchSummary: input.researchSummary,
      clarifications: input.clarifications,
      requestId: input.requestId,
    };

    // Generate sections
    let marketOutput: SectionGeneratorOutput;
    let technicalOutput: SectionGeneratorOutput;
    let strategyOutput: SectionGeneratorOutput;
    let marketTime = 0;
    let technicalTime = 0;
    let strategyTime = 0;

    if (mode === 'parallel') {
      // Run all generators in parallel
      const results = await this.generateParallel(generatorInput, context);
      marketOutput = results.market;
      technicalOutput = results.technical;
      strategyOutput = results.strategy;
      marketTime = results.marketTime;
      technicalTime = results.technicalTime;
      strategyTime = results.strategyTime;
    } else {
      // Run generators sequentially
      const results = await this.generateSequential(generatorInput, context);
      marketOutput = results.market;
      technicalOutput = results.technical;
      strategyOutput = results.strategy;
      marketTime = results.marketTime;
      technicalTime = results.technicalTime;
      strategyTime = results.strategyTime;
    }

    // Merge sections from all generators
    const allSections = EnsembleMerger.combineSections(
      marketOutput,
      technicalOutput,
      strategyOutput
    );
    const allConfidence = EnsembleMerger.combineConfidence(
      marketOutput,
      technicalOutput,
      strategyOutput
    );

    // Build complete MRD markdown
    const mrdContent = this.buildMRDContent(allSections, input.requestId);

    // Quality review if enabled
    let qualityReview: { overallScore: number; passed: boolean; criticalIssues: string[] } | undefined;
    let qualityReviewTime: number | undefined;

    if (enableQualityReview) {
      const reviewStart = Date.now();
      const reviewInput: QualityReviewInput = {
        mrdContent,
        sources: input.researchFindings.map((r) => ({ title: r.title, url: r.url })),
        requestId: input.requestId,
        productConcept: input.productConcept,
        targetMarket: input.targetMarket,
      };

      const reviewResult = await this.qualityReviewer.execute(reviewInput, context);
      qualityReviewTime = Date.now() - reviewStart;

      if (reviewResult.success && reviewResult.data) {
        qualityReview = {
          overallScore: reviewResult.data.overallScore,
          passed: reviewResult.data.passed,
          criticalIssues: reviewResult.data.criticalIssues,
        };

        if (!reviewResult.data.passed) {
          warnings.push(
            `Quality review did not pass (score: ${reviewResult.data.overallScore}/100)`
          );
          if (reviewResult.data.criticalIssues.length > 0) {
            warnings.push(...reviewResult.data.criticalIssues);
          }
        }

        context.log('info', `[${this.id}] Quality review complete`, {
          score: reviewResult.data.overallScore,
          passed: reviewResult.data.passed,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    context.log('info', `[${this.id}] MRD generation complete`, {
      totalTime,
      sectionsGenerated: Object.keys(allSections).length,
      qualityScore: qualityReview?.overallScore,
    });

    return {
      mrdContent,
      sections: allSections,
      confidence: allConfidence,
      qualityReview,
      metadata: {
        mode,
        marketGenerationTime: marketTime,
        technicalGenerationTime: technicalTime,
        strategyGenerationTime: strategyTime,
        totalGenerationTime: totalTime,
        qualityReviewTime,
      },
      warnings,
    };
  }

  /**
   * Run all generators in parallel.
   */
  private async generateParallel(
    input: SectionGeneratorInput,
    context: ExecutionContext
  ): Promise<{
    market: SectionGeneratorOutput;
    technical: SectionGeneratorOutput;
    strategy: SectionGeneratorOutput;
    marketTime: number;
    technicalTime: number;
    strategyTime: number;
  }> {
    const startTime = Date.now();

    const [marketResult, technicalResult, strategyResult] = await Promise.all([
      this.marketGenerator.execute(input, context),
      this.technicalGenerator.execute(input, context),
      this.strategyGenerator.execute(input, context),
    ]);

    const endTime = Date.now();

    if (!marketResult.success || !marketResult.data) {
      throw new Error(`Market generator failed: ${marketResult.error}`);
    }
    if (!technicalResult.success || !technicalResult.data) {
      throw new Error(`Technical generator failed: ${technicalResult.error}`);
    }
    if (!strategyResult.success || !strategyResult.data) {
      throw new Error(`Strategy generator failed: ${strategyResult.error}`);
    }

    return {
      market: marketResult.data,
      technical: technicalResult.data,
      strategy: strategyResult.data,
      marketTime: marketResult.metadata?.executionTimeMs || 0,
      technicalTime: technicalResult.metadata?.executionTimeMs || 0,
      strategyTime: strategyResult.metadata?.executionTimeMs || 0,
    };
  }

  /**
   * Run generators sequentially.
   */
  private async generateSequential(
    input: SectionGeneratorInput,
    context: ExecutionContext
  ): Promise<{
    market: SectionGeneratorOutput;
    technical: SectionGeneratorOutput;
    strategy: SectionGeneratorOutput;
    marketTime: number;
    technicalTime: number;
    strategyTime: number;
  }> {
    const marketResult = await this.marketGenerator.execute(input, context);
    if (!marketResult.success || !marketResult.data) {
      throw new Error(`Market generator failed: ${marketResult.error}`);
    }

    const technicalResult = await this.technicalGenerator.execute(input, context);
    if (!technicalResult.success || !technicalResult.data) {
      throw new Error(`Technical generator failed: ${technicalResult.error}`);
    }

    const strategyResult = await this.strategyGenerator.execute(input, context);
    if (!strategyResult.success || !strategyResult.data) {
      throw new Error(`Strategy generator failed: ${strategyResult.error}`);
    }

    return {
      market: marketResult.data,
      technical: technicalResult.data,
      strategy: strategyResult.data,
      marketTime: marketResult.metadata?.executionTimeMs || 0,
      technicalTime: technicalResult.metadata?.executionTimeMs || 0,
      strategyTime: strategyResult.metadata?.executionTimeMs || 0,
    };
  }

  /**
   * Build complete MRD markdown from sections.
   */
  private buildMRDContent(sections: Record<number, string>, requestId: string): string {
    const parts: string[] = [];

    // Document title
    parts.push('# Market Requirements Document (MRD)');
    parts.push('');
    parts.push('---');
    parts.push('');

    // Product name section (placeholder)
    parts.push('## Product Name');
    parts.push('');
    parts.push('[To be specified]');
    parts.push('');
    parts.push('---');
    parts.push('');

    // Add all sections in order
    for (let i = 1; i <= 12; i++) {
      if (sections[i]) {
        parts.push(sections[i]);
        // Ensure proper spacing
        if (!sections[i].endsWith('\n\n')) {
          parts.push('');
        }
      } else {
        // Section missing - add placeholder
        parts.push(`## ${i}. [Section Missing]`);
        parts.push('');
        parts.push('[This section was not generated]');
        parts.push('');
        parts.push('---');
        parts.push('');
      }
    }

    // Add metadata footer
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(`*Document ID: ${requestId}*`);
    parts.push(`*Generated: ${new Date().toISOString()}*`);
    parts.push('*Generated by MRD Producer - Phase 5 Section Specialists*');

    return parts.join('\n');
  }
}
