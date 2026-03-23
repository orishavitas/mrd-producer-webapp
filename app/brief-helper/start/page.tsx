/**
 * Brief Helper - Start Page
 *
 * Initial description page with character grading.
 * User enters detailed product description (min 20 chars, max 2000).
 * Character grading shows quality thresholds (50/100/150+).
 * Continues to main brief helper page for batch extraction.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBriefContext } from '../lib/brief-context';
import DescriptionTextarea from './components/DescriptionTextarea';
import CharacterGrading from './components/CharacterGrading';
import FutureOptions from './components/FutureOptions';
import styles from './start.module.css';

// ============================================================================
// Character Thresholds
// ============================================================================

const CHARACTER_THRESHOLDS = {
  MIN: 20, // Hard minimum
  GOOD: 50, // Good start
  GREAT: 100, // Great detail
  EXCELLENT: 150, // Excellent detail
  MAX: 2000, // Hard maximum
};

// ============================================================================
// Start Page Component
// ============================================================================

export default function BriefHelperStartPage() {
  const router = useRouter();
  const { state, dispatch } = useBriefContext();
  const [description, setDescription] = useState(state.initialDescription || '');
  const [error, setError] = useState<string | null>(null);

  const charCount = description.length;
  const canContinue = charCount >= CHARACTER_THRESHOLDS.MIN;

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setError(null);
  };

  const handleContinue = () => {
    // Validate
    if (!canContinue) {
      setError(`Please enter at least ${CHARACTER_THRESHOLDS.MIN} characters`);
      return;
    }

    if (charCount > CHARACTER_THRESHOLDS.MAX) {
      setError(`Description exceeds maximum length of ${CHARACTER_THRESHOLDS.MAX} characters`);
      return;
    }

    // Save to state
    dispatch({
      type: 'SET_INITIAL_DESCRIPTION',
      payload: { description },
    });

    // Save to sessionStorage for persistence
    sessionStorage.setItem('briefHelperDescription', description);

    // Navigate to main brief helper page
    router.push('/brief-helper');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canContinue) {
      handleContinue();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Quick Product Brief</h1>
          <p className={styles.subtitle}>
            Describe your product idea in detail. The more information you provide, the better
            the AI can help structure your brief.
          </p>
        </header>

        {/* Main Input Area */}
        <div className={styles.inputArea}>
          <DescriptionTextarea
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={handleKeyDown}
            maxLength={CHARACTER_THRESHOLDS.MAX}
          />

          <CharacterGrading
            charCount={charCount}
            thresholds={[
              CHARACTER_THRESHOLDS.GOOD,
              CHARACTER_THRESHOLDS.GREAT,
              CHARACTER_THRESHOLDS.EXCELLENT,
            ]}
          />

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Future Options */}
        <FutureOptions />

        {/* Continue Button */}
        <div className={styles.actions}>
          <button
            className={styles.continueButton}
            onClick={handleContinue}
            disabled={!canContinue}
            aria-label={
              canContinue
                ? 'Continue to brief helper'
                : `Enter at least ${CHARACTER_THRESHOLDS.MIN} characters to continue`
            }
          >
            Continue
            {canContinue && (
              <span className={styles.buttonHint}>
                (or Ctrl+Enter)
              </span>
            )}
          </button>
          {!canContinue && (
            <p className={styles.hint}>
              {CHARACTER_THRESHOLDS.MIN - charCount} more character{CHARACTER_THRESHOLDS.MIN - charCount === 1 ? '' : 's'} needed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
