import Link from 'next/link';
import styles from './results.module.css';

export default function ResultsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>No MRD generated yet</h2>
        <p className={styles.text}>
          Complete the intake flow to generate your Market Requirements Document.
        </p>
        <Link href="/intake" className={styles.link}>
          &larr; Back to intake
        </Link>
      </div>
    </div>
  );
}
