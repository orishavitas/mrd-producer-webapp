/**
 * Tests for lib/scraper/tier1-fetch.ts
 *
 * Network calls are mocked via jest.spyOn(global, 'fetch').
 * HTML parsing helpers are tested directly with sample HTML.
 */

import * as cheerio from 'cheerio';
import {
  extractTitle,
  extractDescription,
  extractOgImage,
  extractImages,
  extractBodyText,
  isJsOnlyPage,
  parseTier1Html,
  scrapeWithTier1,
} from '@/lib/scraper/tier1-fetch';

// ---------------------------------------------------------------------------
// HTML fixtures
// ---------------------------------------------------------------------------

const FULL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Shop Title</title>
  <meta property="og:title" content="OG Product Title" />
  <meta property="og:description" content="Great product description here." />
  <meta property="og:image" content="https://cdn.com/og.jpg" />
  <meta name="description" content="Meta description text." />
</head>
<body>
  <p>Short</p>
  <p>This is a longer paragraph about the product that has more than 40 characters.</p>
  <img src="/images/product.jpg" alt="Product photo" width="800" height="600" />
  <img src="/icons/star.png" alt="icon" width="16" height="16" />
  <img src="https://cdn.com/hero.jpg" alt="Hero image" width="1200" height="900" />
</body>
</html>
`;

const SPA_HTML = `
<!DOCTYPE html>
<html>
<head><title>My App</title></head>
<body>
  <div id="root"></div>
