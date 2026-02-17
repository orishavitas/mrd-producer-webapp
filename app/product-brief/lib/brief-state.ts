// app/product-brief/lib/brief-state.ts

/**
 * Product Brief State Management
 *
 * State types and reducer for 9-field product brief generator.
 */

// ============================================================================
// Types
// ============================================================================

export const FIELD_IDS = [
  'product_description',
  'target_industry',
  'where_used',
  'who_uses',
  'must_have',
  'nice_to_have',
  'moq',
  'risk_assessment',
  'competition',
] as const;

export type FieldId = (typeof FIELD_IDS)[number];

export interface Gap {
  id: string;
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface CompetitorInfo {
  id: string;
  company: string;
  product: string;
  price?: string;
  source: 'auto-research' | 'user-link';
  url?: string;
  removed: boolean;
}

export interface FieldState {
  content: string;
  isComplete: boolean;
  isCollapsed: boolean;
  gaps: Gap[];
  hiddenGaps: string[];
}

export interface CompetitionFieldState extends FieldState {
  aiCompetitors: CompetitorInfo[];
  manualText: string;
  researchStatus: 'idle' | 'researching' | 'complete' | 'error';
  linkAnalysisStatus: 'idle' | 'analyzing' | 'complete' | 'error';
}

export interface ProductBriefState {
  sessionId: string;
  createdAt: string;
  lastModified: string;

  fields: {
    product_description: FieldState;
    target_industry: FieldState;
    where_used: FieldState;
    who_uses: FieldState;
    must_have: FieldState;
    nice_to_have: FieldState;
    moq: FieldState;
    risk_assessment: FieldState;
    competition: CompetitionFieldState;
  };

