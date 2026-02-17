/**
 * MRD Generator State Management
 *
 * State types and reducer for the 12-section MRD generator.
 * Sections can be enabled/disabled via YAML; state holds content per section (and subsections where applicable).
 */

// ============================================================================
// Types
// ============================================================================

/** All 12 MRD section ids (template order) */
export const MRD_SECTION_IDS = [
  'purpose_vision',
  'problem_statement',
  'target_market',
  'target_users',
  'product_description',
  'key_requirements',
  'design_aesthetics',
  'target_price',
  'risks_thoughts',
  'competition',
  'additional_considerations',
  'success_criteria',
] as const;

export type MRDSection = (typeof MRD_SECTION_IDS)[number];

export interface Gap {
  id: string;
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedQuestion: string;
  exampleAnswer?: string;
}

/** State for a subsection (sections 3 and 6) */
export interface SubsectionState {
  content: string;
  gaps: Gap[];
  hiddenGaps: string[];
  isComplete: boolean;
}

/** Validation helper for deserialized state */
export function isValidMRDState(value: unknown): value is MRDState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;

  return (
    typeof state.sessionId === 'string' &&
    typeof state.initialConcept === 'string' &&
    typeof state.documentName === 'string' &&
    typeof state.sections === 'object' &&
    state.sections !== null &&
    typeof state.conversationHistory === 'object' &&
    Array.isArray(state.conversationHistory)
  );
}

/** State for a single section */
export interface SectionState {
  content: string;
  gaps: Gap[];
  hiddenGaps: string[];
  isComplete: boolean;
  isAIProcessing: boolean;
  /** Subsections (for target_market, key_requirements) */
  subsections?: Record<string, SubsectionState>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedContent?: string;
  isFinalSuggestion?: boolean;
  timestamp: number;
}

export interface MRDState {
  sessionId: string;
  initialConcept: string;
  /** Document name for export: 3-4 words + MRD + date */
  documentName: string;
  sections: Partial<Record<MRDSection, SectionState>>;
  activeSectionId: MRDSection | null;
  chatMessages: ConversationMessage[];
  processingSections: MRDSection[];
  previewMode: 'full' | 'completed';
}

// ============================================================================
// Actions
// ============================================================================

export type MRDAction =
  | { type: 'SET_INITIAL_CONCEPT'; payload: { concept: string } }
  | { type: 'SET_DOCUMENT_NAME'; payload: { documentName: string } }
  | { type: 'SET_SECTION_CONTENT'; payload: { sectionId: MRDSection; content: string } }
  | {
      type: 'SET_SUBSECTION_CONTENT';
      payload: { sectionId: MRDSection; subsectionId: string; content: string };
    }
  | { type: 'SET_SECTION_GAPS'; payload: { sectionId: MRDSection; gaps: Gap[] } }
  | { type: 'SET_ACTIVE_SECTION'; payload: { sectionId: MRDSection | null } }
  | { type: 'SET_CHAT_MESSAGES'; payload: { messages: ConversationMessage[] } }
  | { type: 'APPEND_CHAT_MESSAGE'; payload: { message: ConversationMessage } }
  | { type: 'SET_PROCESSING_SECTIONS'; payload: { sectionIds: MRDSection[] } }
  | { type: 'SET_PREVIEW_MODE'; payload: { mode: 'full' | 'completed' } }
  | { type: 'MARK_SECTION_COMPLETE'; payload: { sectionId: MRDSection; isComplete: boolean } }
  | { type: 'HIDE_GAP'; payload: { sectionId: MRDSection; gapId: string } }
  | {
      type: 'BATCH_POPULATE_SECTIONS';
      payload: {
        sections: Partial<
          Record<
            MRDSection,
            { content: string; subsections?: Record<string, { content: string }> }
          >
        >;
        gaps?: Partial<Record<MRDSection, Gap[]>>;
        documentName?: string;
      };
    };

// ============================================================================
// Initial State
// ============================================================================

function createEmptySectionState(): SectionState {
  return {
    content: '',
    gaps: [],
    hiddenGaps: [],
    isComplete: false,
    isAIProcessing: false,
  };
}

