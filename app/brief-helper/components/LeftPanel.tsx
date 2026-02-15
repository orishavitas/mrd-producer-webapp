/**
 * Left Panel Component
 *
 * Container for all 6 BriefField components with:
 * - Progress indicator at top
 * - Back button to start page
 * - Auto-scroll to active field
 * - Conditional render for collapsed vs expanded fields
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBriefContext } from '../lib/brief-context';
import { getCompletionProgress } from '../lib/brief-state';
import BriefField from './BriefField';
import CollapsedFieldCard from './CollapsedFieldCard';
import styles from './LeftPanel.module.css';

// ============================================================================
// Component
// ============================================================================

export default function LeftPanel() {
  const router = useRouter();
  const { state } = useBriefContext();
  const activeFieldRef = useRef<HTMLDivElement>(null);

  const completionProgress = getCompletionProgress(state);

  // Auto-scroll to active field when it changes
  useEffect(() => {
    if (state.activeFieldId && activeFieldRef.current) {
      activeFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [state.activeFieldId]);

  const handleBack = () => {
    router.push('/brief-helper/start');
  };

  const fields: Array<{ id: BriefField; label: string }> = [
    { id: 'what', label: 'What - Product Description' },
    { id: 'who', label: 'Who - Target Users/Customers' },
    { id: 'where', label: 'Where - Use Environment' },
    { id: 'moq', label: 'MOQ - Minimum Order Quantity' },
    { id: 'must-have', label: 'Must-Have Features' },
    { id: 'nice-to-have', label: 'Nice-to-Have Features' },
  ];

  return (
    <div className={styles.container}>
      {/* Header with progress and back button */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack} aria-label="Back to start page">
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className={styles.progress}>
          <span className={styles.progressText}>
            {completionProgress} of 6 complete
          </span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(completionProgress / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Field list */}
      <div className={styles.fields}>
        {fields.map((field) => {
          const isCollapsed = state.collapsedFields.includes(field.id);
          const isActive = state.activeFieldId === field.id;

          return (
            <div
              key={field.id}
              ref={isActive ? activeFieldRef : null}
              className={styles.fieldWrapper}
            >
              {isCollapsed ? (
                <CollapsedFieldCard fieldId={field.id} label={field.label} />
              ) : (
                <BriefField fieldId={field.id} label={field.label} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
