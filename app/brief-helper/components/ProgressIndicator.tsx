'use client';

/**
 * Progress Indicator Component
 *
 * Displays completion progress for the brief helper form.
 * Shows "X of 6 fields complete" with visual progress bar.
 */

import React from 'react';
import { useBrief } from '../lib/brief-context';
import { getCompletionProgress } from '../lib/brief-state';
import styles from './ProgressIndicator.module.css';

// ============================================================================
// Component
// ============================================================================

export default function ProgressIndicator() {
  const { state } = useBrief();
  const completed = getCompletionProgress(state);
  const total = 6;
  const percentage = (completed / total) * 100;

  return (
    <div className={styles.container}>
      {/* Progress text */}
      <div className={styles.label} aria-live="polite">
        {completed} of {total} fields complete
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar} role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
