// app/product-brief/components/FieldEditor.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './FieldEditor.module.css';
import { FieldId, Gap } from '../lib/brief-state';
import GapChip from './GapChip';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity (Optional)',
  risk_assessment: 'Risk Assessment (Optional)',
  competition: 'Competition (Optional)',
};

const FIELD_PLACEHOLDERS: Record<FieldId, string> = {
  product_description: 'Describe what the product is and what problem it solves...',
  target_industry: '• Hospitality\n• Healthcare\n• Retail',
  where_used: '• Countertops\n• Floor-mounted\n• Wall-mounted',
  who_uses: '• Installers\n• Technicians\n• End customers',
  must_have: '• Critical feature 1\n• Critical feature 2',
  nice_to_have: '• Optional feature 1\n• Optional feature 2',
  moq: '100 units per order',
  risk_assessment: 'Potential risks or concerns...',
  competition: '• Competitor 1\n• Competitor 2',
};

interface FieldEditorProps {
  fieldId: FieldId;
  content: string;
  gaps: Gap[];
  hiddenGaps: string[];
  isComplete: boolean;
  onContentChange: (content: string) => void;
  onAddGap: (gapText: string) => void;
  onDismissGap: (gapId: string) => void;
  onMarkComplete: (isComplete: boolean) => void;
}

export default function FieldEditor({
  fieldId,
  content,
  gaps,
  hiddenGaps,
  isComplete,
  onContentChange,
  onAddGap,
  onDismissGap,
  onMarkComplete,
}: FieldEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local content with props
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    // Debounce: Update parent after 500ms
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onContentChange(newContent);
    }, 500);
  };

  const visibleGaps = gaps.filter((g) => !hiddenGaps.includes(g.id));
  const isRequired = !['moq', 'risk_assessment', 'competition'].includes(fieldId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {FIELD_LABELS[fieldId]}
          {isRequired && <span className={styles.required}>*</span>}
        </h3>
        {isComplete && <span className={styles.completeBadge}>✓ Complete</span>}
      </div>

      <textarea
        className={styles.textarea}
        value={localContent}
        onChange={handleChange}
        placeholder={FIELD_PLACEHOLDERS[fieldId]}
        rows={8}
      />

      {visibleGaps.length > 0 && (
        <div className={styles.gapsSection}>
          <h4 className={styles.gapsTitle}>💡 Suggestions</h4>
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

      <div className={styles.footer}>
        <button
          className={styles.doneButton}
          onClick={() => onMarkComplete(!isComplete)}
        >
          {isComplete ? 'Edit' : 'Mark as Done'}
        </button>
      </div>
    </div>
  );
}
