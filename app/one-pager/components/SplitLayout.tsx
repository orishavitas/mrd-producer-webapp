'use client';

import { ReactNode } from 'react';
import styles from './SplitLayout.module.css';
import OnePagerTopBar from './OnePagerTopBar';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  leftBar: ReactNode;
  rightPanel: ReactNode;
  previewOpen?: boolean;
}

export default function SplitLayout({ leftPanel, leftBar, rightPanel, previewOpen = false }: SplitLayoutProps) {
  return (
    <div className="one-pager-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <OnePagerTopBar />
      <div
        className={styles.container}
        data-preview={previewOpen ? 'open' : 'closed'}
        style={{ flex: 1, minHeight: 0 }}
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
    </div>
  );
}
