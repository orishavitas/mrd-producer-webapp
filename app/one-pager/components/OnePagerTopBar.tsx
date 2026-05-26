'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';
import styles from './OnePagerTopBar.module.css';

interface OnePagerTopBarProps {
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export default function OnePagerTopBar({ centerSlot, rightSlot }: OnePagerTopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <Image
          src="/compulocks-logo.svg"
          alt="Compulocks"
          width={100}
          height={20}
          className={styles.logo}
          priority
        />
        <div className={styles.divider} />
        <span className={styles.product}>One-Pager</span>
      </div>
      <div className={styles.center}>
        {centerSlot}
      </div>
      <div className={styles.right}>
        {rightSlot}
      </div>
    </header>
  );
}
