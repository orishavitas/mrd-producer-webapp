import { jest } from '@jest/globals';

jest.mock('@/lib/db-client');

import { query } from '@/lib/db-client';
import { getFeaturesForEmail, hasFeature, invalidateAllowlistCache } from '@/lib/feature-gate';

const SAMPLE_ROWS = [
  { email: 'ori@compulocks.com', features: [1, 2, 5] },
  { email: 'danny@compulocks.com', features: [1, 2, 5] },
  { email: 'sales@compulocks.com', features: [1, 2] },
];

beforeEach(() => {
  invalidateAllowlistCache();
  (query as jest.MockedFunction<typeof query>).mockResolvedValue({ rows: SAMPLE_ROWS });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('getFeaturesForEmail', () => {
  it('returns correct features for admin user', async () => {
    const features = await getFeaturesForEmail('ori@compulocks.com');
    expect(features.has('mrd-generator')).toBe(true);
    expect(features.has('one-pager')).toBe(true);
    expect(features.has('prd-producer')).toBe(true);
  });

  it('returns subset features for restricted user', async () => {
    const features = await getFeaturesForEmail('sales@compulocks.com');
    expect(features.has('mrd-generator')).toBe(true);
    expect(features.has('one-pager')).toBe(true);
    expect(features.has('prd-producer')).toBe(false);
  });

  it('returns empty set for unknown email', async () => {
    const features = await getFeaturesForEmail('unknown@example.com');
    expect(features.size).toBe(0);
  });

  it('is case-insensitive', async () => {
    const features = await getFeaturesForEmail('ORI@COMPULOCKS.COM');
    expect(features.has('prd-producer')).toBe(true);
  });

  it('returns empty set for null/undefined', async () => {
    expect((await getFeaturesForEmail(null)).size).toBe(0);
    expect((await getFeaturesForEmail(undefined)).size).toBe(0);
  });
});

describe('hasFeature', () => {
  it('returns true when user has the feature', async () => {
    expect(await hasFeature('ori@compulocks.com', 'prd-producer')).toBe(true);
  });

  it('returns false when user lacks the feature', async () => {
    expect(await hasFeature('sales@compulocks.com', 'prd-producer')).toBe(false);
  });

  it('returns false for unknown email', async () => {
    expect(await hasFeature('nobody@example.com', 'mrd-generator')).toBe(false);
  });
});
