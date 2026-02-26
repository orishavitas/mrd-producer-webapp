'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  OnePagerState,
  OnePagerAction,
  onePagerReducer,
  createInitialState,
} from './one-pager-state';

const STORAGE_KEY = 'one-pager-state';

interface OnePagerContextValue {
  state: OnePagerState;
  dispatch: React.Dispatch<OnePagerAction>;
  reset: () => void;
}

const OnePagerContext = createContext<OnePagerContextValue | null>(null);

function loadFromStorage(): OnePagerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.sessionId === 'string' && parsed.context) {
      return parsed as OnePagerState;
    }
    return null;
  } catch {
    return null;
  }
}

export function OnePagerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    onePagerReducer,
    null,
    () => loadFromStorage() ?? createInitialState()
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  return (
    <OnePagerContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </OnePagerContext.Provider>
  );
}

export function useOnePager(): OnePagerContextValue {
  const ctx = useContext(OnePagerContext);
  if (!ctx) throw new Error('useOnePager must be used within OnePagerProvider');
  return ctx;
}
