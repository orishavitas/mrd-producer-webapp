'use client';

/**
 * Brief Helper Context Provider
 *
 * Provides React context for brief helper state with:
 * - useReducer for state management
 * - sessionStorage persistence
 * - Debounce helper for pause detection
 */

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import {
  BriefState,
  BriefAction,
  briefReducer,
  createInitialState,
  BriefField,
} from './brief-state';

// ============================================================================
// Context Types
// ============================================================================

interface BriefContextValue {
  state: BriefState;
  dispatch: React.Dispatch<BriefAction>;
  /** Debounced callback for text input pause detection */
  registerPauseCallback: (fieldType: BriefField, callback: () => void) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const BriefContext = createContext<BriefContextValue | undefined>(undefined);

// ============================================================================
// Storage Key
// ============================================================================

const STORAGE_KEY = 'brief-helper-state';

// ============================================================================
// Provider Component
// ============================================================================

export function BriefProvider({ children }: { children: React.ReactNode }) {
  // Load initial state from sessionStorage or create new
  const [state, dispatch] = useReducer(briefReducer, null, () => {
    if (typeof window === 'undefined') {
      return createInitialState();
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BriefState;
        // Validate that the stored state has the expected structure
        if (parsed.sessionId && parsed.fields) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load brief state from sessionStorage:', error);
    }

    return createInitialState();
  });

  // Store pause callbacks for each field
  const pauseCallbacks = useRef<Map<BriefField, () => void>>(new Map());

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save brief state to sessionStorage:', error);
      }
    }
  }, [state]);

  // Register pause callback for a field
  const registerPauseCallback = (fieldType: BriefField, callback: () => void) => {
    pauseCallbacks.current.set(fieldType, callback);
  };

  const contextValue: BriefContextValue = {
    state,
    dispatch,
    registerPauseCallback,
  };

  return <BriefContext.Provider value={contextValue}>{children}</BriefContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access brief helper state and dispatch
 */
export function useBrief() {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error('useBrief must be used within a BriefProvider');
  }
  return context;
}

// ============================================================================
// Debounce Hook
// ============================================================================

/**
 * Debounced value hook - fires callback after delay with no changes
 *
 * @param value - Value to watch
 * @param callback - Function to call after debounce delay
 * @param delay - Delay in milliseconds (default: 2500ms)
 */
export function useDebounce<T>(value: T, callback: (value: T) => void, delay: number = 2500) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback(value);
    }, delay);

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, callback, delay]);
}

// ============================================================================
// Pause Detection Hook
// ============================================================================

/**
 * Detect when user pauses typing in a field
 *
 * @param value - Current text value
 * @param onPause - Callback to fire after pause
 * @param delay - Pause delay in milliseconds (default: 2500ms)
 */
export function usePauseDetection(value: string, onPause: () => void, delay: number = 2500) {
  const previousValue = useRef(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only trigger if value actually changed
    if (value === previousValue.current) {
      return;
    }

    previousValue.current = value;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip if value is empty
    if (!value.trim()) {
      return;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onPause();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onPause, delay]);
}
