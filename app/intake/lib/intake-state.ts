import { TOPICS } from './topics';

// --- Phase & Status Types ---

export type IntakePhase = 'kickstart' | 'topics' | 'review' | 'gaps' | 'generating' | 'results';
export type TopicStatus = 'upcoming' | 'active' | 'completed';
export type GapSeverity = 'red' | 'yellow' | 'green';

// --- Data Interfaces ---

export interface TopicData {
  id: string;
  name: string;
  status: TopicStatus;
  completeness: number; // 0-100
  weight: number; // contribution to overall readiness
  structuredData: Record<string, string | string[]>;
  freetext: Record<string, string>;
}

export interface Gap {
  severity: GapSeverity;
  topicId: string;
  title: string;
  explanation: string;
  canAIFill: boolean;
}

export interface Source {
  title: string;
  url: string;
}

export interface IntakeState {
  phase: IntakePhase;
  topics: TopicData[];
  activeTopicIndex: number;
  overallReadiness: number;
  researchBrief: string | null;
  gaps: Gap[];
  mrdResult: string | null;
  sources: Source[];
}

// --- Actions ---

export type IntakeAction =
  | { type: 'SET_PHASE'; phase: IntakePhase }
  | { type: 'UPDATE_TOPIC'; topicId: string; data: Partial<TopicData> }
  | { type: 'SET_ACTIVE_TOPIC'; topicIndex: number }
  | { type: 'SET_ALL_TOPICS'; topics: TopicData[] }
  | { type: 'UPDATE_READINESS' }
  | { type: 'SET_BRIEF'; brief: string }
  | { type: 'SET_GAPS'; gaps: Gap[] }
  | { type: 'SET_RESULT'; mrd: string; sources: Source[] }
  | { type: 'DISMISS_GAP'; topicId: string };

// --- Helpers ---

function calculateOverallReadiness(topics: TopicData[]): number {
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = topics.reduce(
    (sum, t) => sum + t.completeness * t.weight,
    0
  );
  return Math.round(weightedSum / totalWeight);
}

// --- Reducer ---

export function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'UPDATE_TOPIC': {
      const topics = state.topics.map((topic) =>
        topic.id === action.topicId
          ? { ...topic, ...action.data }
          : topic
      );
      return {
        ...state,
        topics,
        overallReadiness: calculateOverallReadiness(topics),
      };
    }

    case 'SET_ACTIVE_TOPIC':
      return { ...state, activeTopicIndex: action.topicIndex };

    case 'SET_ALL_TOPICS': {
      const topics = action.topics;
      return {
        ...state,
        topics,
        overallReadiness: calculateOverallReadiness(topics),
      };
    }

    case 'UPDATE_READINESS':
      return {
        ...state,
        overallReadiness: calculateOverallReadiness(state.topics),
      };

    case 'SET_BRIEF':
      return { ...state, researchBrief: action.brief };

    case 'SET_GAPS':
      return { ...state, gaps: action.gaps };

    case 'SET_RESULT':
      return {
        ...state,
        mrdResult: action.mrd,
        sources: action.sources,
        phase: 'results',
      };

    case 'DISMISS_GAP':
      return {
        ...state,
        gaps: state.gaps.filter((g) => g.topicId !== action.topicId),
      };

    default:
      return state;
  }
}

// --- Initial State Factory ---

export function createInitialState(): IntakeState {
  const topics: TopicData[] = TOPICS.map((t, index) => ({
    id: t.id,
    name: t.name,
    status: (index === 0 ? 'active' : 'upcoming') as TopicStatus,
    completeness: 0,
    weight: t.weight,
    structuredData: {},
    freetext: {},
  }));

  return {
    phase: 'kickstart',
    topics,
    activeTopicIndex: 0,
    overallReadiness: 0,
    researchBrief: null,
    gaps: [],
    mrdResult: null,
    sources: [],
  };
}
