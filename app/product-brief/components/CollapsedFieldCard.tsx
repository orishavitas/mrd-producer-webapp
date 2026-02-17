// app/product-brief/components/CollapsedFieldCard.tsx

'use client';

import React from 'react';
import styles from './CollapsedFieldCard.module.css';
import { FieldId } from '../lib/brief-state';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'MOQ',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

interface CollapsedFieldCardProps {
  fieldId: FieldId;
  content: string;
  gapCount: number;
  onExpand: () => void;
}

export default function CollapsedFieldCard({
  fieldId,
  content,
  gapCount,
  onExpand,
}: CollapsedFieldCardProps) {
  // Extract first 2-3 bullets for preview
  const lines = content.split('\n').filter((line) => line.trim().startsWith('•'));
  const preview = lines.slice(0, 3).join('\n');

  return (
    <div className={styles.card} onClick={onExpand}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <span className={styles.checkmark}>✓</span>
          <h4 className={styles.title}>{FIELD_LABELS[fieldId]}</h4>
        </div>
        {gapCount > 0 && (
          <span className={styles.gapBadge}>
            ⚠️ {gapCount} gap{gapCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className={styles.preview}>{preview || content.substring(0, 100)}</div>

      <button className={styles.editButton} onClick={onExpand}>
        Edit
      </button>
    </div>
  );
}
