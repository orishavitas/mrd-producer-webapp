/**
 * Photo Filter
 *
 * Pure-function utilities for filtering scraped images to retain only
 * candidates that look like product/hero photos rather than icons,
 * tracking pixels, banners, or decorative SVGs.
 *
 * All functions are deterministic and have zero external dependencies,
 * making them straightforward to unit-test.
 */

import { ScrapedImage, PhotoFilterCriteria, DEFAULT_PHOTO_FILTER } from './types';

// ---------------------------------------------------------------------------
// URL-based exclusions
// ---------------------------------------------------------------------------

/**
 * Path segment or filename patterns that indicate a non-product image.
 */
const EXCLUDED_PATH_PATTERNS: RegExp[] = [
  /\/icon[s]?\//i,
  /\/logo[s]?\//i,
  /\/sprite[s]?\//i,
  /\/avatar[s]?\//i,
  /\/badge[s]?\//i,
  /\/banner[s]?\//i,
  /\/pixel[s]?\//i,
  /\/tracking\//i,
  /\/ads?\//i,
  /\.(svg)(\?|$)/i,  // SVG files (usually vector UI assets)
  /1x1/i,            // Tracking pixels by dimension in URL
  /placeholder/i,
];

/**
 * Returns true if the image URL looks like a UI/tracking asset.
 */
export function isExcludedByUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathAndQuery = parsed.pathname + parsed.search;
    return EXCLUDED_PATH_PATTERNS.some((re) => re.test(pathAndQuery));
  } catch {
    // Malformed URL — exclude it
    return true;
  }
}

// ---------------------------------------------------------------------------
// Alt-text heuristics
// ---------------------------------------------------------------------------

/**
 * Alt text values that indicate a non-product image.
 */
const EXCLUDED_ALT_PATTERNS: RegExp[] = [
  /^logo$/i,
  /^icon$/i,
  /^avatar$/i,
  /^tracking/i,
  /^advertisement/i,
  /^spacer$/i,
  /^pixel$/i,
];

/**
 * Returns true if the alt text strongly suggests this is not a product photo.
 */
export function isExcludedByAlt(alt: string): boolean {
  const trimmed = alt.trim();
  return EXCLUDED_ALT_PATTERNS.some((re) => re.test(trimmed));
}

// ---------------------------------------------------------------------------
// Dimension heuristics
// ---------------------------------------------------------------------------

/**
 * Returns true if the image meets the minimum size criteria.
 * When width/height are not provided the image is assumed to pass (we can't
 * reject what we can't measure).
 */
export function meetsMinimumSize(
  image: ScrapedImage,
  criteria: PhotoFilterCriteria = DEFAULT_PHOTO_FILTER
): boolean {
  const { width, height } = image;

  // No dimensions available — let it through so AI can decide later
  if (width === undefined || height === undefined) {
    return true;
  }

  if (width < criteria.minWidth) return false;
  if (height < criteria.minHeight) return false;

  const area = width * height;
  if (area < criteria.minArea) return false;

  const ratio = width / height;
  if (ratio < criteria.minRatio || ratio > criteria.maxRatio) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Combined filter
// ---------------------------------------------------------------------------

/**
 * Returns true if the image is a candidate product photo.
 */
export function isProductPhoto(
  image: ScrapedImage,
  criteria: PhotoFilterCriteria = DEFAULT_PHOTO_FILTER
): boolean {
  if (isExcludedByUrl(image.url)) return false;
  if (isExcludedByAlt(image.alt)) return false;
  if (!meetsMinimumSize(image, criteria)) return false;
  return true;
}

/**
 * Filters an array of scraped images to only product-photo candidates.
 *
 * @param images   - Images extracted from a page.
 * @param criteria - Override filter criteria (optional).
 * @param maxResults - Maximum number of results to return (default: 5).
 * @returns Filtered and capped image list.
 */
export function filterProductPhotos(
  images: ScrapedImage[],
  criteria: PhotoFilterCriteria = DEFAULT_PHOTO_FILTER,
  maxResults = 5
): ScrapedImage[] {
  return images
    .filter((img) => isProductPhoto(img, criteria))
    .slice(0, maxResults);
}

/**
 * Selects the single best product-photo candidate from an array.
 * Strategy: prefer images with explicit dimensions (larger area wins),
 * then fall back to first passing URL/alt filter.
 *
 * Returns undefined if no candidate passes the filter.
 */
export function selectBestPhoto(
  images: ScrapedImage[],
  criteria: PhotoFilterCriteria = DEFAULT_PHOTO_FILTER
): ScrapedImage | undefined {
  const candidates = images.filter((img) => isProductPhoto(img, criteria));
  if (candidates.length === 0) return undefined;

  // Prefer images with known dimensions
  const withDimensions = candidates.filter(
    (img) => img.width !== undefined && img.height !== undefined
  );

  if (withDimensions.length > 0) {
    // Largest area wins
    return withDimensions.reduce((best, img) =>
      (img.width! * img.height!) > (best.width! * best.height!) ? img : best
    );
  }

  // No dimensions available — return first candidate
  return candidates[0];
}
