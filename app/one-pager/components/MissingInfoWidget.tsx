'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompletionSection } from '../lib/one-pager-state';
import styles from './MissingInfoWidget.module.css';

interface MissingInfoWidgetProps {
  sections: CompletionSection[];
  onToggleSkip: (key: string) => void;
  onTogglePaintSkip: () => void;
  onToggleLogoSkip: () => void;
}

export default function MissingInfoWidget({
  sections,
  onToggleSkip,
  onTogglePaintSkip,
  onToggleLogoSkip,
}: MissingInfoWidgetProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const doneCount = sections.filter((s) => s.done).length;
  const totalCount = sections.length;
  const allDone = doneCount === totalCount;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleSkipToggle(key: string) {
    if (key === 'paint') { onTogglePaintSkip(); return; }
    if (key === 'logo') { onToggleLogoSkip(); return; }
    onToggleSkip(key);
  }

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Trigger pill */}
      <button
        type="button"
        className={`${styles.trigger} ${allDone ? styles.triggerDone : styles.triggerIncomplete}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Show completion status"
      >
        <span className={styles.triggerIcon}>{allDone ? '✓' : '!'}</span>
        <span className={styles.triggerLabel}>{doneCount}/{totalCount}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Section completion">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Completion</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <ul className={styles.list}>
            {sections.map((section) => (
              <li key={section.key} className={styles.row}>
                {/* Status icon */}
                <span
                  className={
                    section.done
                      ? styles.iconDone
                      : styles.iconMissing
                  }
                  aria-hidden="true"
                >
                  {section.done ? '✓' : '●'}
                </span>

                {/* Label */}
                <span className={`${styles.label} ${section.done ? styles.labelDone : ''}`}>
                  {section.label}
                </span>

                {/* Not relevant checkbox */}
                {section.skippable && !section.done && (
                  <label className={styles.skipLabel}>
                    <input
                      type="checkbox"
                      className={styles.skipCheck}
                      checked={false}
                      onChange={() => handleSkipToggle(section.key)}
                      aria-label={`Mark ${section.label} as not relevant`}
                    />
                    <span className={styles.skipText}>N/A</span>
                  </label>
                )}
                {section.skippable && section.done && (
                  <span className={styles.doneChip}>done</span>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>
            Check <strong>N/A</strong> to mark a section as not relevant — it will be skipped in validation.
          </p>
        </div>
      )}
    </div>
  );
}