function generateSessionId(): string {
  return `mrd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createInitialMRDState(): MRDState {
  const sections: Partial<Record<MRDSection, SectionState>> = {};
  MRD_SECTION_IDS.forEach((id) => {
    sections[id] = createEmptySectionState();
  });

  return {
    sessionId: generateSessionId(),
    initialConcept: '',
    documentName: '',
    sections,
    activeSectionId: null,
    chatMessages: [],
    processingSections: [],
    previewMode: 'full',
  };
}

// ============================================================================
// Reducer
// ============================================================================

export function mrdReducer(state: MRDState, action: MRDAction): MRDState {
  const updated = { ...state };

  switch (action.type) {
    case 'SET_INITIAL_CONCEPT':
      return { ...updated, initialConcept: action.payload.concept };

    case 'SET_DOCUMENT_NAME':
      return { ...updated, documentName: action.payload.documentName };

    case 'SET_SECTION_CONTENT': {
      const { sectionId, content } = action.payload;
      const section = state.sections[sectionId] ?? createEmptySectionState();
      return {
        ...updated,
        sections: {
          ...state.sections,
          [sectionId]: { ...section, content },
        },
      };
    }

    case 'SET_SUBSECTION_CONTENT': {
      const { sectionId, subsectionId, content } = action.payload;
      const section = state.sections[sectionId] ?? createEmptySectionState();
      const subsections = { ...(section.subsections ?? {}), [subsectionId]: { ...(section.subsections?.[subsectionId] ?? { content: '', gaps: [], hiddenGaps: [], isComplete: false }), content } };
      return {
        ...updated,
        sections: {
          ...state.sections,
          [sectionId]: { ...section, subsections },
        },
      };
    }

    case 'SET_SECTION_GAPS': {
      const { sectionId, gaps } = action.payload;
      const section = state.sections[sectionId] ?? createEmptySectionState();
      return {
        ...updated,
        sections: {
          ...state.sections,
          [sectionId]: { ...section, gaps },
        },
      };
    }

    case 'SET_ACTIVE_SECTION':
      return { ...updated, activeSectionId: action.payload.sectionId };

    case 'SET_CHAT_MESSAGES':
      return { ...updated, chatMessages: action.payload.messages };

    case 'APPEND_CHAT_MESSAGE':
      return {
        ...updated,
        chatMessages: [...state.chatMessages, action.payload.message],
      };

    case 'SET_PROCESSING_SECTIONS':
      return { ...updated, processingSections: action.payload.sectionIds };

    case 'SET_PREVIEW_MODE':
      return { ...updated, previewMode: action.payload.mode };

    case 'MARK_SECTION_COMPLETE': {
      const { sectionId, isComplete } = action.payload;
      const section = state.sections[sectionId] ?? createEmptySectionState();
      return {
        ...updated,
        sections: {
          ...state.sections,
          [sectionId]: { ...section, isComplete },
        },
      };
    }

    case 'HIDE_GAP': {
      const { sectionId, gapId } = action.payload;
      const section = state.sections[sectionId] ?? createEmptySectionState();
      const hiddenGaps = section.hiddenGaps.includes(gapId)
        ? section.hiddenGaps
        : [...section.hiddenGaps, gapId];
      return {
        ...updated,
        sections: {
          ...state.sections,
          [sectionId]: { ...section, hiddenGaps },
        },
      };
    }

    case 'BATCH_POPULATE_SECTIONS': {
      const { sections: payload, gaps, documentName } = action.payload;
      const newSections = { ...state.sections };

      (
        Object.entries(payload) as [
          MRDSection,
          { content: string; subsections?: Record<string, { content: string }> },
        ][]
      ).forEach(([sectionId, data]) => {
        if (data && newSections[sectionId]) {
          const existing = newSections[sectionId]!;
          const subsectionStates: Record<string, SubsectionState> = {
            ...(existing.subsections ?? {}),
          };
          if (data.subsections) {
            Object.entries(data.subsections).forEach(([subId, sub]) => {
              subsectionStates[subId] = {
                ...(subsectionStates[subId] ?? {
                  content: '',
                  gaps: [],
                  hiddenGaps: [],
                  isComplete: false,
                }),
                content: sub.content,
              };
            });
          }
          newSections[sectionId] = {
            ...existing,
            content: data.content,
            subsections:
              Object.keys(subsectionStates).length > 0
                ? subsectionStates
                : existing.subsections,
            isAIProcessing: false,
            gaps: gaps?.[sectionId] ?? existing.gaps,
          };
        }
      });

      return {
        ...updated,
        sections: newSections,
        processingSections: [],
        ...(documentName ? { documentName } : {}),
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function getCompletionProgress(state: MRDState): number {
  return MRD_SECTION_IDS.filter((id) => state.sections[id]?.isComplete).length;
}

export function isAllSectionsComplete(state: MRDState): boolean {
  return MRD_SECTION_IDS.every((id) => state.sections[id]?.isComplete);
}
