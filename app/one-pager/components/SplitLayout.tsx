'use client';

import { ReactNode } from 'react';
import styles from './SplitLayout.module.css';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  leftBar: ReactNode;
  rightPanel: ReactNode;
  previewOpen?: boolean;
}

export default function SplitLayout({ leftPanel, leftBar, rightPanel, previewOpen = false }: SplitLayoutProps) {
  return (
    <div
      className={`${styles.container} one-pager-root`}
      data-preview={previewOpen ? 'open' : 'closed'}
    >
      <div className={styles.leftPanel} role="region" aria-label="Input fields">
        <div className={styles.leftScroll}>
          {leftPanel}
        </div>
        <div className={styles.leftBar}>
          {leftBar}
        </div>
      </div>
      <div
        className={styles.rightPanel}
        role="region"
        aria-label="Document preview"
        aria-hidden={!previewOpen}
      >
        {rightPanel}
      </div>
    </div>
  );
}