</body>
</html>
`;

const NO_OG_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Plain Page</title>
  <meta name="description" content="Meta only description." />
</head>
<body>
  <p>Short.</p>
  <p>This is a paragraph that has more than forty characters of content.</p>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// Helper: load HTML
// ---------------------------------------------------------------------------

function load(html: string) {
  return cheerio.load(html);
}

// ---------------------------------------------------------------------------
// extractTitle
// ---------------------------------------------------------------------------

describe('extractTitle', () => {
  it('prefers og:title over <title>', () => {
    expect(extractTitle(load(FULL_HTML))).toBe('OG Product Title');
  });

  it('falls back to <title> when no og:title', () => {
    expect(extractTitle(load(NO_OG_HTML))).toBe('Plain Page');
  });

  it('returns empty string when no title element', () => {
    expect(extractTitle(load('<html><body></body></html>'))).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractDescription
// ---------------------------------------------------------------------------

describe('extractDescription', () => {
  it('prefers og:description', () => {
    expect(extractDescription(load(FULL_HTML))).toBe('Great product description here.');
  });

  it('falls back to meta description', () => {
    expect(extractDescription(load(NO_OG_HTML))).toBe('Meta only description.');
  });

  it('falls back to first long paragraph when no meta', () => {
    const html = `<html><body>
      <p>Short.</p>
      <p>This paragraph is long enough to be selected as a fallback description text.</p>
    </body></html>`;
    const result = extractDescription(load(html));
    expect(result).toContain('long enough');
  });

  it('returns empty string when nothing is available', () => {
    expect(extractDescription(load('<html><body><p>Hi</p></body></html>'))).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractOgImage
// ---------------------------------------------------------------------------

describe('extractOgImage', () => {
  it('returns og:image URL when present', () => {
    expect(extractOgImage(load(FULL_HTML))).toBe('https://cdn.com/og.jpg');
  });

  it('returns undefined when no og:image', () => {
    expect(extractOgImage(load(NO_OG_HTML))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extractImages
// ---------------------------------------------------------------------------

describe('extractImages', () => {
  const baseUrl = 'https://shop.com';

  it('resolves relative image URLs against base URL', () => {
    const images = extractImages(load(FULL_HTML), baseUrl);
    const productImg = images.find((i) => i.url.includes('product.jpg'));
    expect(productImg).toBeDefined();
    expect(productImg!.url).toBe('https://shop.com/images/product.jpg');
  });

  it('preserves absolute URLs unchanged', () => {
    const images = extractImages(load(FULL_HTML), baseUrl);
    const hero = images.find((i) => i.url.includes('hero.jpg'));
    expect(hero?.url).toBe('https://cdn.com/hero.jpg');
  });

  it('extracts width and height attributes', () => {
    const images = extractImages(load(FULL_HTML), baseUrl);
    const product = images.find((i) => i.url.includes('product.jpg'));
    expect(product?.width).toBe(800);
    expect(product?.height).toBe(600);
  });

  it('leaves width/height undefined when attributes are absent', () => {
    const html = '<html><body><img src="/img.jpg" alt="test" /></body></html>';
    const images = extractImages(load(html), baseUrl);
    expect(images[0].width).toBeUndefined();
    expect(images[0].height).toBeUndefined();
  });

  it('skips images with no src', () => {
    const html = '<html><body><img alt="no src" /></body></html>';
    expect(extractImages(load(html), baseUrl)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractBodyText
// ---------------------------------------------------------------------------

describe('extractBodyText', () => {
  it('returns text content from the body', () => {
    const text = extractBodyText(load(FULL_HTML));
    expect(text).toContain('longer paragraph');
  });

  it('removes script and style content', () => {
    const html = `<html><body>
      <script>var x = 1;</script>
      <style>.cls{color:red}</style>
      <p>Clean text here</p>
    </body></html>`;
    const text = extractBodyText(load(html));
    expect(text).not.toContain('var x');
    expect(text).not.toContain('.cls');
    expect(text).toContain('Clean text here');
  });

  it('caps output at 5 000 characters', () => {
    const longPara = 'A'.repeat(10_000);
    const html = `<html><body><p>${longPara}</p></body></html>`;
    expect(extractBodyText(load(html)).length).toBeLessThanOrEqual(5_000);
  });
});

// ---------------------------------------------------------------------------
// isJsOnlyPage
// ---------------------------------------------------------------------------

describe('isJsOnlyPage', () => {
  it('returns true for SPA shell with short body text', () => {
    const $ = load(SPA_HTML);
    const bodyText = extractBodyText($);
    expect(isJsOnlyPage($, bodyText)).toBe(true);
  });

  it('returns false for normal HTML page', () => {
    const $ = load(FULL_HTML);
    const bodyText = extractBodyText($);
    expect(isJsOnlyPage($, bodyText)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseTier1Html
// ---------------------------------------------------------------------------

describe('parseTier1Html', () => {
  const url = 'https://shop.com/product';

  it('returns a ScrapedPage with tier=1 and jsRendered=false', () => {
    const page = parseTier1Html(FULL_HTML, url);
    expect(page.tier).toBe(1);
    expect(page.jsRendered).toBe(false);
    expect(page.url).toBe(url);
  });

  it('populates title, description, ogImage', () => {
    const page = parseTier1Html(FULL_HTML, url);
    expect(page.title).toBe('OG Product Title');
    expect(page.description).toBe('Great product description here.');
    expect(page.ogImage).toBe('https://cdn.com/og.jpg');
  });

  it('filters images through photo-filter', () => {
    const page = parseTier1Html(FULL_HTML, url);
    // /icons/star.png should be filtered out (icon URL + tiny dimensions)
    const iconImg = page.images.find((i) => i.url.includes('star.png'));
    expect(iconImg).toBeUndefined();
  });

  it('includes hero image that passes the filter', () => {
    const page = parseTier1Html(FULL_HTML, url);
    const hero = page.images.find((i) => i.url.includes('hero.jpg'));
    expect(hero).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// scrapeWithTier1 (network mocked)
// ---------------------------------------------------------------------------

describe('scrapeWithTier1', () => {
  const mockUrl = 'https://shop.com/product';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a ScrapedPage on success', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: mockUrl,
      text: async () => FULL_HTML,
    } as Response);

    const page = await scrapeWithTier1(mockUrl);
    expect(page.title).toBe('OG Product Title');
    expect(page.tier).toBe(1);
  });

  it('throws when HTTP status is not 2xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      url: mockUrl,
      text: async () => '<html><body>Not found</body></html>',
    } as Response);

    await expect(scrapeWithTier1(mockUrl)).rejects.toThrow('HTTP 404');
  });

  it('throws when fetch rejects (network error)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

    await expect(scrapeWithTier1(mockUrl)).rejects.toThrow('Network failure');
  });
});
