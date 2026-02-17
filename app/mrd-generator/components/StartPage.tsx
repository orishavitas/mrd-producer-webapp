'use client';

/**
 * MRD Generator - Start Page
 *
 * Product concept input with character grading (200+ recommended).
 * "Generate MRD" triggers batch extraction and navigates to main view.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './StartPage.module.css';

const MIN_CHARS = 50;
const RECOMMENDED = 200;
const MAX_CHARS = 5000;

export default function StartPage() {
  const router = useRouter();
  const [concept, setConcept] = useState('');
  const [error, setError] = useState<string | null>(null);

  const charCount = concept.length;
  const canGenerate = charCount >= MIN_CHARS;

  const handleContinue = () => {
    if (!canGenerate) {
      setError(`Enter at least ${MIN_CHARS} characters`);
      return;
    }
    if (charCount > MAX_CHARS) {
      setError(`Maximum ${MAX_CHARS} characters`);
      return;
    }
    setError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mrd-generator-concept', concept.trim());
    }
    router.push('/mrd-generator');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>MRD Generator</h1>
          <p className={styles.subtitle}>
            Describe your product concept. The AI will extract all 12 MRD sections.
            We recommend 200+ characters for best results.
          </p>
        </header>

        <div className={styles.inputArea}>
          <textarea
            className={styles.textarea}
            value={concept}
            onChange={(e) => {
              setConcept(e.target.value);
              setError(null);
            }}
            placeholder="e.g. AI-powered adjustable kiosk stand for retail, with VESA mounting and cable management..."
            rows={12}
            maxLength={MAX_CHARS}
            aria-label="Product concept description"
          />
          <div className={styles.grading}>
            <span className={charCount >= MIN_CHARS ? styles.ok : styles.low}>
              {charCount} chars
            </span>
            {charCount >= RECOMMENDED && <span className={styles.good}>✓ 200+</span>}
          </div>
          {error && <div className={styles.error} role="alert">{error}</div>}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={handleContinue}
            disabled={!canGenerate}
            aria-label={canGenerate ? 'Generate MRD' : `Enter at least ${MIN_CHARS} characters`}
          >
            Generate MRD
          </button>
          {!canGenerate && (
            <p className={styles.hint}>{MIN_CHARS - charCount} more characters needed</p>
          )}
        </div>
      </div>
    </div>
  );
}
