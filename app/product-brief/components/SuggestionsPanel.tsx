// app/product-brief/components/SuggestionsPanel.tsx

'use client';

import React from 'react';
import styles from './SuggestionsPanel.module.css';
import { FieldId, Gap } from '../lib/brief-state';
import GapChip from './GapChip';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

interface SuggestionsPanelProps {
  activeFieldId: FieldId | null;
  gaps: Gap[];
  hiddenGaps: string[];
  onAddGap: (gapText: string) => void;
  onDismissGap: (gapId: string) => void;
  onResearchCompetitors?: () => void;
  isResearching?: boolean;
}

export default function SuggestionsPanel({
  activeFieldId,
  gaps,
  hiddenGaps,
  onAddGap,
  onDismissGap,
  onResearchCompetitors,
  isResearching = false,
}: SuggestionsPanelProps) {
  const visibleGaps = gaps.filter((g) => !hiddenGaps.includes(g.id));

  if (!activeFieldId) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💡</span>
          <p className={styles.emptyText}>Select a field to see AI suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>💡 AI Suggestions</h3>
        <span className={styles.fieldName}>{FIELD_LABELS[activeFieldId]}</span>
      </div>

      <div className={styles.content}>
        {activeFieldId === 'competition' && onResearchCompetitors && (
          <div className={styles.researchSection}>
            <button
              className={styles.researchButton}
              onClick={onResearchCompetitors}
              disabled={isResearching}
            >
              {isResearching ? (
                <>
                  <span className={styles.spinner}>⏳</span>
                  Researching competitors...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Research Competitors with AI
                </>
              )}
            </button>
            <p className={styles.researchHint}>
              Uses Google Search to find 3-5 direct competitors based on your product info
            </p>
          </div>
        )}

        {visibleGaps.length === 0 ? (
          <div className={styles.noGaps}>
            <span className={styles.checkmark}>✓</span>
            <p>No suggestions - field looks complete!</p>
          </div>
        ) : (
          <div className={styles.gapsList}>
            {visibleGaps.map((gap) => (
              <GapChip
                key={gap.id}
                gap={gap}
                onAdd={() => onAddGap(gap.suggestion)}
                onDismiss={() => onDismissGap(gap.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
