/**
 * Loading Overlay Component
 *
 * Full-screen overlay for batch extraction progress.
 *
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Center modal (max-width: 500px)
 * - Title: "Analyzing your description..."
 * - Progress checklist (6 items, one per field):
 *   - ✓ Done (green checkmark)
 *   - ⏳ Processing (blue, animated spinner)
 *   - ⌛ Pending (gray, waiting)
 * - Fade in on mount (200ms)
 * - Fade out on complete (300ms)
 * - Prevent interaction while visible (z-index: 1000)
 */

'use client';

import { useEffect, useState } from 'react';
import { BriefField } from '../lib/brief-state';
import { getFieldLabel } from '../lib/field-definitions';
import styles from './LoadingOverlay.module.css';

// ============================================================================
// Types
// ============================================================================

interface LoadingOverlayProps {
  /** Fields currently being processed */
  processingFields: BriefField[];
  /** Whether overlay should be visible */
  isVisible: boolean;
}

type FieldStatus = 'pending' | 'processing' | 'done';

interface FieldProgress {
  id: BriefField;
  label: string;
  status: FieldStatus;
}

// ============================================================================
// Component
// ============================================================================

export default function LoadingOverlay({ processingFields, isVisible }: LoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // All 6 fields in order
  const allFields: BriefField[] = ['what', 'who', 'where', 'moq', 'must-have', 'nice-to-have'];

  // Calculate current processing field index
  const currentFieldIndex = processingFields.length > 0
    ? allFields.indexOf(processingFields[0])
    : -1;

  // Build progress checklist
  const progressChecklist: FieldProgress[] = allFields.map((fieldId, index) => {
    let status: FieldStatus = 'pending';

    if (index < currentFieldIndex) {
      status = 'done';
    } else if (index === currentFieldIndex) {
      status = 'processing';
    }

    return {
      id: fieldId,
      label: getFieldLabel(fieldId),
      status,
    };
  });

  // Handle fade in/out animations
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setFadeOut(false);
    } else if (shouldRender) {
      // Start fade out
      setFadeOut(true);
      // Remove from DOM after fade out completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  // Don't render if not visible and fade out complete
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.fadeOut : styles.fadeIn}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <div className={styles.backdrop} onClick={(e) => e.stopPropagation()} />

      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="loading-title" className={styles.title}>
            Analyzing your description...
          </h2>
          <p id="loading-description" className={styles.subtitle}>
            Extracting structured information from your product description
          </p>
        </div>

        <div className={styles.progressList} role="status" aria-live="polite">
          {progressChecklist.map((field) => (
            <div key={field.id} className={styles.progressItem}>
              {/* Status Icon */}
              {field.status === 'done' && (
                <svg className={`${styles.icon} ${styles.iconDone}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}

              {field.status === 'processing' && (
                <div className={`${styles.icon} ${styles.iconProcessing}`}>
                  <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {field.status === 'pending' && (
                <svg className={`${styles.icon} ${styles.iconPending}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
              )}

              {/* Field Label */}
              <span className={`${styles.label} ${styles[`label${capitalize(field.status)}`]}`}>
                {field.label}
              </span>
            </div>
          ))}
        </div>

        {/* Current Processing Field */}
        {currentFieldIndex >= 0 && (
          <div className={styles.currentField}>
            <div className={styles.currentFieldDot} />
            <p className={styles.currentFieldText}>
              Processing: {getFieldLabel(progressChecklist[currentFieldIndex].id)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
