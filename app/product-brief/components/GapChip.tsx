// app/product-brief/components/GapChip.tsx

'use client';

import React from 'react';
import styles from './GapChip.module.css';
import { Gap } from '../lib/brief-state';

interface GapChipProps {
  gap: Gap;
  onAdd: () => void;
  onDismiss: () => void;
}

export default function GapChip({ gap, onAdd, onDismiss }: GapChipProps) {
  const priorityClass = {
    high: styles.priorityHigh,
    medium: styles.priorityMedium,
    low: styles.priorityLow,
  }[gap.priority];

  return (
    <div className={`${styles.chip} ${priorityClass}`}>
      <span className={styles.icon}>💡</span>
      <span className={styles.text}>{gap.suggestion}</span>
      <button
        className={styles.addButton}
        onClick={onAdd}
        aria-label="Add this suggestion"
        title="Add to field"
      >
        +
      </button>
      <button
        className={styles.dismissButton}
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
