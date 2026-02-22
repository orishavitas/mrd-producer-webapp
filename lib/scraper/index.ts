/**
 * Scraper Service — Public Entry Point
 *
 * Orchestrates the two-tier scraping strategy:
 *
 *   Tier 1 (fast):  HTTP fetch + Cheerio HTML parsing.
 *                   Works for static and server-rendered pages.
 *                   No browser required.
 *
 *   Tier 2 (heavy): Playwright headless Chromium.
 *                   Used when Tier 1 detects a JS-only SPA or fails entirely.
 *                   Requires `npx playwright install chromium` in the environment.
 *
 * Consumers should import from this file, not from tier1-fetch or
 * tier2-playwright directly.
 */

import { parseTier1Html, scrapeWithTier1 } from './tier1-fetch';
import { scrapeWithTier2 } from './tier2-playwright';
import { ScrapedPage, ScraperOptions, ScraperError } from './types';

// Re-export types for convenience
export type { ScrapedPage, ScraperOptions };
export { ScraperError };
export { filterProductPhotos, selectBestPhoto } from './photo-filter';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if a Tier 1 result is good enough to use directly.
 * "Good enough" means: has a title, has body text, and is not a JS-only shell.
 */
function isTier1ResultUsable(page: ScrapedPage & { _needsTier2?: boolean }): boolean {
  if ((page as { _needsTier2?: boolean })._needsTier2) return false;
  if (!page.title && !page.description && page.bodyText.length < 50) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape a URL using the two-tier strategy.
 *
 * 1. Always attempt Tier 1 first.
 * 2. If Tier 1 succeeds and the page looks complete, return it.
 * 3. If Tier 1 detects a JS-only SPA (or options.skipTier2 is false and Tier 1
 *    content is thin), upgrade to Tier 2.
 * 4. If both tiers fail, throw a ScraperError.
 *
 * @param url     - The URL to scrape.
 * @param options - Timeout and skip settings.
 */
export async function scrape(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedPage> {
  let tier1Error: Error | null = null;
  let tier1Page: (ScrapedPage & { _needsTier2?: boolean }) | null = null;

  // ── Tier 1 attempt ────────────────────────────────────────────────────────
  try {
    tier1Page = await scrapeWithTier1(url, options) as ScrapedPage & { _needsTier2?: boolean };

    if (isTier1ResultUsable(tier1Page)) {
      return tier1Page;
    }
    // Falls through to Tier 2 if the page needs JS
  } catch (err) {
    tier1Error = err instanceof Error ? err : new Error(String(err));
  }

  // ── Tier 2 (if not skipped) ───────────────────────────────────────────────
  if (options.skipTier2) {
    if (tier1Page) {
      // Return thin Tier 1 result rather than throwing
      return tier1Page;
    }
    throw new ScraperError(
      tier1Error?.message ?? 'Tier 1 failed and Tier 2 is disabled',
      url,
      1
    );
  }

  try {
    const tier2Page = await scrapeWithTier2(url, options);
    return tier2Page;
  } catch (tier2Err) {
    const tier2Message =
      tier2Err instanceof Error ? tier2Err.message : String(tier2Err);

    // If Tier 1 gave us something, prefer that over nothing
    if (tier1Page) {
      return tier1Page;
    }

    throw new ScraperError(
      `Tier 1: ${tier1Error?.message ?? 'JS-only page'}; Tier 2: ${tier2Message}`,
      url,
      'both'
    );
  }
}

/**
 * Parse raw HTML into a ScrapedPage without any network call.
 * Useful for testing or when HTML is retrieved externally.
 */
export { parseTier1Html as parseHtml };
