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

export function PRDContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docs, setDocs] = useState<OnePagerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleGenerate(onePagerId: string) {
    setGeneratingId(onePagerId);
    setError(null);
    try {
      const res = await fetch('/api/prd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onePagerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'PRD generation failed');
      }
      const data = await res.json();
      router.push(`/prd/${data.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PRD generation failed');
      setGeneratingId(null);
    }
  }

  if (loading) return <div className={styles.page}><p>Loading...</p></div>;
  if (generatingId) return <div className={styles.page}><p>Generating PRD...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>PRD Producer</h1>
        <p className={styles.subtitle}>Select an MRD Producer document to generate an engineering PRD.</p>
      </div>
      {error && <p className={styles.subtitle} style={{ color: 'red' }}>{error}</p>}
      {docs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No saved MRD Producer documents found. Create and publish one first.</p>
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
