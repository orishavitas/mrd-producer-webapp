'use client';

import styles from './intake.module.css';

const TOPICS = [
  'Problem & Vision',
  'Market & Users',
  'Product Definition',
  'Design & Experience',
  'Business & Pricing',
  'Competitive Landscape',
] as const;

export default function IntakePage() {
  return (
    <div className={styles.wrapper}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Topics</h2>
        <ul className={styles.topicList}>
          {TOPICS.map((topic) => (
            <li key={topic} className={styles.topicItem}>
              <span className={styles.topicCircle} aria-hidden="true" />
              {topic}
            </li>
          ))}
        </ul>
        <div className={styles.readinessSection}>
          <div className={styles.readinessLabel}>
            <span>Readiness</span>
            <span>0%</span>
          </div>
          <div
            className={styles.readinessBar}
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="MRD readiness"
          >
            <div className={styles.readinessFill} />
          </div>
        </div>
      </aside>

      {/* Mobile progress bar */}
      <div className={styles.mobileProgress}>
        <div className={styles.mobileTopicRow}>
          {TOPICS.map((topic) => (
            <span key={topic} className={styles.mobileTopicPill}>
              <span className={styles.mobileCircle} aria-hidden="true" />
              {topic}
            </span>
          ))}
        </div>
        <div className={styles.mobileReadiness}>
          <span className={styles.mobileReadinessLabel}>Readiness 0%</span>
          <div
            className={styles.mobileReadinessBar}
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="MRD readiness"
          >
            <div className={styles.mobileReadinessFill} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.placeholder}>
          <h2 className={styles.placeholderTitle}>Intake flow coming soon</h2>
          <p className={styles.placeholderText}>
            This is where the progressive intake experience will guide you
            through building your MRD step by step.
          </p>
        </div>
      </main>
    </div>
  );
}
