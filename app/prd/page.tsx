'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentPickerCard } from './components/DocumentPickerCard';
import styles from './prd.module.css';

interface OnePagerDoc {
  id: string;
  title: string;
  content_json: { preparedBy?: string } | null;
  updated_at: string;
}

export default function PRDPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<OnePagerDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents?tool_type=one-pager')
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const docId = searchParams.get('documentId');
    if (docId) handleGenerate(docId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleGenerate(documentId: string) {
    router.push(`/prd/pipeline?documentId=${documentId}`);
  }

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>PRD Producer</h1>
        <p className={styles.subtitle}>Select a One-Pager to generate an engineering PRD.</p>
      </div>
      {docs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No saved One-Pager documents found. Create and publish one first.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {docs.map((doc) => (
            <DocumentPickerCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              preparedBy={doc.content_json?.preparedBy ?? ''}
              updatedAt={doc.updated_at}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
