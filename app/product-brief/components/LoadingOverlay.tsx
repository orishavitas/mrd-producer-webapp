// app/product-brief/components/LoadingOverlay.tsx

'use client';

import React, { useState, useEffect } from 'react';
import styles from './LoadingOverlay.module.css';
import { FIELD_IDS, FieldId } from '../lib/brief-state';

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

export default function LoadingOverlay() {
  const [completedFields, setCompletedFields] = useState<Set<FieldId>>(new Set());

  useEffect(() => {
    // Simulate progressive completion
    let index = 0;
    const interval = setInterval(() => {
      if (index < FIELD_IDS.length) {
        setCompletedFields((prev) => new Set([...prev, FIELD_IDS[index]]));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Analyzing your product concept...</h2>

        <div className={styles.checklist}>
          {FIELD_IDS.map((fieldId) => {
            const isComplete = completedFields.has(fieldId);
            return (
              <div key={fieldId} className={styles.checkItem}>
                <span className={styles.icon}>
                  {isComplete ? '✓' : '⏳'}
                </span>
                <span className={isComplete ? styles.labelComplete : styles.labelPending}>
                  {FIELD_LABELS[fieldId]}
                </span>
              </div>
            );
          })}
        </div>

        <p className={styles.footer}>This may take 10-15 seconds...</p>
      </div>
    </div>
  );
}
