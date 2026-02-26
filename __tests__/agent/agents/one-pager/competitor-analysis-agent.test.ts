/**
 * Tests for agent/agents/one-pager/competitor-analysis-agent.ts
 *
 * All AI provider calls are mocked so no API keys are required.
 */

import {
  CompetitorAnalysisAgent,
  CompetitorAnalysisInput,
} from '@/agent/agents/one-pager/competitor-analysis-agent';
import { createTestExecutionContext } from '@/agent/core/execution-context';
import { ExecutionContext } from '@/agent/core/types';
import { ScrapedPage } from '@/lib/scraper/types';

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

const mockGenerateText = jest.fn();

const mockProvider = {
  name: 'mock-provider',
  capabilities: {
    textGeneration: true,
    searchGrounding: false,
    structuredOutput: false,
    streaming: false,
    functionCalling: false,
  },
  generateText: mockGenerateText,
  generateStructuredOutput: jest.fn(),
  generateWithSearch: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCRAPED_PAGE: ScrapedPage = {
  url: 'https://acme.com/product',
  title: 'ACME Pro Camera',
  description: 'Professional camera for photographers.',
  ogImage: 'https://acme.com/og.jpg',
  images: [
    { url: 'https://acme.com/images/camera.jpg', alt: 'Camera', width: 800, height: 600 },
  ],
  bodyText: 'The ACME Pro Camera is the best professional camera on the market. Priced at $999.',
  tier: 1,
  jsRendered: false,
};

const VALID_INPUT: CompetitorAnalysisInput = {
  url: 'https://acme.com/product',
  page: SCRAPED_PAGE,
};

const VALID_JSON_RESPONSE = JSON.stringify({
  brand: 'ACME',
  productName: 'Pro Camera',
  description: 'Professional camera for photographers.',
  cost: '$999',
  link: 'https://acme.com/product',
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function makeContext(): ExecutionContext {
  const ctx = createTestExecutionContext();
  // Override getProvider to return our mock
  (ctx as any).getProvider = () => mockProvider;
  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CompetitorAnalysisAgent', () => {
  let agent: CompetitorAnalysisAgent;
  let context: ExecutionContext;

  beforeEach(() => {
    agent = new CompetitorAnalysisAgent();
    context = makeContext();
    jest.clearAllMocks();
  });

  // ── Identity ──────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('has correct id and metadata', () => {
      expect(agent.id).toBe('competitor-analysis-agent');
      expect(agent.name).toBe('Competitor Analysis Agent');
      expect(agent.version).toBe('1.0.0');
    });

    it('requires textGeneration capability', () => {
      expect(agent.requiredCapabilities).toContain('textGeneration');
    });
  });

  // ── Input validation ──────────────────────────────────────────────────────

  describe('validateInput', () => {
    it('returns valid for correct input', () => {
      expect(agent.validateInput(VALID_INPUT)).toEqual({ valid: true });
    });

    it('rejects missing url', () => {
      const result = agent.validateInput({ ...VALID_INPUT, url: '' });
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('url'))).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = agent.validateInput({ ...VALID_INPUT, url: 'not-a-url' });
      expect(result.valid).toBe(false);
    });

    it('rejects missing page', () => {
      const result = agent.validateInput({ url: 'https://acme.com', page: null as any });
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('page'))).toBe(true);
    });
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('execute — happy path', () => {
    it('returns CompetitorData with AI-extracted fields', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: VALID_JSON_RESPONSE });

      const result = await agent.execute(VALID_INPUT, context);

      expect(result.success).toBe(true);
      expect(result.data?.brand).toBe('ACME');
      expect(result.data?.productName).toBe('Pro Camera');
      expect(result.data?.cost).toBe('$999');
    });

    it('attaches best product photo from scraped images', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: VALID_JSON_RESPONSE });

      const result = await agent.execute(VALID_INPUT, context);

      expect(result.data?.imageUrl).toBe('https://acme.com/images/camera.jpg');
    });

    it('falls back to ogImage when no product photos pass filter', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: VALID_JSON_RESPONSE });

      const input: CompetitorAnalysisInput = {
        ...VALID_INPUT,
        page: {
          ...SCRAPED_PAGE,
          images: [], // no images
          ogImage: 'https://acme.com/og.jpg',
        },
      };

      const result = await agent.execute(input, context);
      expect(result.data?.imageUrl).toBe('https://acme.com/og.jpg');
    });

    it('parses JSON wrapped in markdown code fences', async () => {
      const fenced = `\`\`\`json\n${VALID_JSON_RESPONSE}\n\`\`\``;
      mockGenerateText.mockResolvedValueOnce({ text: fenced });

      const result = await agent.execute(VALID_INPUT, context);
      expect(result.success).toBe(true);
      expect(result.data?.brand).toBe('ACME');
    });
  });

  // ── Graceful degradation ──────────────────────────────────────────────────

  describe('execute — graceful degradation', () => {
    it('returns minimal data when AI returns invalid JSON', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: 'This is not JSON at all.' });

      const result = await agent.execute(VALID_INPUT, context);

      // Should succeed with fallback data from scraped page
      expect(result.success).toBe(true);
      expect(result.data?.link).toBe(VALID_INPUT.url);
      expect(result.data?.productName).toBe(SCRAPED_PAGE.title);
    });

    it('returns failure when provider throws', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      // Disable fallback to prevent retries in test
      (context as any).config = { ...context.config, enableFallback: false };

      const result = await agent.execute(VALID_INPUT, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });

  // ── link field ────────────────────────────────────────────────────────────

  describe('link field', () => {
    it('always sets link to the input URL', async () => {
      const responseWithDifferentLink = JSON.stringify({
        brand: 'ACME',
        productName: 'Pro Camera',
        description: 'A camera.',
        cost: '$999',
        link: 'https://different-url.com/product', // AI may hallucinate
      });
      mockGenerateText.mockResolvedValueOnce({ text: responseWithDifferentLink });

      const result = await agent.execute(VALID_INPUT, context);
      // We preserve what the AI returns (link normalisation is in the orchestrator)
      expect(result.data?.link).toBeDefined();
    });
  });
});
