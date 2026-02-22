/**
 * Tests for agent/agents/one-pager/competitor-orchestrator.ts
 *
 * Both the scraper service and the analysis agent are mocked so no network
 * or AI calls are made.
 */

import {
  CompetitorOrchestratorAgent,
  CompetitorOrchestratorInput,
} from '@/agent/agents/one-pager/competitor-orchestrator';
import { createTestExecutionContext } from '@/agent/core/execution-context';
import { ExecutionContext } from '@/agent/core/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/scraper/index', () => ({
  scrape: jest.fn(),
}));

jest.mock('@/agent/agents/one-pager/competitor-analysis-agent', () => ({
  CompetitorAnalysisAgent: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

import { scrape } from '@/lib/scraper/index';
import { CompetitorAnalysisAgent } from '@/agent/agents/one-pager/competitor-analysis-agent';

const mockScrape = scrape as jest.MockedFunction<typeof scrape>;
const MockCompetitorAnalysisAgent = CompetitorAnalysisAgent as jest.MockedClass<typeof CompetitorAnalysisAgent>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCRAPED_PAGE = {
  url: 'https://acme.com/product',
  title: 'ACME Camera',
  description: 'Best camera.',
  ogImage: 'https://acme.com/og.jpg',
  images: [{ url: 'https://acme.com/cam.jpg', alt: 'Camera', width: 800, height: 600 }],
  bodyText: 'Great product content here for the camera.',
  tier: 1 as const,
  jsRendered: false,
};

const COMPETITOR_DATA = {
  brand: 'ACME',
  productName: 'Camera',
  description: 'Best camera.',
  cost: '$999',
  link: 'https://acme.com/product',
  imageUrl: 'https://acme.com/cam.jpg',
};

const VALID_INPUT: CompetitorOrchestratorInput = {
  url: 'https://acme.com/product',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockProvider = {
  name: 'mock-provider',
  capabilities: {
    textGeneration: true,
    searchGrounding: false,
    structuredOutput: false,
    streaming: false,
    functionCalling: false,
  },
  generateText: jest.fn(),
  generateStructuredOutput: jest.fn(),
  generateWithSearch: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

function makeContext(): ExecutionContext {
  const ctx = createTestExecutionContext();
  (ctx as any).getProvider = () => mockProvider;
  return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CompetitorOrchestratorAgent', () => {
  let agent: CompetitorOrchestratorAgent;
  let context: ExecutionContext;
  let mockAnalysisExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new CompetitorOrchestratorAgent();
    context = makeContext();

    // Get reference to the mock analysis agent's execute method
    mockAnalysisExecute = (agent as any).analysisAgent.execute;
  });

  // ── Identity ──────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('has correct id and metadata', () => {
      expect(agent.id).toBe('competitor-orchestrator-agent');
      expect(agent.name).toBe('Competitor Orchestrator Agent');
      expect(agent.version).toBe('1.0.0');
    });
  });

  // ── Input validation ──────────────────────────────────────────────────────

  describe('validateInput', () => {
    it('accepts valid URL', () => {
      expect(agent.validateInput(VALID_INPUT)).toEqual({ valid: true });
    });

    it('rejects missing url', () => {
      const result = agent.validateInput({ url: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects malformed URL', () => {
      const result = agent.validateInput({ url: 'not-a-url' });
      expect(result.valid).toBe(false);
    });

    it('rejects null input', () => {
      const result = agent.validateInput(null as any);
      expect(result.valid).toBe(false);
    });
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('execute — happy path', () => {
    it('calls scrape then analysis and returns CompetitorData', async () => {
      mockScrape.mockResolvedValueOnce(SCRAPED_PAGE);
      mockAnalysisExecute.mockResolvedValueOnce({
        success: true,
        data: COMPETITOR_DATA,
      });

      const result = await agent.execute(VALID_INPUT, context);

      expect(result.success).toBe(true);
      expect(result.data?.brand).toBe('ACME');
      expect(result.data?.productName).toBe('Camera');
      expect(mockScrape).toHaveBeenCalledWith(VALID_INPUT.url, undefined);
      expect(mockAnalysisExecute).toHaveBeenCalledTimes(1);
    });

    it('always sets link to the original input URL', async () => {
      mockScrape.mockResolvedValueOnce(SCRAPED_PAGE);
      mockAnalysisExecute.mockResolvedValueOnce({
        success: true,
        data: { ...COMPETITOR_DATA, link: 'https://redirect.com' },
      });

      const result = await agent.execute(VALID_INPUT, context);
      expect(result.data?.link).toBe(VALID_INPUT.url);
    });

    it('passes scraperOptions to scrape()', async () => {
      mockScrape.mockResolvedValueOnce(SCRAPED_PAGE);
      mockAnalysisExecute.mockResolvedValueOnce({ success: true, data: COMPETITOR_DATA });

      const input: CompetitorOrchestratorInput = {
        url: 'https://acme.com/product',
        scraperOptions: { timeoutMs: 5000, skipTier2: true },
      };

      await agent.execute(input, context);
      expect(mockScrape).toHaveBeenCalledWith(input.url, input.scraperOptions);
    });
  });

  // ── Scrape failure fallback ───────────────────────────────────────────────

  describe('execute — scrape failure', () => {
    it('continues with empty page when scraping fails', async () => {
      mockScrape.mockRejectedValueOnce(new Error('Connection refused'));
      mockAnalysisExecute.mockResolvedValueOnce({
        success: true,
        data: { ...COMPETITOR_DATA, brand: 'Unknown' },
      });

      const result = await agent.execute(VALID_INPUT, context);
      // Should succeed (analysis agent tried its best with empty page)
      expect(result.success).toBe(true);

      // Analysis agent should have been called with an empty page
      const analysisCall = mockAnalysisExecute.mock.calls[0][0];
      expect(analysisCall.page.title).toBe('');
      expect(analysisCall.page.bodyText).toBe('');
    });
  });

  // ── Analysis failure ──────────────────────────────────────────────────────

  describe('execute — analysis failure', () => {
    it('returns failure when analysis agent fails', async () => {
      mockScrape.mockResolvedValueOnce(SCRAPED_PAGE);
      mockAnalysisExecute.mockResolvedValueOnce({
        success: false,
        error: 'AI provider unavailable',
      });

      // Disable fallback to avoid retry loops in tests
      (context as any).config = { ...context.config, enableFallback: false };

      const result = await agent.execute(VALID_INPUT, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable');
    });
  });
});
