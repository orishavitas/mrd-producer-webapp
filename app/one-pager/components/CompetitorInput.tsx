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
  photoUrls: string[];
  candidatePhotos?: string[];
}

interface CompetitorInputProps {
  competitors: CompetitorEntry[];
  onAdd: (url: string) => void;
  onUpdate: (url: string, data: Partial<CompetitorEntry>) => void;
  onRemove: (url: string) => void;
  onCandidates?: (url: string, candidates: string[]) => void;
  renderPhotoPicker?: (comp: CompetitorEntry) => React.ReactNode;
}

const IcoLink = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1.5 1.5"/>
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1.5-1.5"/>
  </svg>
);

const IcoSearch = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
  </svg>
);

const IcoTrash = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>
  </svg>
);

export default function CompetitorInput({
  competitors,
  onAdd,
  onUpdate,
  onRemove,
  onCandidates,
  renderPhotoPicker,
}: CompetitorInputProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScrape = async () => {
    const url = urlInput.trim();
    if (!url) return;

    onAdd(url);
    setUrlInput('');
    setIsLoading(true);
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
          onCandidates(url, data.data.candidatePhotos ?? []);
        }
      } else {
        onUpdate(url, { status: 'error' });
      }
    } catch {
      onUpdate(url, { status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScrape();
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>7. Competitors</label>

      <div className={styles.inputRow}>
        <div className={styles.urlField}>
          <span className={styles.urlIcon}><IcoLink /></span>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://competitor.com/product"
            className={styles.urlInput}
          />
        </div>
        <button
          className={styles.scrapeButton}
          onClick={handleScrape}
          disabled={!urlInput.trim() || isLoading}
        >
          <IcoSearch />
          {isLoading ? 'Scraping…' : 'Scrape'}
        </button>
      </div>

      {competitors.length > 0 && (
        <div className={styles.list}>
          {competitors.map((comp) => (
            <div key={comp.url} className={styles.row}>
              {/* Remove — absolute top-left */}
              <button
                className={styles.removeBtn}
                onClick={() => onRemove(comp.url)}
                aria-label="Remove competitor"
              >
                <IcoTrash />
              </button>

              {/* Thumbnail */}
              <div className={styles.thumb}>
                {comp.photoUrls?.[0] ? (
                  <img src={comp.photoUrls[0]} alt={comp.productName} className={styles.thumbImg} />
                ) : (
                  <div className={styles.thumbPlaceholder}>
                    <svg viewBox="0 0 80 60" width="80" height="60">
                      <defs>
                        <pattern id={`hatch-${comp.url.slice(-6)}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="3" height="6" fill="currentColor" opacity="0.18"/>
                        </pattern>
                      </defs>
                      <rect width="80" height="60" fill={`url(#hatch-${comp.url.slice(-6)})`}/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className={styles.body}>
                {comp.status === 'extracting' && (
                  <div className={styles.statusLine}>
                    <span className={styles.spinner} />
                    <span className={styles.statusText}>Scraping…</span>
                  </div>
                )}
                {comp.status === 'error' && (
                  <>
                    <div className={styles.brand}>Error</div>
                    <div className={styles.name}>{comp.url}</div>
                    <div className={styles.meta + ' ' + styles.metaError}>Could not extract data</div>
                  </>
                )}
                {(comp.status === 'done' || comp.status === 'pending') && (
                  <>
                    <div className={styles.brand}>{comp.brand || 'Brand'}</div>
                    <div className={styles.name}>{comp.productName || comp.url}</div>
                    <div className={styles.meta}>
                      {comp.cost && <span className={styles.price}>{comp.cost}</span>}
                      {comp.cost && <span className={styles.dot}>·</span>}
                      <span className={styles.url}>{comp.url}</span>
                    </div>
                  </>
                )}
                {comp.status === 'done' && renderPhotoPicker && (
                  <div className={styles.photoPicker}>{renderPhotoPicker(comp)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
