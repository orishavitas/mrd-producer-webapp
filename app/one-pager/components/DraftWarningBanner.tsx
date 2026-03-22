'use client';

import styles from './DraftWarningBanner.module.css';

interface DraftWarningBannerProps {
  onDismiss: () => void;
}

export default function DraftWarningBanner({ onDismiss }: DraftWarningBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>
        This document is unpublished. Unpublished documents are automatically deleted after 7 days.
      </span>
      <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss warning">
        ✕
      </button>
    </div>
  );
}
