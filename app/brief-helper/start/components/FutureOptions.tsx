/**
 * Future Options Component
 *
 * Placeholder buttons for future features:
 * - Upload PDF
 * - Paste Link
 * - Import from...
 *
 * All disabled with "Coming soon" tooltip.
 */

'use client';

import styles from './FutureOptions.module.css';

// ============================================================================
// Component
// ============================================================================

export default function FutureOptions() {
  return (
    <div className={styles.container}>
      <div className={styles.divider}>
        <span className={styles.dividerText}>Or</span>
      </div>

      <div className={styles.options}>
        <button className={styles.option} disabled title="Coming soon">
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Upload PDF</span>
          <span className={styles.badge}>Soon</span>
        </button>

        <button className={styles.option} disabled title="Coming soon">
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Paste Link</span>
          <span className={styles.badge}>Soon</span>
        </button>

        <button className={styles.option} disabled title="Coming soon">
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Import from...</span>
          <span className={styles.badge}>Soon</span>
        </button>
      </div>
    </div>
  );
}
