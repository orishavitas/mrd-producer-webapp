'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './OnePagerTopBar.module.css';

export default function OnePagerTopBar() {
  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <Link href="/" className={styles.logoLink} title="Documentation Center">
          <Image
            src="/compulocks-logo.svg"
            alt="Compulocks"
            width={110}
            height={22}
            className={styles.logo}
            priority
          />
        </Link>
        <div className={styles.divider} />
        <span className={styles.product}>
          <strong>MRD Producer</strong> · One-Pager
        </span>
      </div>
    </header>
  );
}
