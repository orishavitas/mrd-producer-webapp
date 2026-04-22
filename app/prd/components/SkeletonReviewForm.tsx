'use client';

import React, { useState } from 'react';
import { PRDSkeletonSection } from '@/agent/agents/prd/types';
import styles from '../prd.module.css';

interface Props {
  skeleton: PRDSkeletonSection[];
  onApprove: (skeleton: PRDSkeletonSection[]) => void;
}

export function SkeletonReviewForm({ skeleton, onApprove }: Props) {
  const [sections, setSections] = useState<PRDSkeletonSection[]>(skeleton);

  function updateStrategy(idx: number, value: string) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, strategy: value } : s));
  }

  return (
    <div>
      <div className={styles.skeletonForm}>
        {sections.map((section, idx) => (
          <div key={section.sectionKey} className={styles.sectionRow}>
            <p className={styles.sectionTitle}>{section.sectionTitle}</p>
            <textarea
              className={styles.strategyTextarea}
              value={section.strategy}
              onChange={(e) => updateStrategy(idx, e.target.value)}
            />
          </div>
        ))}
        <button className={styles.approveBtn} onClick={() => onApprove(sections)}>
          Approve &amp; Generate PRD
        </button>
      </div>
    </div>
  );
}
