/**
 * Research Orchestrator Agent
 *
 * Coordinates parallel execution of research agents:
 * - CompetitorResearcherAgent
 * - TrendResearcherAgent
 * - PricingResearcherAgent
 *
 * Features:
 * - Parallel execution for efficiency
 * - Graceful handling of partial failures
 * - Result merging and aggregation
 * - Quality assessment across all research
 * - Source deduplication
 *
 * Can proceed with partial results if minimum requirements are met.
 */

import { BaseOrchestratorAgent } from '@/agent/core/base-agent';
import { Agent, ExecutionContext, ValidationResult } from '@/agent/core/types';
import { GroundedSource } from '@/lib/providers/types';
import {
  CompetitorResearcherAgent,
  CompetitorResearchData,
} from '@/agent/agents/research/competitor-researcher';
import {
  TrendResearcherAgent,
  TrendResearchData,
} from '@/agent/agents/research/trend-researcher';
import {
  PricingResearcherAgent,
  PricingResearchData,
} from '@/agent/agents/research/pricing-researcher';
import { ResearchInput, ResearchOutput } from '@/agent/agents/research/base-researcher';
import { ParallelExecutor } from '@/agent/patterns/parallel-executor';

/**
 * Consolidated research data from all research agents.
 */
export interface ConsolidatedResearchData {
  /** Competitive analysis results */
  competitive: CompetitorResearchData | null;
  /** Market trend analysis results */
  trends: TrendResearchData | null;
  /** Pricing strategy results */
  pricing: PricingResearchData | null;
}

/**
 * Research orchestrator output.
 */
export interface ResearchOrchestratorOutput {
  /** Research ID for tracking */
  researchId: string;
  /** When the research was conducted */
  conductedAt: string;
  /** Consolidated research data */
  research: ConsolidatedResearchData;
  /** All source citations (deduplicated) */
  sources: GroundedSource[];
  /** All search queries used */
  searchQueries: string[];
  /** Overall quality assessment */
  quality: {
    /** Overall confidence score (0-1) */
    confidence: number;
    /** Whether minimum requirements were met */
    meetsMinimum: boolean;
    /** Individual research quality scores */
    individual: {
      competitive?: number;
      trends?: number;
      pricing?: number;
    };
    /** Identified gaps or limitations */
    gaps: string[];
  };
  /** Execution metadata */
  execution: {
    /** Which research types were successful */
    successful: string[];
    /** Which research types failed */
    failed: string[];
    /** Total execution time */
    executionTimeMs: number;
  };
}

/**
 * Research Orchestrator Agent.
 */
export class ResearchOrchestratorAgent extends BaseOrchestratorAgent<
  ResearchInput,
  ResearchOrchestratorOutput
