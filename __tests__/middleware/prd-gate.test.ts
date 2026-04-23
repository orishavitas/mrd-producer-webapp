import { jest } from '@jest/globals';

jest.mock('fs');

import fs from 'fs';
import { getFeaturesForEmail, hasFeature } from '@/lib/feature-gate';

const SAMPLE_ALLOWLIST = `
# FEATURES
#   1 = mrd-generator
#   2 = one-pager
#   5 = prd-producer

ori@compulocks.com   : 1 2 5
danny@compulocks.com : 1 2 5
sales@compulocks.com : 1 2
`;

beforeEach(() => {
  (fs.readFileSync as jest.Mock).mockReturnValue(SAMPLE_ALLOWLIST);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('getFeaturesForEmail', () => {
  it('returns correct features for admin user', () => {
    const features = getFeaturesForEmail('ori@compulocks.com');
    expect(features.has('mrd-generator')).toBe(true);
    expect(features.has('one-pager')).toBe(true);
    expect(features.has('prd-producer')).toBe(true);
  });

  it('returns subset features for restricted user', () => {
    const features = getFeaturesForEmail('sales@compulocks.com');
    expect(features.has('mrd-generator')).toBe(true);
    expect(features.has('one-pager')).toBe(true);
    expect(features.has('prd-producer')).toBe(false);
  });

  it('returns empty set for unknown email', () => {
    const features = getFeaturesForEmail('unknown@example.com');
    expect(features.size).toBe(0);
  });

  it('is case-insensitive', () => {
    const features = getFeaturesForEmail('ORI@COMPULOCKS.COM');
    expect(features.has('prd-producer')).toBe(true);
  });

  it('returns empty set for null/undefined', () => {
    expect(getFeaturesForEmail(null).size).toBe(0);
    expect(getFeaturesForEmail(undefined).size).toBe(0);
  });
});

describe('hasFeature', () => {
  it('returns true when user has the feature', () => {
    expect(hasFeature('ori@compulocks.com', 'prd-producer')).toBe(true);
  });

  it('returns false when user lacks the feature', () => {
    expect(hasFeature('sales@compulocks.com', 'prd-producer')).toBe(false);
  });

  it('returns false for unknown email', () => {
    expect(hasFeature('nobody@example.com', 'mrd-generator')).toBe(false);
  });
});
