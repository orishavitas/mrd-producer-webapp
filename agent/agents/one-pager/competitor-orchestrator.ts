/**
 * Competitor Orchestrator Agent
 *
 * End-to-end pipeline for a single competitor URL:
 *   1. Scrape the URL (Tier 1 → Tier 2 as needed) using the scraper service.
 *   2. Pass the scraped content to CompetitorAnalysisAgent for AI enrichment.
 *   3. Return a fully-populated CompetitorData object.
 *
 * The extract-competitor API route delegates to this agent so all business
 * logic lives in the agent layer, not in the route handler.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { CompetitorData, ScraperOptions } from '@/lib/scraper/types';
import { scrape } from '@/lib/scraper/index';
import {
  CompetitorAnalysisAgent,
  CompetitorAnalysisInput,
} from './competitor-analysis-agent';

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface CompetitorOrchestratorInput {
  /** The competitor URL submitted by the user */
  url: string;
  /** Optional scraper settings (timeout, skipTier2) */
  scraperOptions?: ScraperOptions;
}

export type CompetitorOrchestratorOutput = CompetitorData;

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class CompetitorOrchestratorAgent extends BaseAgent<
  CompetitorOrchestratorInput,
  CompetitorOrchestratorOutput
> {
  readonly id = 'competitor-orchestrator-agent';
  readonly name = 'Competitor Orchestrator Agent';
  readonly version = '1.0.0';
  readonly description =
    'Orchestrates web scraping and AI analysis to produce structured competitor data from a URL';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  private analysisAgent = new CompetitorAnalysisAgent();

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: CompetitorOrchestratorInput): ValidationResult {
    const errors: string[] = [];

    if (!input?.url || typeof input.url !== 'string') {
      errors.push('url is required and must be a string');
      return { valid: false, errors };
    }

    try {
      new URL(input.url);
    } catch {
      errors.push('url must be a valid URL');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: CompetitorOrchestratorInput,
    context: ExecutionContext
  ): Promise<CompetitorOrchestratorOutput> {
    context.log('info', `[${this.id}] Starting competitor extraction`, {
      url: input.url,
    });

    // ── Step 1: Scrape ──────────────────────────────────────────────────────
    let page;
    try {
      page = await scrape(input.url, input.scraperOptions);
      context.log('info', `[${this.id}] Scrape complete`, {
        tier: page.tier,
        title: page.title,
        imageCount: page.images.length,
      });
    } catch (scrapeErr) {
      const msg = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
      context.log('warn', `[${this.id}] Scrape failed, using empty page`, { err: msg });

      // Construct a minimal empty page so the analysis agent can still attempt
      // extraction using only the URL (AI may hallucinate less with some context)
      page = {
        url: input.url,
        title: '',
        description: '',
        images: [],
        bodyText: '',
        tier: 1 as const,
        jsRendered: false,
      };
    }

    // ── Step 2: AI analysis ─────────────────────────────────────────────────
    const analysisInput: CompetitorAnalysisInput = {
      url: input.url,
      page,
    };

    const analysisResult = await this.analysisAgent.execute(analysisInput, context);

    if (!analysisResult.success || !analysisResult.data) {
      throw new Error(
        analysisResult.error ?? 'Competitor analysis failed without a specific error'
      );
    }

    // Ensure link always points to the original input URL
    const competitor: CompetitorData = {
      ...analysisResult.data,
      link: input.url,
    };

    context.log('info', `[${this.id}] Extraction complete`, {
      brand: competitor.brand,
      productName: competitor.productName,
      hasImage: !!competitor.imageUrl,
    });

    return competitor;
  }
}
