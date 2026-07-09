import { FEATURE_MAP, featureKeyToNumber } from '@/lib/feature-gate';

describe('commentor feature flag', () => {
  it('maps feature number 8 to the commentor key', () => {
    expect(FEATURE_MAP['8']).toBe('commentor');
  });

  it('converts the commentor key back to number 8', () => {
    expect(featureKeyToNumber('commentor')).toBe(8);
  });
});
