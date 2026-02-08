'use client';

import styles from './gap-panel.module.css';

interface Gap {
  severity: 'red' | 'yellow';
  topicId: string;
  title: string;
  explanation: string;
  canAIFill: boolean;
}

interface GapPanelProps {
  gaps: Gap[];
  overallReadiness: number;
  onFillGap: (topicId: string) => void;
  onAcceptGap: (gapTitle: string) => void;
  onGoBack: () => void;
  onGenerateAnyway: () => void;
}

export default function GapPanel({
  gaps,
  overallReadiness,
  onFillGap,
  onAcceptGap,
  onGoBack,
  onGenerateAnyway,
}: GapPanelProps) {
  const clampedReadiness = Math.min(100, Math.max(0, overallReadiness));
  const gapCount = gaps.length;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Research Brief: {clampedReadiness}% Ready
        </h2>
        {gapCount > 0 && (
          <p className={styles.subtitle}>
            {gapCount} gap{gapCount !== 1 ? 's' : ''} that may affect quality
          </p>
        )}
      </div>

      {/* Gap list */}
      {gapCount > 0 && (
        <ul className={styles.gapList}>
          {gaps.map((gap, index) => (
            <li
              key={`${gap.topicId}-${index}`}
              className={`${styles.gapItem} ${styles[`gapItem--${gap.severity}`]}`}
            >
              <div className={styles.gapContent}>
                <div className={styles.gapIcon} aria-hidden="true">
                  {gap.severity === 'red' ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="9" fill="var(--error-soft)" />
                      <path d="M9 5v4M9 12h.01" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="9" fill="var(--warning-soft)" />
                      <path d="M9 5v4M9 12h.01" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div className={styles.gapText}>
                  <h3 className={styles.gapTitle}>{gap.title}</h3>
                  <p className={styles.gapExplanation}>{gap.explanation}</p>
                </div>
              </div>
              <div className={styles.gapActions}>
                <button
                  type="button"
                  className={styles.fillButton}
                  onClick={() => onFillGap(gap.topicId)}
                >
                  Fill this in
                </button>
                {gap.severity === 'yellow' && (
                  <button
                    type="button"
                    className={styles.acceptButton}
                    onClick={() => onAcceptGap(gap.title)}
                  >
                    {gap.canAIFill ? 'Let AI estimate' : "OK, that's fine"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom actions */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.goBackButton}
          onClick={onGoBack}
        >
          Go back and fill gaps
        </button>
        <button
          type="button"
          className={styles.generateButton}
          onClick={onGenerateAnyway}
        >
          Generate anyway
        </button>
      </div>
    </div>
  );
}
