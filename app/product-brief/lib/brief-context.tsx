// app/product-brief/lib/brief-context.tsx

'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ProductBriefState, Action, briefReducer, createInitialState } from './brief-state';

// ============================================================================
// Context
// ============================================================================

interface BriefContextValue {
  state: ProductBriefState;
  dispatch: React.Dispatch<Action>;
}

const BriefContext = createContext<BriefContextValue | undefined>(undefined);

const STORAGE_KEY = 'product-brief-session';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Provider
// ============================================================================

export function BriefProvider({ children }: { children: React.ReactNode }) {
  // Try to restore from sessionStorage
  const [state, dispatch] = useReducer(briefReducer, createInitialState(), (initial) => {
    if (typeof window === 'undefined') return initial;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProductBriefState;
        console.log('[BriefProvider] Restored session:', parsed.sessionId);
        return parsed;
      }
    } catch (error) {
      console.error('[BriefProvider] Failed to restore session:', error);
    }

    return initial;
  });

  // Auto-save to sessionStorage
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log('[BriefProvider] Auto-saved session');
      } catch (error) {
        console.error('[BriefProvider] Failed to save session:', error);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [state]);

  // Save on unmount
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log('[BriefProvider] Saved session on unmount');
      } catch (error) {
        console.error('[BriefProvider] Failed to save on unmount:', error);
      }
    };
  }, [state]);

  const value: BriefContextValue = {
    state,
    dispatch,
  };

  return <BriefContext.Provider value={value}>{children}</BriefContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBrief(): BriefContextValue {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error('useBrief must be used within BriefProvider');
  }
  return context;
}

// ============================================================================
// Clear Session Helper
// ============================================================================

export function clearBriefSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('[BriefProvider] Session cleared');
  }
}
