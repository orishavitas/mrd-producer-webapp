/**
 * Tier 2 Scraper — Playwright (Headless Chromium)
 *
 * Full browser automation for JavaScript-rendered pages that Tier 1
 * (HTTP + Cheerio) cannot parse.  Spins up a headless Chromium instance,
 * waits for the DOM to settle, then extracts the same data fields as Tier 1.
 *
 * Usage: call only when Tier 1 returns `_needsTier2: true` or explicitly
 * fails.  Much heavier than Tier 1 (~300-900 ms vs ~50-150 ms).
 *
 * No unit tests are provided for this module because launching a real browser
 * is an integration concern; it should be covered by e2e / smoke tests.
 *
 * To use this in production: ensure `npx playwright install chromium` has been
 * run in the target environment.
 */

import { chromium } from 'playwright';
import { ScrapedPage, ScraperOptions } from './types';
import { filterProductPhotos } from './photo-filter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 20_000;
const NETWORK_IDLE_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape a URL using a headless Chromium browser.
 *
 * @param url     - The page URL to scrape.
 * @param options - Optional timeout and other settings.
 * @returns       - Parsed page data with jsRendered=true.
 */
export async function scrapeWithTier2(
  url: string,
  options: ScraperOptions = {}
): Promise<ScrapedPage> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Navigate and wait for network to mostly settle
    await page.goto(url, {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded',
    });

    // Additional wait for network idle (best-effort)
    await page.waitForLoadState('networkidle', {
      timeout: NETWORK_IDLE_TIMEOUT_MS,
    }).catch(() => {
      // Network never went idle — proceed with current DOM
    });

    const finalUrl = page.url();

    // ---------------------------------------------------------------------------
    // Extract data via page.evaluate (runs in browser context)
    // ---------------------------------------------------------------------------

    const extracted = await page.evaluate(() => {
      // Title: prefer og:title
      const ogTitle =
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute('content')
          ?.trim() ?? '';
      const title = ogTitle || document.title.trim();

      // Description: og:description → meta description → first long <p>
      const ogDesc =
        document
          .querySelector('meta[property="og:description"]')
          ?.getAttribute('content')
          ?.trim() ?? '';
      const metaDesc =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content')
          ?.trim() ?? '';
      let fallbackDesc = '';
      if (!ogDesc && !metaDesc) {
        const paras = Array.from(document.querySelectorAll('p'));
        for (const p of paras) {
          const text = p.textContent?.trim() ?? '';
          if (text.length > 40) {
            fallbackDesc = text;
            break;
          }
        }
      }
      const description = ogDesc || metaDesc || fallbackDesc;

      // OG image
      const ogImage =
        document
          .querySelector('meta[property="og:image"]')
          ?.getAttribute('content')
          ?.trim() ?? undefined;

      // All images: collect src, alt, and rendered dimensions
      const images = Array.from(document.querySelectorAll('img'))
        .map((img) => {
          const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
          if (!src) return null;

          let resolvedUrl: string;
          try {
            resolvedUrl = new URL(src, window.location.href).href;
          } catch {
            return null;
          }

          return {
            url: resolvedUrl,
            alt: img.getAttribute('alt') || '',
            width: img.naturalWidth || img.width || undefined,
            height: img.naturalHeight || img.height || undefined,
          };
        })
        .filter(Boolean) as Array<{
          url: string;
          alt: string;
          width?: number;
          height?: number;
        }>;

      // Body text: strip scripts/styles, cap at 5 000 chars
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll('script,style,noscript,nav,footer,header,aside')
        .forEach((el) => el.remove());
      const bodyText = (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 5_000);

      return { title, description, ogImage, images, bodyText };
    });

    // Fix up undefined fields from page.evaluate (undefined becomes null in serialization)
    const images = extracted.images.map((img) => ({
      url: img.url,
      alt: img.alt,
      width: img.width && img.width > 0 ? img.width : undefined,
      height: img.height && img.height > 0 ? img.height : undefined,
    }));

    return {
      url: finalUrl,
      title: extracted.title,
      description: extracted.description,
      ogImage: extracted.ogImage ?? undefined,
      images: filterProductPhotos(images),
      bodyText: extracted.bodyText,
      tier: 2,
      jsRendered: true,
    };
  } finally {
    await browser.close();
  }
}
