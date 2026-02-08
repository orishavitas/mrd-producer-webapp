'use client';

import styles from './progress-sidebar.module.css';

interface TopicProgress {
  id: string;
  name: string;
  status: 'upcoming' | 'active' | 'completed';
  completeness: number;
}

interface ProgressSidebarProps {
  topics: TopicProgress[];
  overallReadiness: number;
  onTopicClick?: (topicId: string) => void;
  onGenerate?: () => void;
  onSkipToGenerate?: () => void;
}

export default function ProgressSidebar({
  topics,
  overallReadiness,
  onTopicClick,
  onGenerate,
  onSkipToGenerate,
}: ProgressSidebarProps) {
  const clampedReadiness = Math.min(100, Math.max(0, overallReadiness));

  function handleTopicClick(topic: TopicProgress) {
    if (topic.status === 'completed' && onTopicClick) {
      onTopicClick(topic.id);
    }
  }

  function handleTopicKeyDown(e: React.KeyboardEvent, topic: TopicProgress) {
    if (topic.status === 'completed' && onTopicClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onTopicClick(topic.id);
    }
  }

  return (
    <aside className={styles.sidebar} aria-label="Topic progress">
      <h2 className={styles.sidebarTitle}>Topics</h2>

      <ul className={styles.topicList}>
        {topics.map((topic) => {
          const isClickable = topic.status === 'completed' && !!onTopicClick;
          return (
            <li
              key={topic.id}
              className={`${styles.topicItem} ${styles[`topicItem--${topic.status}`]}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => handleTopicClick(topic)}
              onKeyDown={(e) => handleTopicKeyDown(e, topic)}
            >
              <span className={`${styles.statusIcon} ${styles[`statusIcon--${topic.status}`]}`} aria-hidden="true" />
              <span className={styles.topicName}>{topic.name}</span>
              <div className={styles.topicBar}>
                <div
                  className={styles.topicBarFill}
                  style={{ width: `${topic.completeness}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Overall readiness section */}
      <div className={styles.readinessSection}>
        <div className={styles.readinessLabel}>
          <span>Readiness</span>
          <span>{clampedReadiness}%</span>
        </div>
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

        {clampedReadiness > 50 && onGenerate && (
          <button
            type="button"
            className={styles.generateButton}
            onClick={onGenerate}
          >
            Review &amp; Generate
          </button>
        )}

        {onSkipToGenerate && (
          <button
            type="button"
            className={styles.skipLink}
            onClick={onSkipToGenerate}
          >
            Skip to Generate
          </button>
        )}
      </div>
    </aside>
  );
}
