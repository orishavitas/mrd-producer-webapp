'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './results.module.css';

interface Source {
  title: string;
  url: string;
}

interface MRDResultData {
  mrd: string;
  sources: Source[];
  productName: string;
}

const SESSION_KEY = 'mrd-result';

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<MRDResultData | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read MRD result from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MRDResultData;
        if (parsed.mrd) {
          setData(parsed);
        }
      }
    } catch {
      // sessionStorage unavailable or corrupted - show empty state
    }
  }, []);

  const downloadDocument = useCallback(
    async (format: 'docx' | 'html' | 'pdf') => {
      if (!data) return;

      setIsDownloading(format);
      setError(null);

      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            markdown: data.mrd,
            format,
            productName: (data.productName || 'MRD').slice(0, 50),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate document');
        }

        if (format === 'pdf') {
          // Open HTML in new window for printing
          const json = await response.json();
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(json.html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
        } else {
          // Download as blob for DOCX / HTML
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = (data.productName || 'MRD')
            .replace(/[^a-zA-Z0-9]/g, '-')
            .slice(0, 30);
          a.download = `MRD-${safeName}-${Date.now()}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to download document'
        );
      } finally {
        setIsDownloading(null);
      }
    },
    [data]
  );

  function handleStartNew() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    router.push('/intake');
  }

  // ── Empty state: user navigated here directly ──
  if (!data) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>No MRD generated yet</h2>
          <p className={styles.emptyText}>
            Complete the intake flow to generate your Market Requirements
            Document.
          </p>
          <Link href="/intake" className={styles.emptyLink}>
            &larr; Back to intake
          </Link>
        </div>
      </div>
    );
  }

  // ── Results view ──
  return (
    <div className={styles.container}>
      {/* Header area */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Generated MRD</h2>
          <p className={styles.subtitle}>
            Your Market Requirements Document is ready.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {/* Download / action bar */}
      <div className={styles.actionBar}>
        <div className={styles.downloadGroup}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => downloadDocument('docx')}
            disabled={isDownloading !== null}
          >
            {isDownloading === 'docx' ? 'Downloading...' : 'Download Word'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => downloadDocument('pdf')}
            disabled={isDownloading !== null}
          >
            {isDownloading === 'pdf' ? 'Preparing...' : 'Print / PDF'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => downloadDocument('html')}
            disabled={isDownloading !== null}
          >
            {isDownloading === 'html' ? 'Downloading...' : 'Download HTML'}
          </button>
        </div>

        <div className={styles.navGroup}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => router.push('/intake')}
          >
            Refine inputs
          </button>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={handleStartNew}
          >
            Start new MRD
          </button>
        </div>
      </div>

      {/* Sources panel */}
      {data.sources.length > 0 && (
        <div className={styles.sourcesPanel}>
          <strong className={styles.sourcesHeading}>Research Sources</strong>
          <ul className={styles.sourcesList}>
            {data.sources.map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MRD body */}
      <div className={styles.mrdBody}>{data.mrd}</div>
    </div>
  );
}
