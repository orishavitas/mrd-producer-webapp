import { Suspense } from 'react';
import { PipelineContent } from './pipeline-content';
import styles from '../prd.module.css';

function LoadingFallback() {
  return (
    <div className={styles.page}>
      <p>Starting pipeline...</p>
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PipelineContent />
    </Suspense>
  );
}
