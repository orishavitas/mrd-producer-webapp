'use client';

/**
 * MRD Generator Context Provider
 *
 * Provides React context for MRD generator state with:
 * - useReducer for state management
 * - sessionStorage persistence
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  MRDState,
  MRDAction,
  mrdReducer,
  createInitialMRDState,
} from './mrd-state';

// ============================================================================
// Context Types
// ============================================================================

interface MRDContextValue {
  state: MRDState;
  dispatch: React.Dispatch<MRDAction>;
}

const MRDContext = createContext<MRDContextValue | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const STATE_STORAGE_KEY = 'mrd-generator-state';
const CONCEPT_STORAGE_KEY = 'mrd-generator-concept';

// ============================================================================
// Provider Component
// ============================================================================

export function MRDProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(mrdReducer, null, () => {
    if (typeof window === 'undefined') {
      return createInitialMRDState();
    }

    let initialState = createInitialMRDState();

    try {
      const stored = sessionStorage.getItem(STATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MRDState;
        if (parsed.sessionId && parsed.sections) {
          initialState = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load MRD state from sessionStorage:', error);
    }

    try {
      const concept = sessionStorage.getItem(CONCEPT_STORAGE_KEY);
      if (concept && concept.trim()) {
        initialState.initialConcept = concept;
      }
    } catch (error) {
      console.error('Failed to load concept from sessionStorage:', error);
    }

    return initialState;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save MRD state to sessionStorage:', error);
      }
    }
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(CONCEPT_STORAGE_KEY, state.initialConcept);
    } catch (error) {
      console.error('Failed to save concept to sessionStorage:', error);
    }
  }, [state.initialConcept]);

  const contextValue: MRDContextValue = {
    state,
    dispatch,
  };

  return (
    <MRDContext.Provider value={contextValue}>{children}</MRDContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMRD() {
  const context = useContext(MRDContext);
  if (!context) {
    throw new Error('useMRD must be used within an MRDProvider');
  }
  return context;
}

export const useMRDContext = useMRD;
