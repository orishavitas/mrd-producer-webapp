import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.landing}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>AI-assisted MRDs</p>
        <h1 className={styles.title}>MRD Producer</h1>
        <p className={styles.description}>
          Generate comprehensive Market Requirements Documents from a product
          concept — powered by AI research and structured analysis.
        </p>
        <Link href="/intake" className={styles.cta}>
          Start new MRD
          <span className={styles.ctaArrow} aria-hidden="true">
            &rarr;
          </span>
        </Link>
        <Link href="/legacy" className={styles.legacyLink}>
          Use classic generator
        </Link>
      </div>
    </main>
  );
}
