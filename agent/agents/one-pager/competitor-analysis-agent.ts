/**
 * Competitor Analysis Agent
 *
 * Accepts a scraped page (ScrapedPage) and uses the AI provider to extract
 * structured competitor data (CompetitorData).
 *
 * Designed to work with real page content so the AI has genuine text and
 * image URLs to reason about — much richer than asking the AI to hallucinate
 * data from a URL alone.
 *
 * The agent is intentionally thin: it does one AI call and parses JSON.
 * Orchestration (scraping → analysis) lives in CompetitorOrchestratorAgent.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { ScrapedPage, CompetitorData } from '@/lib/scraper/types';
import { selectBestPhoto } from '@/lib/scraper/photo-filter';

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface CompetitorAnalysisInput {
  /** The URL originally submitted by the user */
  url: string;
  /** Scraped page content from the scraper service */
  page: ScrapedPage;
}

export type CompetitorAnalysisOutput = CompetitorData;

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a product analyst. Given a product page's scraped content, \
extract structured data and return ONLY valid JSON — no markdown, no commentary.

JSON shape:
{
  "brand": "company or brand name",
  "productName": "product name",
  "description": "1-2 sentence product description",
  "cost": "price or price range, empty string if unknown",
  "link": "canonical product URL"
}`;

function buildUserPrompt(input: CompetitorAnalysisInput): string {
  const { page } = input;
  const lines: string[] = [
    `URL: ${input.url}`,
    `Title: ${page.title}`,
    `Description: ${page.description}`,
  ];

  if (page.bodyText) {
    lines.push(`Page content (first 1500 chars):\n${page.bodyText.slice(0, 1_500)}`);
  }

  return lines.join('\n\n');
}

// ---------------------------------------------------------------------------
// JSON parsing helper
// ---------------------------------------------------------------------------

/**
 * Strip markdown code fences that some models wrap JSON in.
 */
function stripMarkdownJson(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function parseCompetitorJson(raw: string, fallbackUrl: string): CompetitorData {
  const cleaned = stripMarkdownJson(raw);
  const parsed = JSON.parse(cleaned);

  return {
    brand: String(parsed.brand ?? ''),
    productName: String(parsed.productName ?? ''),
    description: String(parsed.description ?? ''),
    cost: String(parsed.cost ?? ''),
    link: String(parsed.link ?? fallbackUrl),
  };
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class CompetitorAnalysisAgent extends BaseAgent<
  CompetitorAnalysisInput,
  CompetitorAnalysisOutput
> {
  readonly id = 'competitor-analysis-agent';
  readonly name = 'Competitor Analysis Agent';
  readonly version = '1.0.0';
  readonly description =
    'Extracts structured competitor data from scraped page content using AI';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: CompetitorAnalysisInput): ValidationResult {
    const errors: string[] = [];

    if (!input?.url || typeof input.url !== 'string') {
      errors.push('url is required and must be a string');
    } else {
      try {
        new URL(input.url);
      } catch {
        errors.push('url must be a valid URL');
      }
    }

    if (!input?.page || typeof input.page !== 'object') {
      errors.push('page is required and must be a ScrapedPage object');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: CompetitorAnalysisInput,
    context: ExecutionContext
  ): Promise<CompetitorAnalysisOutput> {
    context.log('info', `[${this.id}] Analysing page`, { url: input.url });

    const provider = context.getProvider();
    const userPrompt = buildUserPrompt(input);

    const response = await provider.generateText(userPrompt, SYSTEM_PROMPT);

    let competitor: CompetitorData;
    try {
      competitor = parseCompetitorJson(response.text, input.url);
    } catch (err) {
      context.log('warn', `[${this.id}] JSON parse failed — returning minimal data`, {
        raw: response.text.slice(0, 200),
        err: err instanceof Error ? err.message : String(err),
      });
      competitor = {
        brand: '',
        productName: input.page.title || '',
        description: input.page.description || '',
        cost: '',
        link: input.url,
      };
    }

    // Attach best product photo from scrape results
    const bestPhoto = selectBestPhoto(input.page.images);
    if (bestPhoto) {
      competitor.imageUrl = bestPhoto.url;
    } else if (input.page.ogImage) {
      competitor.imageUrl = input.page.ogImage;
    }

    context.log('info', `[${this.id}] Analysis complete`, {
      brand: competitor.brand,
      productName: competitor.productName,
    });

    return competitor;
  }
}
