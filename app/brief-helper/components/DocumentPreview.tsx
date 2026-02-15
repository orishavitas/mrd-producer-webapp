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

import { useEffect, useRef } from 'react';
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
        <h1 className={styles.title}>Product Brief</h1>
        <p className={styles.subtitle}>
          Generated on {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
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
