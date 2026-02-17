// app/product-brief/components/StartPage.tsx

'use client';

import React, { useState } from 'react';
import styles from './StartPage.module.css';

interface StartPageProps {
  onGenerate: (concept: string) => void;
}

export default function StartPage({ onGenerate }: StartPageProps) {
  const [concept, setConcept] = useState('');

  const handleGenerate = () => {
    if (concept.trim().length >= 50) {
      onGenerate(concept.trim());
    }
  };

  const charCount = concept.length;
  const gradeColor =
    charCount >= 200 ? '#10b981' : charCount >= 100 ? '#f59e0b' : charCount >= 50 ? '#ef4444' : '#6b7280';
  const canGenerate = charCount >= 50;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Product Brief Generator</h1>
        <p className={styles.subtitle}>
          Describe your product concept and we'll help you create a structured brief
        </p>

        <div className={styles.inputSection}>
          <label htmlFor="concept" className={styles.label}>
            Describe your product concept:
          </label>
          <textarea
            id="concept"
            className={styles.textarea}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Include: what it is, who it's for, where it's used, key features..."
            rows={10}
          />

          <div className={styles.footer}>
            <div className={styles.charCount} style={{ color: gradeColor }}>
              {charCount} / 200+ recommended
            </div>
            {charCount < 50 && (
              <div className={styles.warning}>
                ⚠️ More detail = better extraction (minimum 50 characters)
              </div>
            )}
          </div>
        </div>

        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate Brief
        </button>
      </div>
    </div>
  );
}
