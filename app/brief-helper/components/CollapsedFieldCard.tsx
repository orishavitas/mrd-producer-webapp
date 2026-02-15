/**
 * Collapsed Field Card Component
 *
 * Compact card showing completed field summary.
 *
 * Features:
 * - Max height: 80px (desktop), 60px (mobile)
 * - Green checkmark icon + field name
 * - First 2-3 bullets (truncated with "...")
 * - Gap badge if gaps exist
 * - "Edit" button → expands field
 * - Click anywhere → expand
 * - Smooth animation (300ms)
 */

'use client';

import { useBriefContext } from '../lib/brief-context';
import { BriefField } from '../lib/brief-state';
import styles from './CollapsedFieldCard.module.css';

// ============================================================================
// Props
// ============================================================================

interface CollapsedFieldCardProps {
  fieldId: BriefField;
  label: string;
}

// ============================================================================
// Component
// ============================================================================

export default function CollapsedFieldCard({ fieldId, label }: CollapsedFieldCardProps) {
  const { state, dispatch } = useBriefContext();
  const fieldState = state.fields[fieldId];

  const visibleGaps = fieldState.gaps.filter(
    (gap) => !fieldState.hiddenGaps.includes(gap.id)
  );

  const handleExpand = () => {
    dispatch({
      type: 'EXPAND_FIELD',
      payload: { fieldType: fieldId },
    });
    dispatch({
      type: 'SET_ACTIVE_FIELD',
      payload: { fieldId },
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleExpand();
  };

  // Show first 2-3 bullets, truncated
  const maxBulletsToShow = 3;
  const displayBullets = fieldState.bulletPoints.slice(0, maxBulletsToShow);
  const hasMore = fieldState.bulletPoints.length > maxBulletsToShow;

  return (
    <div className={styles.card} onClick={handleExpand} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleExpand()}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <svg className={styles.checkmark} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className={styles.title}>{label}</h3>
        </div>

        <div className={styles.actions}>
          {visibleGaps.length > 0 && (
            <span className={styles.gapBadge} title={`${visibleGaps.length} gap${visibleGaps.length === 1 ? '' : 's'} detected`}>
              {visibleGaps.length}
            </span>
          )}
          <button className={styles.editButton} onClick={handleEdit} aria-label={`Edit ${label}`}>
            Edit
          </button>
        </div>
      </div>

      <div className={styles.preview}>
        {displayBullets.map((bullet, index) => (
          <p key={index} className={styles.bullet}>
            • {bullet.length > 80 ? `${bullet.substring(0, 80)}...` : bullet}
          </p>
        ))}
        {hasMore && (
          <p className={styles.more}>
            +{fieldState.bulletPoints.length - maxBulletsToShow} more
          </p>
        )}
      </div>
    </div>
  );
}
