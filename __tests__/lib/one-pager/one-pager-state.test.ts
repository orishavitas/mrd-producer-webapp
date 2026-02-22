/**
 * Tests for new fields and actions added in Phase C1:
 * - OnePagerState: useCases, expandedUseCases
 * - CompetitorEntry: photoUrl?, candidatePhotos?, scrapeTier?
 * - Actions: SET_USE_CASES, SET_EXPANDED_USE_CASES, SET_COMPETITOR_PHOTO, SET_COMPETITOR_CANDIDATES
 */

import {
  onePagerReducer,
  createInitialState,
  OnePagerState,
  CompetitorEntry,
} from '@/app/one-pager/lib/one-pager-state';

describe('onePagerReducer - new fields (Phase C1)', () => {
  let state: OnePagerState;

  beforeEach(() => {
    state = createInitialState();
  });

  // ── useCases & expandedUseCases ──────────────────────────────────────────

  it('initial state has empty useCases and expandedUseCases', () => {
    expect(state.useCases).toBe('');
    expect(state.expandedUseCases).toBe('');
  });

  it('SET_USE_CASES updates useCases', () => {
    const next = onePagerReducer(state, {
      type: 'SET_USE_CASES',
      payload: 'Retail and warehousing',
    });
    expect(next.useCases).toBe('Retail and warehousing');
  });

  it('SET_EXPANDED_USE_CASES updates expandedUseCases', () => {
    const next = onePagerReducer(state, {
      type: 'SET_EXPANDED_USE_CASES',
      payload: 'Expanded retail and warehousing use cases',
    });
    expect(next.expandedUseCases).toBe('Expanded retail and warehousing use cases');
  });

  it('SET_USE_CASES does not affect other fields', () => {
    const withDesc = onePagerReducer(state, {
      type: 'SET_DESCRIPTION',
      payload: 'My product',
    });
    const next = onePagerReducer(withDesc, {
      type: 'SET_USE_CASES',
      payload: 'Use case text',
    });
    expect(next.description).toBe('My product');
    expect(next.useCases).toBe('Use case text');
  });

  it('SET_EXPANDED_USE_CASES does not affect useCases', () => {
    const withUseCases = onePagerReducer(state, {
      type: 'SET_USE_CASES',
      payload: 'Original use cases',
    });
    const next = onePagerReducer(withUseCases, {
      type: 'SET_EXPANDED_USE_CASES',
      payload: 'Expanded version',
    });
    expect(next.useCases).toBe('Original use cases');
    expect(next.expandedUseCases).toBe('Expanded version');
  });

  // ── CompetitorEntry: photoUrl, candidatePhotos, scrapeTier ───────────────

  it('ADD_COMPETITOR entry has undefined photoUrl, candidatePhotos, scrapeTier by default', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    const entry = next.competitors[0];
    expect(entry.photoUrl).toBeUndefined();
    expect(entry.candidatePhotos).toBeUndefined();
    expect(entry.scrapeTier).toBeUndefined();
  });

  it('SET_COMPETITOR_PHOTO sets photoUrl on matching competitor', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    next = onePagerReducer(next, {
      type: 'SET_COMPETITOR_PHOTO',
      payload: { url: 'https://acme.com', photoUrl: 'https://acme.com/img/product.jpg' },
    });
    expect(next.competitors[0].photoUrl).toBe('https://acme.com/img/product.jpg');
  });

  it('SET_COMPETITOR_PHOTO does not affect other competitors', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    next = onePagerReducer(next, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://other.com' },
    });
    next = onePagerReducer(next, {
      type: 'SET_COMPETITOR_PHOTO',
      payload: { url: 'https://acme.com', photoUrl: 'https://acme.com/img/product.jpg' },
    });
    expect(next.competitors[0].photoUrl).toBe('https://acme.com/img/product.jpg');
    expect(next.competitors[1].photoUrl).toBeUndefined();
  });

  it('SET_COMPETITOR_CANDIDATES sets candidatePhotos on matching competitor', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    next = onePagerReducer(next, {
      type: 'SET_COMPETITOR_CANDIDATES',
      payload: {
        url: 'https://acme.com',
        candidatePhotos: ['https://acme.com/img/a.jpg', 'https://acme.com/img/b.jpg'],
      },
    });
    expect(next.competitors[0].candidatePhotos).toEqual([
      'https://acme.com/img/a.jpg',
      'https://acme.com/img/b.jpg',
    ]);
  });

  it('SET_COMPETITOR_CANDIDATES does not affect other competitors', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    next = onePagerReducer(next, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://other.com' },
    });
    next = onePagerReducer(next, {
      type: 'SET_COMPETITOR_CANDIDATES',
      payload: {
        url: 'https://acme.com',
        candidatePhotos: ['https://acme.com/img/a.jpg'],
      },
    });
    expect(next.competitors[0].candidatePhotos).toEqual(['https://acme.com/img/a.jpg']);
    expect(next.competitors[1].candidatePhotos).toBeUndefined();
  });

  it('UPDATE_COMPETITOR can set scrapeTier', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://acme.com' },
    });
    next = onePagerReducer(next, {
      type: 'UPDATE_COMPETITOR',
      payload: {
        url: 'https://acme.com',
        data: { scrapeTier: 'deep' },
      },
    });
    expect(next.competitors[0].scrapeTier).toBe('deep');
  });

  it('CompetitorEntry accepts scrapeTier values: basic, standard, deep', () => {
    const entry: CompetitorEntry = {
      url: 'https://acme.com',
      brand: 'Acme',
      productName: 'Widget',
      description: 'Test',
      cost: '$99',
      status: 'done',
      scrapeTier: 'standard',
    };
    expect(entry.scrapeTier).toBe('standard');
  });

  // ── lastUpdated is bumped ────────────────────────────────────────────────

  it('SET_USE_CASES bumps lastUpdated', () => {
    const before = state.lastUpdated;
    // Ensure time advances
    const next = onePagerReducer(state, {
      type: 'SET_USE_CASES',
      payload: 'test',
    });
    expect(next.lastUpdated).toBeGreaterThanOrEqual(before);
  });
});
