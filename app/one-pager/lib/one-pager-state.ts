export interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  photoUrls: string[];
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

  customization: {
    logoFileName: string;        // original filename, empty if none
    logoColors: { mode: 'CMYK' | 'Pantone'; value: string }[];
    logoSkipped: boolean;
    paint: {
      finish: 'gloss' | 'satin' | 'matte' | 'textured' | '';
      colors: string[];          // RAL codes (gloss/satin multi); or 'Black'/'White' for matte/textured
      description: string;       // free text
    };
    paintSkipped: boolean;
  };

  // Document metadata
  productName: string;
  preparedBy: string;
  userEmail: string;   // placeholder — will come from auth later

  // Publish flow
  documentId: string | null;
  isPublished: boolean;
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
  | { type: 'SET_FEATURES'; payload: { mustHave: string[]; niceToHave: string[] } }
  | { type: 'SET_MOQ'; payload: string }
  | { type: 'SET_TARGET_PRICE'; payload: string }
  | { type: 'SET_PRODUCT_NAME'; payload: string }
  | { type: 'SET_PREPARED_BY'; payload: string }
  | { type: 'SET_USER_EMAIL'; payload: string }
  | { type: 'ADD_COMPETITOR'; payload: { url: string } }
  | { type: 'UPDATE_COMPETITOR'; payload: { url: string; data: Partial<CompetitorEntry> } }
  | { type: 'REMOVE_COMPETITOR'; payload: string }
  | { type: 'TOGGLE_COMPETITOR_PHOTO'; payload: { url: string; photoUrl: string } }
  | { type: 'SET_COMPETITOR_CANDIDATES'; payload: { url: string; candidatePhotos: string[] } }
  | { type: 'SET_DOCUMENT_ID'; payload: string }
  | { type: 'SET_PUBLISHED'; payload: boolean }
  | { type: 'SET_LOGO_FILE'; payload: string }
  | { type: 'ADD_LOGO_COLOR'; payload: { mode: 'CMYK' | 'Pantone'; value: string } }
  | { type: 'UPDATE_LOGO_COLOR'; payload: { index: number; mode?: 'CMYK' | 'Pantone'; value?: string } }
  | { type: 'REMOVE_LOGO_COLOR'; payload: number }
  | { type: 'SET_PAINT_FINISH'; payload: 'gloss' | 'satin' | 'matte' | 'textured' | '' }
  | { type: 'ADD_PAINT_COLOR'; payload: string }
  | { type: 'REMOVE_PAINT_COLOR'; payload: number }
  | { type: 'TOGGLE_PAINT_COLOR'; payload: string }
  | { type: 'SET_PAINT_DESCRIPTION'; payload: string }
  | { type: 'SET_LOGO_SKIPPED'; payload: boolean }
  | { type: 'SET_PAINT_SKIPPED'; payload: boolean };

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
    customization: {
      logoFileName: '',
      logoColors: [],
      logoSkipped: false,
      paint: { finish: '', colors: [], description: '' },
      paintSkipped: false,
    },
    productName: '',
    preparedBy: '',
    userEmail: '',
    documentId: null,
    isPublished: false,
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

    case 'SET_FEATURES':
      return { ...base, features: action.payload };

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
      if (base.competitors.some((c) => c.url === action.payload.url)) return state;
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
            photoUrls: [],
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

    case 'TOGGLE_COMPETITOR_PHOTO': {
      const { url, photoUrl } = action.payload;
      return {
        ...base,
        competitors: base.competitors.map((c) => {
          if (c.url !== url) return c;
          const exists = c.photoUrls.includes(photoUrl);
          return {
            ...c,
            photoUrls: exists
              ? c.photoUrls.filter((p) => p !== photoUrl)
              : [...c.photoUrls, photoUrl],
          };
        }),
      };
    }

    case 'SET_COMPETITOR_CANDIDATES':
      return {
        ...base,
        competitors: base.competitors.map((c) =>
          c.url === action.payload.url
            ? { ...c, candidatePhotos: action.payload.candidatePhotos }
            : c
        ),
      };

    case 'SET_DOCUMENT_ID':
      return { ...base, documentId: action.payload };

    case 'SET_PUBLISHED':
      return { ...base, isPublished: action.payload };

    case 'SET_LOGO_FILE':
      return { ...base, customization: { ...base.customization, logoFileName: action.payload } };

    case 'ADD_LOGO_COLOR':
      return { ...base, customization: { ...base.customization, logoColors: [...base.customization.logoColors, action.payload] } };

    case 'UPDATE_LOGO_COLOR': {
      const colors = base.customization.logoColors.map((c, i) =>
        i === action.payload.index
          ? { mode: action.payload.mode ?? c.mode, value: action.payload.value ?? c.value }
          : c
      );
      return { ...base, customization: { ...base.customization, logoColors: colors } };
    }

    case 'REMOVE_LOGO_COLOR':
      return { ...base, customization: { ...base.customization, logoColors: base.customization.logoColors.filter((_, i) => i !== action.payload) } };

    case 'SET_PAINT_FINISH': {
      const finish = action.payload;
      // Reset colors when switching finish type
      return { ...base, customization: { ...base.customization, paint: { ...base.customization.paint, finish, colors: [] } } };
    }

    case 'ADD_PAINT_COLOR': {
      const existing = base.customization.paint.colors;
      if (existing.includes(action.payload)) return state;
      return { ...base, customization: { ...base.customization, paint: { ...base.customization.paint, colors: [...existing, action.payload] } } };
    }

    case 'REMOVE_PAINT_COLOR':
      return { ...base, customization: { ...base.customization, paint: { ...base.customization.paint, colors: base.customization.paint.colors.filter((_, i) => i !== action.payload) } } };

    case 'TOGGLE_PAINT_COLOR': {
      const cols = base.customization.paint.colors;
      const updated = cols.includes(action.payload) ? cols.filter((c) => c !== action.payload) : [...cols, action.payload];
      return { ...base, customization: { ...base.customization, paint: { ...base.customization.paint, colors: updated } } };
    }

    case 'SET_PAINT_DESCRIPTION':
      return { ...base, customization: { ...base.customization, paint: { ...base.customization.paint, description: action.payload } } };

    case 'SET_LOGO_SKIPPED':
      return { ...base, customization: { ...base.customization, logoSkipped: action.payload } };

    case 'SET_PAINT_SKIPPED':
      return { ...base, customization: { ...base.customization, paintSkipped: action.payload } };

    default:
      return state;
  }
}

export function getCompletionSections(state: OnePagerState): { label: string; done: boolean }[] {
  const c = state.customization;
  return [
    {
      label: 'Document Info',
      done: state.productName.trim().length > 0 && state.preparedBy.trim().length > 0 && state.userEmail.trim().length > 0,
    },
    {
      label: 'Product Description',
      done: (state.description || state.expandedDescription).trim().length > 0,
    },
    {
      label: 'Where (env + industry)',
      done: state.context.environments.length > 0 && state.context.industries.length > 0,
    },
    {
      label: 'Features (screen/orientation/placement)',
      done: [...state.features.mustHave, ...state.features.niceToHave].some(
        (f) => /screen|orientation|placement/i.test(f)
      ),
    },
    {
      label: 'Logo & Color',
      done: c.logoSkipped || (c.logoFileName.length > 0 && c.logoColors.length > 0),
    },
    {
      label: 'Paint',
      done: c.paintSkipped || c.paint.finish.length > 0,
    },
    {
      label: 'MOQ',
      done: state.commercials.moq.trim().length > 0,
    },
  ];
}
