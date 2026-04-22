'use client';

import styles from '../prd.module.css';

interface Props {
  id: string;
  title: string;
  preparedBy: string;
  updatedAt: string;
  onGenerate: (id: string) => void;
}

export function DocumentPickerCard({ id, title, preparedBy, updatedAt, onGenerate }: Props) {
  const date = new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title || 'Untitled Product'}</h3>
      <p className={styles.cardMeta}>By {preparedBy || 'Unknown'} · {date}</p>
      <button className={styles.generateBtn} onClick={() => onGenerate(id)}>
        Generate PRD
      </button>
    </div>
  );
}
