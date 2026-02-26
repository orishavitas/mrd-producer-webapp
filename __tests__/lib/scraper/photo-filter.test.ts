/**
 * Tests for lib/scraper/photo-filter.ts
 *
 * All functions are pure / deterministic so no mocking is needed.
 */

import {
  isExcludedByUrl,
  isExcludedByAlt,
  meetsMinimumSize,
  isProductPhoto,
  filterProductPhotos,
  selectBestPhoto,
} from '@/lib/scraper/photo-filter';
import { ScrapedImage, PhotoFilterCriteria } from '@/lib/scraper/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<ScrapedImage> = {}): ScrapedImage {
  return {
    url: 'https://example.com/products/camera.jpg',
    alt: 'Product photo',
    width: 800,
    height: 600,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isExcludedByUrl
// ---------------------------------------------------------------------------

describe('isExcludedByUrl', () => {
  it('returns false for a normal product image URL', () => {
    expect(isExcludedByUrl('https://shop.com/products/shirt.jpg')).toBe(false);
  });

  it('returns true for URLs containing /icons/', () => {
    expect(isExcludedByUrl('https://cdn.com/icons/check.png')).toBe(true);
  });

  it('returns true for URLs containing /logo/', () => {
    expect(isExcludedByUrl('https://brand.com/logo/main.png')).toBe(true);
  });

  it('returns true for URLs containing /sprites/', () => {
    expect(isExcludedByUrl('https://cdn.com/sprites/ui.png')).toBe(true);
  });

  it('returns true for URLs containing /avatars/', () => {
    expect(isExcludedByUrl('https://users.com/avatars/user123.jpg')).toBe(true);
  });

  it('returns true for SVG files', () => {
    expect(isExcludedByUrl('https://cdn.com/assets/arrow.svg')).toBe(true);
    expect(isExcludedByUrl('https://cdn.com/icon.svg?v=2')).toBe(true);
  });

  it('returns true for 1x1 tracking pixels in path', () => {
    expect(isExcludedByUrl('https://tracker.com/1x1.gif')).toBe(true);
  });

  it('returns true for placeholder images', () => {
    expect(isExcludedByUrl('https://cdn.com/placeholder.jpg')).toBe(true);
  });

  it('returns true for malformed URLs', () => {
    expect(isExcludedByUrl('not-a-url')).toBe(true);
    expect(isExcludedByUrl('')).toBe(true);
  });

  it('returns false for /ads-free/ (only /ad/ or /ads/ should match)', () => {
    // /ads/ pattern matches path segment, not substring
    expect(isExcludedByUrl('https://cdn.com/products/adapter.jpg')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isExcludedByAlt
// ---------------------------------------------------------------------------

describe('isExcludedByAlt', () => {
  it('returns false for descriptive alt text', () => {
    expect(isExcludedByAlt('Blue running shoes on white background')).toBe(false);
  });

  it('returns true for alt="logo"', () => {
    expect(isExcludedByAlt('logo')).toBe(true);
    expect(isExcludedByAlt('Logo')).toBe(true);
    expect(isExcludedByAlt('LOGO')).toBe(true);
  });

  it('returns true for alt="icon"', () => {
    expect(isExcludedByAlt('icon')).toBe(true);
  });

  it('returns true for alt="avatar"', () => {
    expect(isExcludedByAlt('avatar')).toBe(true);
  });

  it('returns true for alt starting with "tracking"', () => {
    expect(isExcludedByAlt('tracking pixel')).toBe(true);
  });

  it('returns true for alt="spacer"', () => {
    expect(isExcludedByAlt('spacer')).toBe(true);
  });

  it('returns false for empty alt (unknown — cannot exclude)', () => {
    expect(isExcludedByAlt('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// meetsMinimumSize
// ---------------------------------------------------------------------------

describe('meetsMinimumSize', () => {
  const criteria: PhotoFilterCriteria = {
    minWidth: 200,
    minHeight: 150,
    minArea: 40_000,
    minRatio: 0.4,
    maxRatio: 3.0,
  };

  it('returns true for an image that meets all criteria', () => {
    expect(meetsMinimumSize(makeImage({ width: 800, height: 600 }), criteria)).toBe(true);
  });

  it('returns true when width/height are undefined (cannot measure)', () => {
    expect(meetsMinimumSize(makeImage({ width: undefined, height: undefined }), criteria)).toBe(
      true
    );
  });

  it('returns false when width is below minimum', () => {
    expect(meetsMinimumSize(makeImage({ width: 100, height: 600 }), criteria)).toBe(false);
  });

  it('returns false when height is below minimum', () => {
    expect(meetsMinimumSize(makeImage({ width: 800, height: 50 }), criteria)).toBe(false);
  });

  it('returns false when area is too small', () => {
    // 200 × 199 = 39 800 < 40 000
    expect(meetsMinimumSize(makeImage({ width: 200, height: 199 }), criteria)).toBe(false);
  });

  it('returns false for extreme landscape (ratio > maxRatio)', () => {
    // 3000 / 100 = 30 > 3.0
    expect(meetsMinimumSize(makeImage({ width: 3000, height: 100 }), criteria)).toBe(false);
  });

  it('returns false for extreme portrait (ratio < minRatio)', () => {
    // 100 / 3000 ≈ 0.033 < 0.4
    expect(meetsMinimumSize(makeImage({ width: 100, height: 3000 }), criteria)).toBe(false);
  });

  it('uses DEFAULT_PHOTO_FILTER when criteria not supplied', () => {
    // Should pass with sensible product image
    expect(meetsMinimumSize(makeImage({ width: 1200, height: 900 }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isProductPhoto
// ---------------------------------------------------------------------------

describe('isProductPhoto', () => {
  it('returns true for a well-formed product image', () => {
    expect(isProductPhoto(makeImage())).toBe(true);
  });

  it('returns false if URL is excluded', () => {
    expect(isProductPhoto(makeImage({ url: 'https://cdn.com/icons/star.png' }))).toBe(false);
  });

  it('returns false if alt text is excluded', () => {
    expect(isProductPhoto(makeImage({ alt: 'logo' }))).toBe(false);
  });

  it('returns false if image is too small', () => {
    expect(isProductPhoto(makeImage({ width: 50, height: 50 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterProductPhotos
// ---------------------------------------------------------------------------

describe('filterProductPhotos', () => {
  const good1 = makeImage({ url: 'https://shop.com/p1.jpg', width: 800, height: 600 });
  const good2 = makeImage({ url: 'https://shop.com/p2.jpg', width: 900, height: 700 });
  const good3 = makeImage({ url: 'https://shop.com/p3.jpg', width: 1000, height: 800 });
  const icon = makeImage({ url: 'https://cdn.com/icons/star.png' });
  const tiny = makeImage({ url: 'https://shop.com/tiny.jpg', width: 20, height: 20 });

  it('filters out excluded images', () => {
    const result = filterProductPhotos([good1, icon, tiny, good2]);
    expect(result).toHaveLength(2);
    expect(result).toContain(good1);
    expect(result).toContain(good2);
  });

  it('respects maxResults cap (default 5)', () => {
    const images = Array.from({ length: 10 }, (_, i) =>
      makeImage({ url: `https://shop.com/p${i}.jpg`, width: 800, height: 600 })
    );
    expect(filterProductPhotos(images)).toHaveLength(5);
  });

  it('respects custom maxResults', () => {
    const images = [good1, good2, good3];
    expect(filterProductPhotos(images, undefined, 2)).toHaveLength(2);
  });

  it('returns empty array when all images are excluded', () => {
    expect(filterProductPhotos([icon, tiny])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectBestPhoto
// ---------------------------------------------------------------------------

describe('selectBestPhoto', () => {
  it('returns undefined when no candidates pass the filter', () => {
    const icon = makeImage({ url: 'https://cdn.com/icons/star.png' });
    expect(selectBestPhoto([icon])).toBeUndefined();
  });

  it('returns the image with the largest area when dimensions are known', () => {
    const small = makeImage({ url: 'https://shop.com/small.jpg', width: 400, height: 300 });
    const large = makeImage({ url: 'https://shop.com/large.jpg', width: 1200, height: 900 });
    const medium = makeImage({ url: 'https://shop.com/medium.jpg', width: 600, height: 500 });

    expect(selectBestPhoto([small, large, medium])).toBe(large);
  });

  it('falls back to first candidate when no dimensions provided', () => {
    const a = makeImage({ url: 'https://shop.com/a.jpg', width: undefined, height: undefined });
    const b = makeImage({ url: 'https://shop.com/b.jpg', width: undefined, height: undefined });
    expect(selectBestPhoto([a, b])).toBe(a);
  });

  it('prefers image with known dimensions over one without', () => {
    const noDims = makeImage({ url: 'https://shop.com/nodims.jpg', width: undefined, height: undefined });
    const withDims = makeImage({ url: 'https://shop.com/withdims.jpg', width: 800, height: 600 });
    expect(selectBestPhoto([noDims, withDims])).toBe(withDims);
  });
});
