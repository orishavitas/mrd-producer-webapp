/**
 * Right Panel Component
 *
 * Container for right side of split layout with toggle header.
 *
 * Features:
 * - Sticky header with RightPanelToggle
 * - Conditional render based on previewMode state:
 *   - 'suggestions' → SuggestionsView
 *   - 'document' → DocumentPreview
 * - Fade transition between modes (300ms)
 * - Passes activeFieldId, fields, gaps as props
 */

'use client';

import { useBriefContext } from '../lib/brief-context';
import RightPanelToggle from './RightPanelToggle';
import SuggestionsView from './SuggestionsView';
import DocumentPreview from './DocumentPreview';
import styles from './RightPanel.module.css';

// ============================================================================
// Component
// ============================================================================

export default function RightPanel() {
  const { state } = useBriefContext();

  return (
    <div className={styles.container}>
      {/* Sticky Header with Toggle */}
      <div className={styles.header}>
        <RightPanelToggle />
      </div>

      {/* Content Area - Conditional Render with Fade Transition */}
      <div className={styles.content}>
        <div
          className={`${styles.view} ${
            state.previewMode === 'suggestions' ? styles.visible : styles.hidden
          }`}
        >
          <SuggestionsView activeFieldId={state.activeFieldId} />
        </div>

        <div
          className={`${styles.view} ${
            state.previewMode === 'document' ? styles.visible : styles.hidden
          }`}
        >
          <DocumentPreview />
        </div>
      </div>
    </div>
  );
}
