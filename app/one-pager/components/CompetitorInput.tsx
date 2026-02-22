'use client';

import { useState } from 'react';
import styles from './CompetitorInput.module.css';

interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  photoUrl?: string;
  candidatePhotos?: string[];
}

interface CompetitorInputProps {
  competitors: CompetitorEntry[];
  onAdd: (url: string) => void;
  onUpdate: (url: string, data: Partial<CompetitorEntry>) => void;
  onRemove: (url: string) => void;
  onCandidates?: (url: string, candidates: string[]) => void;
  onSelectPhoto?: (url: string, photoUrl: string) => void;
  renderPhotoPicker?: (comp: CompetitorEntry) => React.ReactNode;
}

export default function CompetitorInput({
  competitors,
  onAdd,
  onUpdate,
  onRemove,
  onCandidates,
  renderPhotoPicker,
}: CompetitorInputProps) {
  const [urlInput, setUrlInput] = useState('');

  const handleConfirm = async () => {
    const url = urlInput.trim();
    if (!url) return;

    onAdd(url);
    setUrlInput('');

    onUpdate(url, { status: 'extracting' });

    try {
      const response = await fetch('/api/one-pager/extract-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.success) {
        onUpdate(url, { ...data.data, status: 'done' });
        if (onCandidates) {
          onCandidates(url, data.candidatePhotos ?? []);
        }
      } else {
        onUpdate(url, { status: 'error' });
      }
    } catch {
      onUpdate(url, { status: 'error' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>7. Competitors</label>

      <div className={styles.inputRow}>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter competitor product URL..."
          className={styles.urlInput}
        />
        <button
          className={styles.confirmButton}
          onClick={handleConfirm}
          disabled={!urlInput.trim()}
          aria-label="Analyze URL"
        >
          &#10003;
        </button>
      </div>

      {competitors.length > 0 && (
        <div className={styles.cardList}>
          {competitors.map((comp) => (
            <div key={comp.url} className={styles.card}>
              {comp.status === 'extracting' && (
                <div className={styles.extracting}>Analyzing...</div>
              )}
              {comp.status === 'error' && (
                <div className={styles.error}>Failed to extract data</div>
              )}
              {comp.status === 'done' && (
                <>
                  <div className={styles.cardHeader}>
                    <strong>{comp.brand}</strong>
                    {comp.cost && <span className={styles.cost}>{comp.cost}</span>}
                  </div>
                  <div className={styles.productName}>{comp.productName}</div>
                  <p className={styles.description}>{comp.description}</p>
                  <a href={comp.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    View product
                  </a>
                  {renderPhotoPicker && renderPhotoPicker(comp)}
                </>
              )}
              {comp.status === 'pending' && (
                <div className={styles.pending}>Waiting...</div>
              )}
              <button
                className={styles.removeButton}
                onClick={() => onRemove(comp.url)}
                aria-label="Remove competitor"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
