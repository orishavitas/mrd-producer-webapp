/**
 * Right Panel Toggle Component
 *
 * Segmented control for switching between:
 * - AI Suggestions (gap suggestions + AI expansion)
 * - Document Preview (formatted brief preview)
 *
 * Features:
 * - Active state styling (blue background)
 * - Icons for visual clarity
 * - Keyboard accessible (arrow keys switch)
 * - Dispatches SET_PREVIEW_MODE action
 */

'use client';

import { useEffect } from 'react';
import { useBriefContext } from '../lib/brief-context';
import styles from './RightPanelToggle.module.css';

// ============================================================================
// Component
// ============================================================================

export default function RightPanelToggle() {
  const { state, dispatch } = useBriefContext();

  const handleToggle = (mode: 'suggestions' | 'document') => {
    dispatch({
      type: 'SET_PREVIEW_MODE',
      payload: { mode },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handleToggle('suggestions');
    } else if (e.key === 'ArrowRight') {
      handleToggle('document');
    }
  };

  return (
    <div className={styles.container} role="tablist" onKeyDown={handleKeyDown}>
      <button
        className={`${styles.tab} ${state.previewMode === 'suggestions' ? styles.active : ''}`}
        onClick={() => handleToggle('suggestions')}
        role="tab"
        aria-selected={state.previewMode === 'suggestions'}
        aria-label="AI Suggestions"
        tabIndex={state.previewMode === 'suggestions' ? 0 : -1}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>AI Suggestions</span>
      </button>

      <button
        className={`${styles.tab} ${state.previewMode === 'document' ? styles.active : ''}`}
        onClick={() => handleToggle('document')}
        role="tab"
        aria-selected={state.previewMode === 'document'}
        aria-label="Document Preview"
        tabIndex={state.previewMode === 'document' ? 0 : -1}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Document Preview</span>
      </button>
    </div>
  );
}
