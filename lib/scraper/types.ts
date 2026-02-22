/**
 * Scraper Service Type Definitions
 *
 * Shared types for the tiered web scraping system.
 * Tier 1 uses HTTP + Cheerio (fast, no JS).
 * Tier 2 uses Playwright (full browser, JS-rendered pages).
 */

// ---------------------------------------------------------------------------
// Core result types
// ---------------------------------------------------------------------------

/**
 * A single image found on a scraped page.
 */
export interface ScrapedImage {
  /** Absolute URL of the image */
  url: string;
  /** Alt text from the img element (may be empty) */
  alt: string;
  /** Rendered width in px if available */
  width?: number;
  /** Rendered height in px if available */
  height?: number;
}

/**
 * The raw data extracted from a page before AI enrichment.
 */
export interface ScrapedPage {
  /** The URL that was scraped (may differ from input due to redirects) */
  url: string;
  /** Page <title> */
  title: string;
  /** Meta description or first meaningful paragraph */
  description: string;
  /** Open Graph image URL if present */
  ogImage?: string;
  /** All images found on the page (after photo-filter) */
  images: ScrapedImage[];
  /** Plain-text body content (trimmed, max 5 000 chars) */
  bodyText: string;
  /** Which tier performed the scrape */
  tier: 1 | 2;
  /** True if the page required JavaScript to render (Tier 2 only) */
  jsRendered: boolean;
}

/**
 * Structured competitor data extracted from a scraped page.
 * Returned by the competitor-analysis agent after AI enrichment.
 */
export interface CompetitorData {
  /** Brand / company name */
  brand: string;
  /** Product name */
  productName: string;
  /** 1-2 sentence product description */
  description: string;
  /** Price or price range, empty string if unknown */
  cost: string;
  /** The canonical URL */
  link: string;
  /** Hero / product image URL (best candidate from scrape) */
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Scraper options and errors
// ---------------------------------------------------------------------------

/**
 * Options forwarded to the scraper service.
 */
export interface ScraperOptions {
  /**
   * Maximum time in milliseconds to wait for a page load.
   * Defaults to 15 000 ms.
   */
  timeoutMs?: number;
  /**
   * When true, skip Tier 2 even if Tier 1 fails.
   * Useful in unit tests to avoid launching a real browser.
   */
  skipTier2?: boolean;
}

/**
 * Thrown when scraping fails at all tiers.
 */
export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly tier: 1 | 2 | 'both'
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}

// ---------------------------------------------------------------------------
// Photo-filter types
// ---------------------------------------------------------------------------

/**
 * Criteria used to decide whether an image is a "product photo".
 * All numeric values are in pixels.
 */
export interface PhotoFilterCriteria {
  minWidth: number;
  minHeight: number;
  /** Minimum area (width × height) in pixels² */
  minArea: number;
  /** Aspect ratio must be between minRatio and maxRatio */
  minRatio: number;
  maxRatio: number;
}

/**
 * Default filter criteria for product photos.
 * Rejects tiny icons, banners, and extreme-landscape/portrait images.
 */
export const DEFAULT_PHOTO_FILTER: PhotoFilterCriteria = {
  minWidth: 200,
  minHeight: 150,
  minArea: 40_000,
  minRatio: 0.4,
  maxRatio: 3.0,
};
