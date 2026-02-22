/**
 * Tier 1 Scraper — HTTP + Cheerio
 *
 * Fast, serverless-friendly scraping using the Node.js built-in fetch API
 * combined with Cheerio for HTML parsing.  Works for static or server-side-
 * rendered pages (no JavaScript execution).
 *
 * Exported for unit-testing with mock HTML; the main entry point is
 * `scrapeWithTier1(url, options)`.
 */

import * as cheerio from 'cheerio';
import { ScrapedImage, ScrapedPage, ScraperOptions } from './types';
import { filterProductPhotos } from './photo-filter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Common desktop user-agent string so sites don't block us as a bot.
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// HTML parsing helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Extract the page title from a Cheerio document.
 * Prefers Open Graph title, falls back to <title>.
 */
export function extractTitle($: cheerio.CheerioAPI): string {
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  if (ogTitle) return ogTitle;

  const title = $('title').text().trim();
  return title;
}

/**
 * Extract a short description from a Cheerio document.
 * Priority: og:description → meta description → first non-empty <p>.
 */
export function extractDescription($: cheerio.CheerioAPI): string {
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
  if (ogDesc) return ogDesc;

  const metaDesc = $('meta[name="description"]').attr('content')?.trim();
  if (metaDesc) return metaDesc;

  // Fall back to first non-trivial paragraph
  let firstPara = '';
  $('p').each((_, el) => {
    if (firstPara) return; // already found one
    const text = $(el).text().trim();
    if (text.length > 40) {
      firstPara = text;
    }
  });
  return firstPara;
}

/**
 * Extract the Open Graph image URL.
 */
export function extractOgImage($: cheerio.CheerioAPI): string | undefined {
  return $('meta[property="og:image"]').attr('content')?.trim() || undefined;
}

/**
 * Extract all <img> elements, resolving relative URLs against `baseUrl`.
 */
export function extractImages($: cheerio.CheerioAPI, baseUrl: string): ScrapedImage[] {
  const images: ScrapedImage[] = [];

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src) return;

    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(src, baseUrl).href;
    } catch {
      return; // skip unresolvable URLs
    }

    const alt = $(el).attr('alt') || '';
    const widthAttr = $(el).attr('width');
    const heightAttr = $(el).attr('height');

    const width = widthAttr ? parseInt(widthAttr, 10) : undefined;
    const height = heightAttr ? parseInt(heightAttr, 10) : undefined;

    images.push({
      url: resolvedUrl,
      alt,
      width: width && !isNaN(width) ? width : undefined,
      height: height && !isNaN(height) ? height : undefined,
    });
  });

  return images;
}

/**
 * Extract plain-text body content, capped at 5 000 characters.
 * Removes script/style content first.
 */
export function extractBodyText($: cheerio.CheerioAPI): string {
  // Remove non-content elements
  $('script, style, noscript, nav, footer, header, aside').remove();

  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.slice(0, 5_000);
}

// ---------------------------------------------------------------------------
// Detect JS-only pages
// ---------------------------------------------------------------------------

/**
 * Heuristic: if the body text is very short and the page contains a
 * <div id="root"> or <div id="app">, it's likely a React/Vue SPA that
 * requires JavaScript to render meaningful content.
 */
export function isJsOnlyPage($: cheerio.CheerioAPI, bodyText: string): boolean {
  const hasAppRoot =
    $('[id="root"]').length > 0 ||
    $('[id="app"]').length > 0 ||
    $('[data-reactroot]').length > 0;

  return hasAppRoot && bodyText.length < 200;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape a URL using HTTP fetch + Cheerio.
 * Throws if the request fails or returns a non-2xx status.
 *
 * @param url      - The page URL to scrape.
 * @param options  - Optional timeout and skip settings.
 * @returns        - Parsed page data.
 */
export async function scrapeWithTier1(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedPage> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let html: string;
  let finalUrl = url;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    finalUrl = response.url || url;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeoutId);
  }

  return parseTier1Html(html, finalUrl);
}

/**
 * Parse raw HTML into a ScrapedPage.
 * Exported separately so unit tests can inject HTML without network calls.
 */
export function parseTier1Html(html: string, url: string): ScrapedPage {
  const $ = cheerio.load(html);

  const title = extractTitle($);
  const description = extractDescription($);
  const ogImage = extractOgImage($);
  const rawImages = extractImages($, url);
  const bodyText = extractBodyText($);
  const jsOnly = isJsOnlyPage($, bodyText);

  // Filter images to product-photo candidates
  const images = filterProductPhotos(rawImages);

  return {
    url,
    title,
    description,
    ogImage,
    images,
    bodyText,
    tier: 1,
    jsRendered: false,
    // We flag the result so the caller knows Tier 2 may give better results
    ...(jsOnly ? { _needsTier2: true } : {}),
  } as ScrapedPage & { _needsTier2?: boolean };
}
