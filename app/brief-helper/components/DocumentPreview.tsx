/**
 * Document Preview Component
 *
 * Clean formatted document view showing completed brief.
 *
 * Features:
 * - Section headers for each field (What, Who, Where, MOQ, Must-Haves, Nice-to-Haves)
 * - Bullets as unordered lists
 * - Incomplete fields show "—" (em dash placeholder)
 * - Professional typography using document preview tokens
 * - Print-ready styling
 * - Max width: 800px
 * - Auto-scroll to active section
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useBriefContext } from '../lib/brief-context';
import { BriefField } from '../lib/brief-state';
import { getFieldLabel } from '../lib/field-definitions';
import styles from './DocumentPreview.module.css';

// ============================================================================
// Component
// ============================================================================

export default function DocumentPreview() {
  const { state } = useBriefContext();
  const activeFieldRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const getIncludedBullets = (field: typeof state.fields.what): string[] => {
        const included = field.includedBullets ?? field.bulletPoints.map(() => true);
        return field.bulletPoints.filter((_, i) => included[i] !== false);
      };
      const fields: Record<BriefField, string[]> = {
        what: getIncludedBullets(state.fields.what),
        who: getIncludedBullets(state.fields.who),
        where: getIncludedBullets(state.fields.where),
        moq: getIncludedBullets(state.fields.moq),
        'must-have': getIncludedBullets(state.fields['must-have']),
        'nice-to-have': getIncludedBullets(state.fields['nice-to-have']),
      };
      const res = await fetch('/api/brief/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          productName: state.initialDescription?.slice(0, 80) || 'Product Brief',
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brief-${state.initialDescription?.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40) || 'Document'}-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Auto-scroll to active field section when it changes
  useEffect(() => {
    if (state.activeFieldId && activeFieldRef.current) {
      activeFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [state.activeFieldId]);

  // Field definitions for rendering in order
  const fields: Array<{ id: BriefField; label: string }> = [
    { id: 'what', label: 'What - Product Description' },
    { id: 'who', label: 'Who - Target Users/Customers' },
    { id: 'where', label: 'Where - Use Environment' },
    { id: 'moq', label: 'MOQ - Minimum Order Quantity' },
    { id: 'must-have', label: 'Must-Have Features' },
    { id: 'nice-to-have', label: 'Nice-to-Have Features' },
  ];

  return (
    <div className={styles.container}>
      {/* Document Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Product Brief</h1>
          <p className={styles.subtitle}>
            Generated on {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        <button
          type="button"
          className={styles.exportButton}
          onClick={handleExport}
          disabled={exporting}
          aria-label="Export as Word document"
        >
          {exporting ? 'Exporting…' : 'Export DOCX'}
        </button>
      </header>

      {/* Document Content */}
      <div className={styles.content}>
        {fields.map((field) => {
          const fieldState = state.fields[field.id];
          const isActive = state.activeFieldId === field.id;
          const hasContent = fieldState.bulletPoints.length > 0;

          return (
            <section
              key={field.id}
              ref={isActive ? activeFieldRef : null}
              className={`${styles.section} ${isActive ? styles.activeSection : ''}`}
            >
              <h2 className={styles.sectionTitle}>{field.label}</h2>

              {hasContent ? (
                <ul className={styles.bulletList}>
                  {fieldState.bulletPoints.map((bullet, index) => (
                    <li key={index} className={styles.bulletItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.placeholder}>—</p>
              )}
            </section>
          );
        })}
      </div>

      {/* Document Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Generated with Brief Helper • MRD Producer
        </p>
      </footer>
    </div>
  );
}