  activeField: FieldId | null;
  completionStatus: {
    required: number;  // 0-6
    optional: number;  // 0-3
  };
}

// ============================================================================
// Actions
// ============================================================================

export type Action =
  | { type: 'INIT_SESSION'; payload: { sessionId: string } }
  | { type: 'BATCH_EXTRACT'; payload: { fields: Partial<Record<FieldId, string | string[]>> } }
  | { type: 'SET_FIELD_CONTENT'; payload: { fieldId: FieldId; content: string } }
  | { type: 'MARK_COMPLETE'; payload: { fieldId: FieldId; isComplete: boolean } }
  | { type: 'COLLAPSE_FIELD'; payload: { fieldId: FieldId } }
  | { type: 'EXPAND_FIELD'; payload: { fieldId: FieldId } }
  | { type: 'SET_ACTIVE_FIELD'; payload: { fieldId: FieldId | null } }
  | { type: 'ADD_GAP_TO_FIELD'; payload: { fieldId: FieldId; gapText: string } }
  | { type: 'SET_GAPS'; payload: { fieldId: FieldId; gaps: Gap[] } }
  | { type: 'HIDE_GAP'; payload: { fieldId: FieldId; gapId: string } }
  | { type: 'ADD_AI_COMPETITOR'; payload: { competitor: CompetitorInfo } }
  | { type: 'REMOVE_AI_COMPETITOR'; payload: { competitorId: string } }
  | { type: 'SET_COMPETITION_MANUAL_TEXT'; payload: { text: string } }
  | { type: 'SET_RESEARCH_STATUS'; payload: { status: CompetitionFieldState['researchStatus'] } }
  | { type: 'SET_LINK_ANALYSIS_STATUS'; payload: { status: CompetitionFieldState['linkAnalysisStatus'] } };

// ============================================================================
// Initial State
// ============================================================================

export function createInitialState(): ProductBriefState {
  const now = new Date().toISOString();

  const emptyFieldState: FieldState = {
    content: '',
    isComplete: false,
    isCollapsed: false,
    gaps: [],
    hiddenGaps: [],
  };

  const emptyCompetitionState: CompetitionFieldState = {
    ...emptyFieldState,
    aiCompetitors: [],
    manualText: '',
    researchStatus: 'idle',
    linkAnalysisStatus: 'idle',
  };

  return {
    sessionId: `brief-${Date.now()}`,
    createdAt: now,
    lastModified: now,
    fields: {
      product_description: { ...emptyFieldState },
      target_industry: { ...emptyFieldState },
      where_used: { ...emptyFieldState },
      who_uses: { ...emptyFieldState },
      must_have: { ...emptyFieldState },
      nice_to_have: { ...emptyFieldState },
      moq: { ...emptyFieldState },
      risk_assessment: { ...emptyFieldState },
      competition: { ...emptyCompetitionState },
    },
    activeField: null,
    completionStatus: {
      required: 0,
      optional: 0,
    },
  };
}

// ============================================================================
// Reducer
// ============================================================================

export function briefReducer(state: ProductBriefState, action: Action): ProductBriefState {
  const newState = { ...state, lastModified: new Date().toISOString() };

  switch (action.type) {
    case 'INIT_SESSION':
      return {
        ...newState,
        sessionId: action.payload.sessionId,
      };

    case 'BATCH_EXTRACT': {
      const updatedFields = { ...newState.fields };
      for (const [fieldId, content] of Object.entries(action.payload.fields)) {
        if (fieldId in updatedFields) {
          const field = updatedFields[fieldId as FieldId];
          if (Array.isArray(content)) {
            field.content = content.map(item => `• ${item}`).join('\n');
          } else {
            field.content = content || '';
          }
        }
      }
      return { ...newState, fields: updatedFields };
    }

    case 'SET_FIELD_CONTENT': {
      const { fieldId, content } = action.payload;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...newState.fields[fieldId],
            content,
          },
        },
      };
    }

    case 'MARK_COMPLETE': {
      const { fieldId, isComplete } = action.payload;
      const updatedFields = {
        ...newState.fields,
        [fieldId]: {
          ...newState.fields[fieldId],
          isComplete,
        },
      };

      // Recalculate completion status
      const requiredFields: FieldId[] = [
        'product_description',
        'target_industry',
        'where_used',
        'who_uses',
        'must_have',
        'nice_to_have',
      ];
      const optionalFields: FieldId[] = ['moq', 'risk_assessment', 'competition'];

      const requiredComplete = requiredFields.filter(
        (f) => updatedFields[f].isComplete
      ).length;
      const optionalComplete = optionalFields.filter(
        (f) => updatedFields[f].isComplete
      ).length;

      return {
        ...newState,
        fields: updatedFields,
        completionStatus: {
          required: requiredComplete,
          optional: optionalComplete,
        },
      };
    }

    case 'COLLAPSE_FIELD': {
      const { fieldId } = action.payload;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...newState.fields[fieldId],
            isCollapsed: true,
          },
        },
      };
    }

    case 'EXPAND_FIELD': {
      const { fieldId } = action.payload;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...newState.fields[fieldId],
            isCollapsed: false,
          },
        },
      };
    }

    case 'SET_ACTIVE_FIELD':
      return {
        ...newState,
        activeField: action.payload.fieldId,
      };

    case 'ADD_GAP_TO_FIELD': {
      const { fieldId, gapText } = action.payload;
      const field = newState.fields[fieldId];
      const newContent = field.content
        ? `${field.content}\n• ${gapText}`
        : `• ${gapText}`;

      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...field,
            content: newContent,
          },
        },
      };
    }

    case 'SET_GAPS': {
      const { fieldId, gaps } = action.payload;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...newState.fields[fieldId],
            gaps,
          },
        },
      };
    }

    case 'HIDE_GAP': {
      const { fieldId, gapId } = action.payload;
      const field = newState.fields[fieldId];
      return {
        ...newState,
        fields: {
          ...newState.fields,
          [fieldId]: {
            ...field,
            hiddenGaps: [...field.hiddenGaps, gapId],
          },
        },
      };
    }

    case 'ADD_AI_COMPETITOR': {
      const competition = newState.fields.competition as CompetitionFieldState;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          competition: {
            ...competition,
            aiCompetitors: [...competition.aiCompetitors, action.payload.competitor],
          },
        },
      };
    }

    case 'REMOVE_AI_COMPETITOR': {
      const competition = newState.fields.competition as CompetitionFieldState;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          competition: {
            ...competition,
            aiCompetitors: competition.aiCompetitors.map((c) =>
              c.id === action.payload.competitorId ? { ...c, removed: true } : c
            ),
          },
        },
      };
    }

    case 'SET_COMPETITION_MANUAL_TEXT': {
      const competition = newState.fields.competition as CompetitionFieldState;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          competition: {
            ...competition,
            manualText: action.payload.text,
          },
        },
      };
    }

    case 'SET_RESEARCH_STATUS': {
      const competition = newState.fields.competition as CompetitionFieldState;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          competition: {
            ...competition,
            researchStatus: action.payload.status,
          },
        },
      };
    }

    case 'SET_LINK_ANALYSIS_STATUS': {
      const competition = newState.fields.competition as CompetitionFieldState;
      return {
        ...newState,
        fields: {
          ...newState.fields,
          competition: {
            ...competition,
            linkAnalysisStatus: action.payload.status,
          },
        },
      };
    }

    default:
      return state;
  }
}
