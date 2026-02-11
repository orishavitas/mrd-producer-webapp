/**
 * Brief Helper State Management
 *
 * State types and reducer for managing the 6-field brief helper form.
 * Each field tracks raw text, AI-extracted bullet points, detected gaps,
 * processing state, and completion status.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * The 6 field types in the brief helper form
 */
export type BriefField =
  | 'what'
  | 'who'
  | 'where'
  | 'moq'
  | 'must-have'
  | 'nice-to-have';

/**
 * Detected information gap with suggested questions
 */
export interface Gap {
  id: string;
  type: string;
  description: string;
  suggestedQuestions: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * State for a single field
 */
export interface FieldState {
  /** Raw user input text */
  rawText: string;
  /** AI-extracted structured bullet points */
  bulletPoints: string[];
  /** Detected information gaps */
  gaps: Gap[];
  /** Whether AI is currently processing this field */
  isAIProcessing: boolean;
  /** Whether the field is considered complete */
  isComplete: boolean;
}

/**
 * Complete brief helper state
 */
export interface BriefState {
  /** Session identifier */
  sessionId: string;
  /** Session start timestamp */
  startTime: number;
  /** Last update timestamp */
  lastUpdated: number;
  /** State for each of the 6 fields */
  fields: {
    [K in BriefField]: FieldState;
  };
}

// ============================================================================
// Actions
// ============================================================================

export type BriefAction =
  | {
      type: 'SET_RAW_TEXT';
      payload: {
        fieldType: BriefField;
        rawText: string;
      };
    }
  | {
      type: 'SET_BULLET_POINTS';
      payload: {
        fieldType: BriefField;
        bulletPoints: string[];
      };
    }
  | {
      type: 'SET_GAPS';
      payload: {
        fieldType: BriefField;
        gaps: Gap[];
      };
    }
  | {
      type: 'SET_AI_PROCESSING';
      payload: {
        fieldType: BriefField;
        isProcessing: boolean;
      };
    }
  | {
      type: 'MARK_COMPLETE';
      payload: {
        fieldType: BriefField;
        isComplete: boolean;
      };
    }
  | {
      type: 'RESET_FIELD';
      payload: {
        fieldType: BriefField;
      };
    };

// ============================================================================
// Initial State
// ============================================================================

const createEmptyFieldState = (): FieldState => ({
  rawText: '',
  bulletPoints: [],
  gaps: [],
  isAIProcessing: false,
  isComplete: false,
});

export const createInitialState = (): BriefState => ({
  sessionId: generateSessionId(),
  startTime: Date.now(),
  lastUpdated: Date.now(),
  fields: {
    what: createEmptyFieldState(),
    who: createEmptyFieldState(),
    where: createEmptyFieldState(),
    moq: createEmptyFieldState(),
    'must-have': createEmptyFieldState(),
    'nice-to-have': createEmptyFieldState(),
  },
});

// ============================================================================
// Reducer
// ============================================================================

export function briefReducer(state: BriefState, action: BriefAction): BriefState {
  const updatedState = { ...state, lastUpdated: Date.now() };

  switch (action.type) {
    case 'SET_RAW_TEXT': {
      const { fieldType, rawText } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: {
            ...updatedState.fields[fieldType],
            rawText,
          },
        },
      };
    }

    case 'SET_BULLET_POINTS': {
      const { fieldType, bulletPoints } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: {
            ...updatedState.fields[fieldType],
            bulletPoints,
          },
        },
      };
    }

    case 'SET_GAPS': {
      const { fieldType, gaps } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: {
            ...updatedState.fields[fieldType],
            gaps,
          },
        },
      };
    }

    case 'SET_AI_PROCESSING': {
      const { fieldType, isProcessing } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: {
            ...updatedState.fields[fieldType],
            isAIProcessing: isProcessing,
          },
        },
      };
    }

    case 'MARK_COMPLETE': {
      const { fieldType, isComplete } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: {
            ...updatedState.fields[fieldType],
            isComplete,
          },
        },
      };
    }

    case 'RESET_FIELD': {
      const { fieldType } = action.payload;
      return {
        ...updatedState,
        fields: {
          ...updatedState.fields,
          [fieldType]: createEmptyFieldState(),
        },
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `brief-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate completion progress (0-6)
 */
export function getCompletionProgress(state: BriefState): number {
  const fields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];
  return fields.filter((field) => state.fields[field].isComplete).length;
}

/**
 * Check if all fields are complete
 */
export function isAllFieldsComplete(state: BriefState): boolean {
  return getCompletionProgress(state) === 6;
}
