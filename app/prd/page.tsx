import { Suspense } from 'react';
import { PRDContent } from './prd-content';
import styles from './prd.module.css';

function LoadingFallback() {
  return <div className={styles.page}><p>Loading...</p></div>;
}

export default function PRDPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PRDContent />
    </Suspense>
  );
}
