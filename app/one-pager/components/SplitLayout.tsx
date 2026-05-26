'use client';

import React, { ReactNode } from 'react';
import styles from './SplitLayout.module.css';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  previewOpen?: boolean;
  splitDirection?: 'horizontal' | 'vertical';
  topBar?: ReactNode;
  fabSlot?: ReactNode;
}

export default function SplitLayout({
  leftPanel,
  rightPanel,
  previewOpen = false,
  splitDirection = 'vertical',
  topBar,
  fabSlot,
}: SplitLayoutProps) {
  return (
    <div className="one-pager-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {topBar}
      <div
        className={splitDirection === 'horizontal' ? styles.containerH : styles.container}
        data-preview={previewOpen ? 'open' : 'closed'}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div
          className={splitDirection === 'horizontal' ? styles.leftPanelH : styles.leftPanel}
          role="region"
          aria-label="Input fields"
          style={{ position: 'relative' }}
        >
          <div className={styles.leftScroll}>
            {leftPanel}
          </div>
          {fabSlot}
        </div>
        {previewOpen && (
          <div
            className={splitDirection === 'horizontal' ? styles.rightPanelH : styles.rightPanel}
            role="region"
            aria-label="Document preview"
          >
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
}
