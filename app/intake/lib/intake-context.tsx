'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import {
  intakeReducer,
  createInitialState,
} from './intake-state';
import type {
  IntakeState,
  IntakeAction,
  TopicData,
} from './intake-state';
import {
  getTopicDefinition,
  isFreetextField,
} from './topic-definitions';
import type { TopicDefinition } from './topic-definitions';

// --- Context Value ---

interface IntakeContextValue {
  state: IntakeState;
  dispatch: React.Dispatch<IntakeAction>;
  // Helper functions
  getOverallReadiness: () => number;
  getActiveTopic: () => TopicData | null;
  getTopicById: (id: string) => TopicData | undefined;
  getTopicDefinition: (id: string) => TopicDefinition | undefined;
  updateTopicField: (topicId: string, fieldId: string, value: string | string[]) => void;
  rollbackToTopic: (topicId: string) => void;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

// --- Provider ---

interface IntakeProviderProps {
  children: ReactNode;
}

export function IntakeProvider({ children }: IntakeProviderProps) {
  const [state, dispatch] = useReducer(intakeReducer, undefined, createInitialState);

  const getOverallReadiness = useCallback(() => {
    return state.overallReadiness;
  }, [state.overallReadiness]);

  const getActiveTopic = useCallback((): TopicData | null => {
    return state.topics[state.activeTopicIndex] ?? null;
  }, [state.topics, state.activeTopicIndex]);

  const getTopicByIdFn = useCallback(
    (id: string): TopicData | undefined => {
      return state.topics.find((t) => t.id === id);
    },
    [state.topics]
  );

  const getTopicDefinitionFn = useCallback(
    (id: string): TopicDefinition | undefined => {
      return getTopicDefinition(id);
    },
    []
  );

  const updateTopicField = useCallback(
    (topicId: string, fieldId: string, value: string | string[]) => {
      const definition = getTopicDefinition(topicId);
      if (!definition) return;

      const field = definition.fields.find((f) => f.id === fieldId);
      if (!field) return;

      const topic = state.topics.find((t) => t.id === topicId);
      if (!topic) return;

      if (isFreetextField(field)) {
        // Store in freetext map
        dispatch({
          type: 'UPDATE_TOPIC',
          topicId,
          data: {
            freetext: {
              ...topic.freetext,
              [fieldId]: typeof value === 'string' ? value : value.join('\n'),
            },
          },
        });
      } else {
        // Store in structuredData map
        dispatch({
          type: 'UPDATE_TOPIC',
          topicId,
          data: {
            structuredData: {
              ...topic.structuredData,
              [fieldId]: value,
            },
          },
        });
      }
    },
    [state.topics]
  );

  const rollbackToTopic = useCallback(
    (topicId: string) => {
      const topicIndex = state.topics.findIndex((t) => t.id === topicId);
      if (topicIndex === -1) return;
      // Only allow rollback to completed topics
      if (state.topics[topicIndex].status !== 'completed') return;
      dispatch({ type: 'ROLLBACK_TO_TOPIC', topicIndex });
    },
    [state.topics]
  );

  const value = useMemo<IntakeContextValue>(
    () => ({
      state,
      dispatch,
      getOverallReadiness,
      getActiveTopic,
      getTopicById: getTopicByIdFn,
      getTopicDefinition: getTopicDefinitionFn,
      updateTopicField,
      rollbackToTopic,
    }),
    [
      state,
      dispatch,
      getOverallReadiness,
      getActiveTopic,
      getTopicByIdFn,
      getTopicDefinitionFn,
      updateTopicField,
      rollbackToTopic,
    ]
  );

  return (
    <IntakeContext.Provider value={value}>
      {children}
    </IntakeContext.Provider>
  );
}

// --- Hook ---

export function useIntake(): IntakeContextValue {
  const context = useContext(IntakeContext);
  if (!context) {
    throw new Error('useIntake must be used within an IntakeProvider');
  }
  return context;
}
