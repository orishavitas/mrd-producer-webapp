/**
 * Split Layout Component
 *
 * Responsive split-screen container for Brief Helper V2.
 *
 * Desktop (≥1024px): 50/50 CSS Grid split
 * Mobile (<768px): Single column stack
 *
 * Features:
 * - Independent scroll areas for left and right panels
 * - Responsive breakpoints
 * - Accessible structure
 */

'use client';

import { ReactNode } from 'react';
import styles from './SplitLayout.module.css';

// ============================================================================
// Props
// ============================================================================

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export default function SplitLayout({ leftPanel, rightPanel }: SplitLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel} role="region" aria-label="Input fields">
        {leftPanel}
      </div>

      <div className={styles.rightPanel} role="region" aria-label="Preview and suggestions">
        {rightPanel}
      </div>
    </div>
  );
}
