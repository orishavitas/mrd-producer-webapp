'use client';

/**
 * Gap Suggestion Component
 *
 * Displays detected information gaps with suggested questions.
 * Shows warning-styled panel with dismissable suggestions.
 * Provides "Fill Manually" and "AI Expand" action buttons.
 */

import React from 'react';
import styles from './GapSuggestion.module.css';

// ============================================================================
// Types
// ============================================================================

export interface Gap {
  id: string;
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedQuestion: string;
  exampleAnswer?: string;
}

export interface GapSuggestionProps {
  /** List of detected gaps */
  gaps: Gap[];
  /** Callback when user dismisses a gap */
  onDismissGap: (gapId: string) => void;
  /** Callback when user clicks "AI Expand" */
  onAIExpand?: () => void;
  /** Whether AI expansion is available */
  canExpand?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function GapSuggestion({
  gaps,
  onDismissGap,
  onAIExpand,
  canExpand = false,
}: GapSuggestionProps) {
  if (gaps.length === 0) {
    return null;
  }

  // Sort gaps by priority
  const sortedGaps = [...gaps].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Count by priority
  const highPriorityCount = gaps.filter((g) => g.priority === 'high').length;
  const mediumPriorityCount = gaps.filter((g) => g.priority === 'medium').length;
  const lowPriorityCount = gaps.filter((g) => g.priority === 'low').length;

  return (
    <div className={styles.container} role="alert" aria-live="polite">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg
            className={styles.icon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h4 className={styles.title}>Missing Information Detected</h4>
        </div>
        <p className={styles.subtitle}>
          {highPriorityCount > 0 && (
            <span className={styles.priorityBadge} data-priority="high">
              {highPriorityCount} critical
            </span>
          )}
          {mediumPriorityCount > 0 && (
            <span className={styles.priorityBadge} data-priority="medium">
              {mediumPriorityCount} medium
            </span>
          )}
          {lowPriorityCount > 0 && (
            <span className={styles.priorityBadge} data-priority="low">
              {lowPriorityCount} low
            </span>
          )}
        </p>
      </div>

      {/* Gap List */}
      <ul className={styles.gapList}>
        {sortedGaps.map((gap) => (
          <li
            key={gap.id}
            className={styles.gapItem}
            data-priority={gap.priority}
          >
            <div className={styles.gapContent}>
              <p className={styles.gapQuestion}>{gap.suggestedQuestion}</p>
              {gap.exampleAnswer && (
                <p className={styles.gapExample}>
                  <span className={styles.exampleLabel}>Example:</span>{' '}
                  {gap.exampleAnswer}
                </p>
              )}
            </div>
            <button
              className={styles.dismissButton}
              onClick={() => onDismissGap(gap.id)}
              aria-label={`Dismiss suggestion: ${gap.suggestedQuestion}`}
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => {
            // Scroll to the textarea to fill manually
            const container = document.querySelector('[data-field-container]');
            container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          type="button"
        >
          Fill Manually
        </button>
        {canExpand && onAIExpand && (
          <button
            className={`${styles.actionButton} ${styles.primaryAction}`}
            onClick={onAIExpand}
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 3V8M8 8V13M8 8H13M8 8H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            AI Expand
          </button>
        )}
      </div>
    </div>
  );
}