> {
  readonly id = 'research-orchestrator';
  readonly name = 'Research Orchestrator Agent';
  readonly version = '1.0.0';
  readonly description =
    'Coordinates parallel research agents (competitor, trend, pricing) and merges results';

  // Sub-agents
  private competitorResearcher = new CompetitorResearcherAgent();
  private trendResearcher = new TrendResearcherAgent();
  private pricingResearcher = new PricingResearcherAgent();

  // -----------------------------------------------------------------------
  // Sub-agent management
  // -----------------------------------------------------------------------

  getSubAgents(): Agent[] {
    return [
      this.competitorResearcher,
      this.trendResearcher,
      this.pricingResearcher,
    ];
  }

  // -----------------------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------------------

  validateInput(input: ResearchInput): ValidationResult {
    // Delegate to base researcher validation
    return this.competitorResearcher.validateInput(input);
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: ResearchInput,
    context: ExecutionContext
  ): Promise<ResearchOrchestratorOutput> {
    context.log('info', `[${this.id}] Starting parallel research execution`, {
      productConcept: input.productConcept,
      targetMarket: input.targetMarket,
    });

    const startTime = Date.now();

    // Get configuration from context
    const config = (context.config.customSettings?.research as {
      maxConcurrency?: number;
      minSuccessful?: number;
    }) || {};
    const maxConcurrency = config.maxConcurrency || 3;
    const minSuccessful = config.minSuccessful || 1;

    // Execute research agents in parallel
    const parallelResult = await ParallelExecutor.execute(
      [this.competitorResearcher, this.trendResearcher, this.pricingResearcher],
      [input, input, input],
      context,
      {
        maxConcurrency,
        failFast: false, // Collect all results even if some fail
        timeout: 180000, // 3 minutes
        minSuccessful,
        onProgress: (completed, total, agentId) => {
          context.log('info', `[${this.id}] Research progress: ${completed}/${total}`, {
            completedAgent: agentId,
          });
        },
        onError: (agentId, error) => {
          context.log('warn', `[${this.id}] Research agent failed: ${agentId}`, {
            error,
          });
        },
      }
    );

    context.log('info', `[${this.id}] Parallel research completed`, {
      successful: parallelResult.summary.successful,
      failed: parallelResult.summary.failed,
    });

    // Extract results
    const [competitorResult, trendResult, pricingResult] = parallelResult.results;

    // Type-cast results
    const competitorData = competitorResult.success
      ? (competitorResult.data as ResearchOutput<CompetitorResearchData>)
      : null;
    const trendData = trendResult.success
      ? (trendResult.data as ResearchOutput<TrendResearchData>)
      : null;
    const pricingData = pricingResult.success
      ? (pricingResult.data as ResearchOutput<PricingResearchData>)
      : null;

    // Merge and deduplicate sources
    const allSources = this.mergeSources([
      competitorData?.sources || [],
      trendData?.sources || [],
      pricingData?.sources || [],
    ]);

    // Merge search queries
    const allQueries = this.mergeQueries([
      competitorData?.searchQueries || [],
      trendData?.searchQueries || [],
      pricingData?.searchQueries || [],
    ]);

    // Consolidate research data
    const research: ConsolidatedResearchData = {
      competitive: competitorData?.data || null,
      trends: trendData?.data || null,
      pricing: pricingData?.data || null,
    };

    // Assess overall quality
    const quality = this.assessOverallQuality(
      research,
      allSources,
      {
        competitive: competitorData?.quality,
        trends: trendData?.quality,
        pricing: pricingData?.quality,
      }
    );

    // Track execution metadata
    const execution = {
      successful: parallelResult.results
        .map((r, i) =>
          r.success
            ? [
                this.competitorResearcher.researchType,
                this.trendResearcher.researchType,
                this.pricingResearcher.researchType,
              ][i]
            : null
        )
        .filter((t): t is string => t !== null),
      failed: parallelResult.results
        .map((r, i) =>
          !r.success
            ? [
                this.competitorResearcher.researchType,
                this.trendResearcher.researchType,
                this.pricingResearcher.researchType,
              ][i]
            : null
        )
        .filter((t): t is string => t !== null),
      executionTimeMs: Date.now() - startTime,
    };

    context.log('info', `[${this.id}] Research orchestration complete`, {
      successfulTypes: execution.successful,
      failedTypes: execution.failed,
      overallConfidence: quality.confidence,
      meetsMinimum: quality.meetsMinimum,
    });

    return {
      researchId: `research-${Date.now()}`,
      conductedAt: new Date().toISOString(),
      research,
      sources: allSources,
      searchQueries: allQueries,
      quality,
      execution,
    };
  }

  // -----------------------------------------------------------------------
  // Helper methods
  // -----------------------------------------------------------------------

  /**
   * Merge and deduplicate sources from multiple research results.
   */
  private mergeSources(sourcesArrays: GroundedSource[][]): GroundedSource[] {
    const sourceMap = new Map<string, GroundedSource>();

    for (const sources of sourcesArrays) {
      for (const source of sources) {
        // Deduplicate by URL
        if (!sourceMap.has(source.url)) {
          sourceMap.set(source.url, source);
        }
      }
    }

    return Array.from(sourceMap.values());
  }

  /**
   * Merge and deduplicate search queries.
   */
  private mergeQueries(queriesArrays: string[][]): string[] {
    const querySet = new Set<string>();

    for (const queries of queriesArrays) {
      for (const query of queries) {
        querySet.add(query);
      }
    }

    return Array.from(querySet);
  }

  /**
   * Assess overall research quality based on individual results.
   */
  private assessOverallQuality(
    research: ConsolidatedResearchData,
    sources: GroundedSource[],
    individualQuality: {
      competitive?: { confidence: number; meetsMinimum: boolean; gaps: string[] };
      trends?: { confidence: number; meetsMinimum: boolean; gaps: string[] };
      pricing?: { confidence: number; meetsMinimum: boolean; gaps: string[] };
    }
  ): ResearchOrchestratorOutput['quality'] {
    const gaps: string[] = [];

    // Collect individual confidence scores
    const confidenceScores: number[] = [];
    const individual: { competitive?: number; trends?: number; pricing?: number } = {};

    if (individualQuality.competitive) {
      confidenceScores.push(individualQuality.competitive.confidence);
      individual.competitive = individualQuality.competitive.confidence;
      if (!individualQuality.competitive.meetsMinimum) {
        gaps.push('Competitive research did not meet minimum requirements');
      }
      gaps.push(...individualQuality.competitive.gaps.map((g) => `Competitive: ${g}`));
    } else {
      gaps.push('Competitive research failed or unavailable');
    }

    if (individualQuality.trends) {
      confidenceScores.push(individualQuality.trends.confidence);
      individual.trends = individualQuality.trends.confidence;
      if (!individualQuality.trends.meetsMinimum) {
        gaps.push('Trend research did not meet minimum requirements');
      }
      gaps.push(...individualQuality.trends.gaps.map((g) => `Trends: ${g}`));
    } else {
      gaps.push('Trend research failed or unavailable');
    }

    if (individualQuality.pricing) {
      confidenceScores.push(individualQuality.pricing.confidence);
      individual.pricing = individualQuality.pricing.confidence;
      if (!individualQuality.pricing.meetsMinimum) {
        gaps.push('Pricing research did not meet minimum requirements');
      }
      gaps.push(...individualQuality.pricing.gaps.map((g) => `Pricing: ${g}`));
    } else {
      gaps.push('Pricing research failed or unavailable');
    }

    // Calculate overall confidence as weighted average
    const confidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
        : 0;

    // Check if minimum requirements are met
    // At least one research type should have succeeded and met its minimum
    const meetsMinimum =
      (individualQuality.competitive?.meetsMinimum ||
        individualQuality.trends?.meetsMinimum ||
        individualQuality.pricing?.meetsMinimum) ??
      false;

    return {
      confidence,
      meetsMinimum,
      individual,
      gaps,
    };
  }
}
