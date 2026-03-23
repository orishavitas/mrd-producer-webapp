'use client';

/**
 * Field Status Badge Component
 *
 * Displays "Field X/6" with visual indicator for completion status.
 * Used to show progress through the brief helper form.
 */

import React from 'react';
import styles from './FieldStatusBadge.module.css';

// ============================================================================
// Types
// ============================================================================

export interface FieldStatusBadgeProps {
  /** Current field number (1-6) */
  currentField: number;
  /** Total number of fields (always 6) */
  totalFields: number;
  /** Whether this field is complete */
  isComplete: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function FieldStatusBadge({
  currentField,
  totalFields,
  isComplete,
}: FieldStatusBadgeProps) {
  return (
    <div
      className={styles.badge}
      data-complete={isComplete || undefined}
      aria-label={`Field ${currentField} of ${totalFields}${isComplete ? ' (complete)' : ''}`}
    >
      Field {currentField}/{totalFields}
    </div>
  );
}
