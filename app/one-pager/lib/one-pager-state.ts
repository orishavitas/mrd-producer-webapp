export interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  photoUrl?: string;
  candidatePhotos?: string[];
  scrapeTier?: 'basic' | 'standard' | 'deep';
}

export interface OnePagerState {
  sessionId: string;
  lastUpdated: number;
  description: string;
  expandedDescription: string;
  goal: string;
  expandedGoal: string;
  useCases: string;
  expandedUseCases: string;
  context: {
    environments: string[];
    industries: string[];
  };
  audience: {
    predefined: string[];
    custom: string[];
  };
  features: {
    mustHave: string[];
    niceToHave: string[];
  };
  commercials: {
    moq: string;
    targetPrice: string;
  };
  competitors: CompetitorEntry[];

  // Document metadata
  productName: string;
  preparedBy: string;
  userEmail: string;   // placeholder — will come from auth later
}

export type OnePagerAction =
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_EXPANDED_DESCRIPTION'; payload: string }
  | { type: 'SET_GOAL'; payload: string }
  | { type: 'SET_EXPANDED_GOAL'; payload: string }
  | { type: 'SET_USE_CASES'; payload: string }
  | { type: 'SET_EXPANDED_USE_CASES'; payload: string }
  | { type: 'TOGGLE_ENVIRONMENT'; payload: string }
  | { type: 'TOGGLE_INDUSTRY'; payload: string }
  | { type: 'TOGGLE_ROLE'; payload: string }
  | { type: 'ADD_CUSTOM_ROLE'; payload: string }
  | { type: 'REMOVE_CUSTOM_ROLE'; payload: string }
  | { type: 'ADD_FEATURE'; payload: { category: 'mustHave' | 'niceToHave'; feature: string } }
  | { type: 'REMOVE_FEATURE'; payload: { category: 'mustHave' | 'niceToHave'; feature: string } }
  | { type: 'SET_MOQ'; payload: string }
  | { type: 'SET_TARGET_PRICE'; payload: string }
  | { type: 'SET_PRODUCT_NAME'; payload: string }
  | { type: 'SET_PREPARED_BY'; payload: string }
  | { type: 'SET_USER_EMAIL'; payload: string }
  | { type: 'ADD_COMPETITOR'; payload: { url: string } }
  | { type: 'UPDATE_COMPETITOR'; payload: { url: string; data: Partial<CompetitorEntry> } }
  | { type: 'REMOVE_COMPETITOR'; payload: string }
  | { type: 'SET_COMPETITOR_PHOTO'; payload: { url: string; photoUrl: string } }
  | { type: 'SET_COMPETITOR_CANDIDATES'; payload: { url: string; candidatePhotos: string[] } };

function generateSessionId(): string {
  return `onepager-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createInitialState(): OnePagerState {
  return {
    sessionId: generateSessionId(),
    lastUpdated: Date.now(),
    description: '',
    expandedDescription: '',
    goal: '',
    expandedGoal: '',
    useCases: '',
    expandedUseCases: '',
    context: { environments: [], industries: [] },
    audience: { predefined: [], custom: [] },
    features: { mustHave: [], niceToHave: [] },
    commercials: { moq: '', targetPrice: '' },
    competitors: [],
    productName: '',
    preparedBy: '',
    userEmail: '',
  };
}

function toggleInArray(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

export function onePagerReducer(state: OnePagerState, action: OnePagerAction): OnePagerState {
  const base = { ...state, lastUpdated: Date.now() };

  switch (action.type) {
    case 'SET_DESCRIPTION':
      return { ...base, description: action.payload };

    case 'SET_EXPANDED_DESCRIPTION':
      return { ...base, expandedDescription: action.payload };

    case 'SET_GOAL':
      return { ...base, goal: action.payload };

    case 'SET_EXPANDED_GOAL':
      return { ...base, expandedGoal: action.payload };

    case 'SET_USE_CASES':
      return { ...base, useCases: action.payload };

    case 'SET_EXPANDED_USE_CASES':
      return { ...base, expandedUseCases: action.payload };

    case 'TOGGLE_ENVIRONMENT':
      return {
        ...base,
        context: {
          ...base.context,
          environments: toggleInArray(base.context.environments, action.payload),
        },
      };

    case 'TOGGLE_INDUSTRY':
      return {
        ...base,
        context: {
          ...base.context,
          industries: toggleInArray(base.context.industries, action.payload),
        },
      };

    case 'TOGGLE_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          predefined: toggleInArray(base.audience.predefined, action.payload),
        },
      };

    case 'ADD_CUSTOM_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          custom: [...base.audience.custom, action.payload],
        },
      };

    case 'REMOVE_CUSTOM_ROLE':
      return {
        ...base,
        audience: {
          ...base.audience,
          custom: base.audience.custom.filter((r) => r !== action.payload),
        },
      };

    case 'ADD_FEATURE':
      return {
        ...base,
        features: {
          ...base.features,
          [action.payload.category]: [
            ...base.features[action.payload.category],
            action.payload.feature,
          ],
        },
      };

    case 'REMOVE_FEATURE':
      return {
        ...base,
        features: {
          ...base.features,
          [action.payload.category]: base.features[action.payload.category].filter(
            (f) => f !== action.payload.feature
          ),
        },
      };

    case 'SET_MOQ':
      return { ...base, commercials: { ...base.commercials, moq: action.payload } };

    case 'SET_TARGET_PRICE':
      return { ...base, commercials: { ...base.commercials, targetPrice: action.payload } };

    case 'SET_PRODUCT_NAME':
      return { ...base, productName: action.payload };

    case 'SET_PREPARED_BY':
      return { ...base, preparedBy: action.payload };

    case 'SET_USER_EMAIL':
      return { ...base, userEmail: action.payload };

    case 'ADD_COMPETITOR':
      return {
        ...base,
        competitors: [
          ...base.competitors,
          {
            url: action.payload.url,
            brand: '',
            productName: '',
            description: '',
            cost: '',
            status: 'pending',
          },
        ],
      };

    case 'UPDATE_COMPETITOR':
      return {
        ...base,
        competitors: base.competitors.map((c) =>
          c.url === action.payload.url ? { ...c, ...action.payload.data } : c
        ),
      };

    case 'REMOVE_COMPETITOR':
      return {
        ...base,
        competitors: base.competitors.filter((c) => c.url !== action.payload),
      };

    case 'SET_COMPETITOR_PHOTO':
      return {
        ...base,
        competitors: base.competitors.map((c) =>
          c.url === action.payload.url ? { ...c, photoUrl: action.payload.photoUrl } : c
        ),
      };

    case 'SET_COMPETITOR_CANDIDATES':
      return {
        ...base,
        competitors: base.competitors.map((c) =>
          c.url === action.payload.url
            ? { ...c, candidatePhotos: action.payload.candidatePhotos }
            : c
        ),
      };

    default:
      return state;
  }
}
