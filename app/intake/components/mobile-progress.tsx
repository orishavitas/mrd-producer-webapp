'use client';

import styles from './mobile-progress.module.css';

interface TopicProgress {
  id: string;
  name: string;
  status: 'upcoming' | 'active' | 'completed';
  completeness: number;
}

interface MobileProgressProps {
  topics: TopicProgress[];
  overallReadiness: number;
}

export default function MobileProgress({
  topics,
  overallReadiness,
}: MobileProgressProps) {
  const clampedReadiness = Math.min(100, Math.max(0, overallReadiness));

  return (
    <div className={styles.container} aria-label="Topic progress">
      {/* Horizontal scrollable topic pills */}
      <div className={styles.pillRow}>
        {topics.map((topic) => (
          <span
            key={topic.id}
            className={`${styles.pill} ${styles[`pill--${topic.status}`]}`}
          >
            <span className={`${styles.pillDot} ${styles[`pillDot--${topic.status}`]}`} aria-hidden="true" />
            {topic.name}
          </span>
        ))}
      </div>

      {/* Overall readiness bar */}
      <div className={styles.readinessRow}>
        <span className={styles.readinessLabel}>Readiness {clampedReadiness}%</span>
        <div
          className={styles.readinessBar}
          role="progressbar"
          aria-valuenow={clampedReadiness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall MRD readiness"
        >
          <div
            className={styles.readinessFill}
            style={{ width: `${clampedReadiness}%` }}
          />
        </div>
      </div>
    </div>
  );
}
