import Link from 'next/link';
import styles from './layout.module.css';

export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link href="/" className={styles.headerLink}>
          <span className={styles.headerArrow} aria-hidden="true">
            &larr;
          </span>
          Home
        </Link>
        <h1 className={styles.headerTitle}>MRD Producer</h1>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
