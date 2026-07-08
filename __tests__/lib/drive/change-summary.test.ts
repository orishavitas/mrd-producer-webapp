import { summarizeChanges } from '@/lib/drive/change-summary';

describe('summarizeChanges', () => {
  it('returns "Initial save" when there is no previous version', () => {
    expect(summarizeChanges(null, { a: 1 })).toBe('Initial save');
  });

  it('lists top-level keys whose values changed', () => {
    const previous = { features: ['a'], competitors: [], description: 'x' };
    const current = { features: ['a', 'b'], competitors: [], description: 'x' };
    expect(summarizeChanges(previous, current)).toBe('features updated');
  });

  it('lists multiple changed keys sorted alphabetically, comma separated', () => {
    const previous = { zeta: 1, alpha: 1 };
    const current = { zeta: 2, alpha: 2 };
    expect(summarizeChanges(previous, current)).toBe('alpha, zeta updated');
  });

  it('returns "No content changes" when nothing differs', () => {
    const same = { a: 1, b: 2 };
    expect(summarizeChanges(same, same)).toBe('No content changes');
  });
});
