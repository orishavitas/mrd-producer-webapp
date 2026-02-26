import {
  onePagerReducer,
  createInitialState,
  OnePagerState,
} from '@/app/one-pager/lib/one-pager-state';

describe('onePagerReducer', () => {
  let state: OnePagerState;

  beforeEach(() => {
    state = createInitialState();
  });

  it('creates initial state with empty fields', () => {
    expect(state.description).toBe('');
    expect(state.goal).toBe('');
    expect(state.context.environments).toEqual([]);
    expect(state.context.industries).toEqual([]);
    expect(state.audience.predefined).toEqual([]);
    expect(state.audience.custom).toEqual([]);
    expect(state.features.mustHave).toEqual([]);
    expect(state.features.niceToHave).toEqual([]);
    expect(state.commercials.moq).toBe('');
    expect(state.commercials.targetPrice).toBe('');
    expect(state.competitors).toEqual([]);
  });

  it('SET_DESCRIPTION updates description', () => {
    const next = onePagerReducer(state, {
      type: 'SET_DESCRIPTION',
      payload: 'A smart thermostat',
    });
    expect(next.description).toBe('A smart thermostat');
  });

  it('SET_GOAL updates goal', () => {
    const next = onePagerReducer(state, {
      type: 'SET_GOAL',
      payload: 'Reduce energy usage',
    });
    expect(next.goal).toBe('Reduce energy usage');
  });

  it('TOGGLE_ENVIRONMENT adds/removes environment', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_ENVIRONMENT',
      payload: 'indoor',
    });
    expect(next.context.environments).toEqual(['indoor']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_ENVIRONMENT',
      payload: 'indoor',
    });
    expect(next.context.environments).toEqual([]);
  });

  it('TOGGLE_INDUSTRY adds/removes industry', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_INDUSTRY',
      payload: 'healthcare',
    });
    expect(next.context.industries).toEqual(['healthcare']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_INDUSTRY',
      payload: 'healthcare',
    });
    expect(next.context.industries).toEqual([]);
  });

  it('TOGGLE_ROLE adds/removes predefined role', () => {
    let next = onePagerReducer(state, {
      type: 'TOGGLE_ROLE',
      payload: 'Nurses',
    });
    expect(next.audience.predefined).toEqual(['Nurses']);

    next = onePagerReducer(next, {
      type: 'TOGGLE_ROLE',
      payload: 'Nurses',
    });
    expect(next.audience.predefined).toEqual([]);
  });

  it('ADD_CUSTOM_ROLE adds custom role', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    expect(next.audience.custom).toEqual(['Specialist']);
  });

  it('REMOVE_CUSTOM_ROLE removes custom role', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_CUSTOM_ROLE',
      payload: 'Specialist',
    });
    expect(next.audience.custom).toEqual([]);
  });

  it('ADD_FEATURE adds must-have chip', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    expect(next.features.mustHave).toEqual(['Waterproof']);
  });

  it('REMOVE_FEATURE removes chip', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_FEATURE',
      payload: { category: 'mustHave', feature: 'Waterproof' },
    });
    expect(next.features.mustHave).toEqual([]);
  });

  it('SET_MOQ updates moq', () => {
    const next = onePagerReducer(state, {
      type: 'SET_MOQ',
      payload: '1000',
    });
    expect(next.commercials.moq).toBe('1000');
  });

  it('SET_TARGET_PRICE updates target price', () => {
    const next = onePagerReducer(state, {
      type: 'SET_TARGET_PRICE',
      payload: '$50-100',
    });
    expect(next.commercials.targetPrice).toBe('$50-100');
  });

  it('ADD_COMPETITOR adds entry with pending status', () => {
    const next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    expect(next.competitors.length).toBe(1);
    expect(next.competitors[0].url).toBe('https://example.com');
    expect(next.competitors[0].status).toBe('pending');
  });

  it('UPDATE_COMPETITOR updates extraction data', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    next = onePagerReducer(next, {
      type: 'UPDATE_COMPETITOR',
      payload: {
        url: 'https://example.com',
        data: {
          brand: 'Acme',
          productName: 'Widget',
          description: 'A widget',
          cost: '$99',
          status: 'done',
        },
      },
    });
    expect(next.competitors[0].brand).toBe('Acme');
    expect(next.competitors[0].status).toBe('done');
  });

  it('REMOVE_COMPETITOR removes entry', () => {
    let next = onePagerReducer(state, {
      type: 'ADD_COMPETITOR',
      payload: { url: 'https://example.com' },
    });
    next = onePagerReducer(next, {
      type: 'REMOVE_COMPETITOR',
      payload: 'https://example.com',
    });
    expect(next.competitors).toEqual([]);
  });
});
