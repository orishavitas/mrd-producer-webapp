/**
 * Character Grading Component
 *
 * Visual progress bar with color-coded quality zones.
 * Shows users how much detail they've provided.
 *
 * Zones:
 * 1. Too short (0-49 chars) - Warning (red/amber)
 * 2. Good start (50-99 chars) - Info (blue)
 * 3. Great! (100-149 chars) - Success (green)
 * 4. Excellent! (150+ chars) - Excellent (dark green)
 */

'use client';

import styles from './CharacterGrading.module.css';

// ============================================================================
// Props
// ============================================================================

interface CharacterGradingProps {
  charCount: number;
  thresholds: [number, number, number]; // [good, great, excellent]
}

// ============================================================================
// Types
// ============================================================================

type GradeLevel = 'too-short' | 'good' | 'great' | 'excellent';

interface Grade {
  level: GradeLevel;
  label: string;
  percentage: number;
}

// ============================================================================
// Component
// ============================================================================

export default function CharacterGrading({ charCount, thresholds }: CharacterGradingProps) {
  const [goodThreshold, greatThreshold, excellentThreshold] = thresholds;

  // Determine grade
  const grade = getGrade(charCount, thresholds);

  // Calculate progress percentage (capped at 100%)
  const maxForProgress = excellentThreshold * 1.5; // 150 * 1.5 = 225 for visual cap
  const percentage = Math.min((charCount / maxForProgress) * 100, 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Quality:</span>
        <span className={`${styles.gradeLabel} ${styles[grade.level]}`}>{grade.label}</span>
      </div>

      <div className={styles.progressBar} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.progressFill} ${styles[grade.level]}`} style={{ width: `${percentage}%` }} />

        {/* Threshold markers */}
        <div
          className={styles.marker}
          style={{ left: `${(goodThreshold / maxForProgress) * 100}%` }}
          aria-label={`Good threshold at ${goodThreshold} characters`}
        />
        <div
          className={styles.marker}
          style={{ left: `${(greatThreshold / maxForProgress) * 100}%` }}
          aria-label={`Great threshold at ${greatThreshold} characters`}
        />
        <div
          className={styles.marker}
          style={{ left: `${(excellentThreshold / maxForProgress) * 100}%` }}
          aria-label={`Excellent threshold at ${excellentThreshold} characters`}
        />
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles['too-short']}`} />
          <span className={styles.legendText}>Too short (&lt;{goodThreshold})</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.good}`} />
          <span className={styles.legendText}>Good start ({goodThreshold}+)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.great}`} />
          <span className={styles.legendText}>Great! ({greatThreshold}+)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.excellent}`} />
          <span className={styles.legendText}>Excellent! ({excellentThreshold}+)</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getGrade(charCount: number, thresholds: [number, number, number]): Grade {
  const [good, great, excellent] = thresholds;

  if (charCount < good) {
    return { level: 'too-short', label: 'Too short', percentage: 0 };
  } else if (charCount < great) {
    return { level: 'good', label: 'Good start', percentage: 25 };
  } else if (charCount < excellent) {
    return { level: 'great', label: 'Great!', percentage: 50 };
  } else {
    return { level: 'excellent', label: 'Excellent!', percentage: 75 };
  }
}
