/**
 * Tests for lib/scraper/index.ts (scraper service)
 *
 * All network and browser calls are mocked via jest.mock().
 */

import { scrape, ScraperError } from '@/lib/scraper/index';

// ---------------------------------------------------------------------------
// Mock tier implementations
// ---------------------------------------------------------------------------

jest.mock('@/lib/scraper/tier1-fetch', () => ({
  scrapeWithTier1: jest.fn(),
  parseTier1Html: jest.fn(),
}));

jest.mock('@/lib/scraper/tier2-playwright', () => ({
  scrapeWithTier2: jest.fn(),
}));

import { scrapeWithTier1 } from '@/lib/scraper/tier1-fetch';
import { scrapeWithTier2 } from '@/lib/scraper/tier2-playwright';

const mockTier1 = scrapeWithTier1 as jest.MockedFunction<typeof scrapeWithTier1>;
const mockTier2 = scrapeWithTier2 as jest.MockedFunction<typeof scrapeWithTier2>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GOOD_TIER1_PAGE = {
  url: 'https://shop.com/product',
  title: 'Great Camera',
  description: 'A great camera for all occasions.',
  ogImage: 'https://cdn.com/og.jpg',
  images: [
    { url: 'https://cdn.com/hero.jpg', alt: 'Hero', width: 1200, height: 900 },
  ],
  bodyText: 'This product is an amazing camera with many features for professional photographers.',
  tier: 1 as const,
  jsRendered: false,
};

const JS_ONLY_PAGE = {
  ...GOOD_TIER1_PAGE,
  title: 'My App',
  description: '',
  images: [],
  bodyText: '',
  _needsTier2: true,
};

const GOOD_TIER2_PAGE = {
  url: 'https://shop.com/product',
  title: 'Great Camera (JS)',
  description: 'Rendered by JavaScript.',
  images: [
    { url: 'https://cdn.com/hero.jpg', alt: 'Hero', width: 1200, height: 900 },
  ],
  bodyText: 'Full JavaScript-rendered content about this camera product.',
  tier: 2 as const,
  jsRendered: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scrape', () => {
  const url = 'https://shop.com/product';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path: Tier 1 succeeds ─────────────────────────────────────────

  it('returns Tier 1 result when it is usable', async () => {
    mockTier1.mockResolvedValueOnce(GOOD_TIER1_PAGE);

    const result = await scrape(url);
    expect(result.tier).toBe(1);
    expect(result.title).toBe('Great Camera');
    expect(mockTier2).not.toHaveBeenCalled();
  });

  // ── JS-only page: Tier 2 upgrade ─────────────────────────────────────────

  it('upgrades to Tier 2 when Tier 1 detects a JS-only page', async () => {
    mockTier1.mockResolvedValueOnce(JS_ONLY_PAGE as never);
    mockTier2.mockResolvedValueOnce(GOOD_TIER2_PAGE);

    const result = await scrape(url);
    expect(result.tier).toBe(2);
    expect(result.title).toBe('Great Camera (JS)');
    expect(mockTier2).toHaveBeenCalledTimes(1);
  });

  // ── Tier 1 error → Tier 2 fallback ───────────────────────────────────────

  it('falls back to Tier 2 when Tier 1 throws', async () => {
    mockTier1.mockRejectedValueOnce(new Error('HTTP 403'));
    mockTier2.mockResolvedValueOnce(GOOD_TIER2_PAGE);

    const result = await scrape(url);
    expect(result.tier).toBe(2);
  });

  // ── Both tiers fail ───────────────────────────────────────────────────────

  it('throws ScraperError when both tiers fail', async () => {
    mockTier1.mockRejectedValueOnce(new Error('HTTP 500'));
    mockTier2.mockRejectedValueOnce(new Error('Browser crashed'));

    await expect(scrape(url)).rejects.toBeInstanceOf(ScraperError);
  });

  it('ScraperError has tier="both" when both tiers fail', async () => {
    mockTier1.mockRejectedValueOnce(new Error('Network error'));
    mockTier2.mockRejectedValueOnce(new Error('Timeout'));

    try {
      await scrape(url);
    } catch (err) {
      expect(err).toBeInstanceOf(ScraperError);
      expect((err as ScraperError).tier).toBe('both');
      expect((err as ScraperError).url).toBe(url);
    }
  });

  // ── skipTier2 option ─────────────────────────────────────────────────────

  it('returns Tier 1 result even if thin when skipTier2=true', async () => {
    mockTier1.mockResolvedValueOnce(JS_ONLY_PAGE as never);

    const result = await scrape(url, { skipTier2: true });
    expect(result.tier).toBe(1);
    expect(mockTier2).not.toHaveBeenCalled();
  });

  it('throws ScraperError when Tier 1 fails and skipTier2=true', async () => {
    mockTier1.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(scrape(url, { skipTier2: true })).rejects.toBeInstanceOf(ScraperError);
    expect(mockTier2).not.toHaveBeenCalled();
  });

  it('ScraperError has tier=1 when only Tier 1 fails (skipTier2)', async () => {
    mockTier1.mockRejectedValueOnce(new Error('Connection refused'));

    try {
      await scrape(url, { skipTier2: true });
    } catch (err) {
      expect((err as ScraperError).tier).toBe(1);
    }
  });

  // ── Tier 2 fails but Tier 1 gave thin result ──────────────────────────────

  it('returns thin Tier 1 result when Tier 2 also fails', async () => {
    mockTier1.mockResolvedValueOnce(JS_ONLY_PAGE as never);
    mockTier2.mockRejectedValueOnce(new Error('Browser not installed'));

    const result = await scrape(url);
    // Should return the Tier 1 page even though it's thin
    expect(result.tier).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ScraperError
// ---------------------------------------------------------------------------

describe('ScraperError', () => {
  it('has correct name, message, url, and tier', () => {
    const err = new ScraperError('Something went wrong', 'https://example.com', 'both');
    expect(err.name).toBe('ScraperError');
    expect(err.message).toBe('Something went wrong');
    expect(err.url).toBe('https://example.com');
    expect(err.tier).toBe('both');
  });

  it('is an instance of Error', () => {
    const err = new ScraperError('fail', 'https://example.com', 1);
    expect(err).toBeInstanceOf(Error);
  });
});
