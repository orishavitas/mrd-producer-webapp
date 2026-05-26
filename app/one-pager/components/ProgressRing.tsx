'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CompletionSection } from '../lib/one-pager-state';
import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  sections: CompletionSection[];
  skippedSections: Record<string, boolean>;
  version: string;
  isPublished: boolean;
  onToggleSkip: (key: string) => void;
  onTogglePaintSkip: () => void;
  onToggleLogoSkip: () => void;
  paintSkipped: boolean;
  logoSkipped: boolean;
}

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressRing({
  sections,
  skippedSections,
  version,
  isPublished,
  onToggleSkip,
  onTogglePaintSkip,
  onToggleLogoSkip,
  paintSkipped,
  logoSkipped,
}: ProgressRingProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const done = sections.filter((section) => section.done).length;
  const total = sections.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const offset = total > 0 ? CIRCUMFERENCE * (1 - done / total) : CIRCUMFERENCE;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.ringBtn}
        onClick={() => setOpen((value) => !value)}
        aria-label={`${pct}% complete - click to manage sections`}
        aria-expanded={open}
      >
        <svg className={styles.svg} viewBox="0 0 30 30" aria-hidden="true">
          <circle className={styles.track} cx="15" cy="15" r={RADIUS} />
          <circle
            className={styles.fill}
            cx="15"
            cy="15"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
          <text className={styles.pctText} x="15" y="19" textAnchor="middle">
            {pct}%
          </text>
        </svg>
      </button>

      <span className={styles.verBadge} title={isPublished ? 'Published' : 'Draft'}>
        v{version}
      </span>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Section status">
          <div className={styles.panelTitle}>Section Status</div>
          {sections.map((section) => {
            const isSkipped = !!skippedSections[section.key];
            return (
              <div key={section.key} className={styles.row}>
                <span className={section.done ? styles.rowLabelDone : styles.rowLabel}>
                  {section.done ? '✓ ' : ''}
                  {section.label}
                </span>
                {section.skippable && (
                  <button
                    type="button"
                    className={isSkipped ? styles.naBtnActive : styles.naBtn}
                    onClick={() => onToggleSkip(section.key)}
                  >
                    {isSkipped ? '✓ N/A' : 'N/A'}
                  </button>
                )}
              </div>
            );
          })}
          <div className={styles.panelDivider} />
          <div className={styles.row}>
            <span className={paintSkipped ? styles.rowLabelDone : styles.rowLabel}>
              {paintSkipped ? '✓ ' : ''}
              Paint finish
            </span>
            <button
              type="button"
              className={paintSkipped ? styles.naBtnActive : styles.naBtn}
              onClick={onTogglePaintSkip}
              aria-label="Toggle paint finish N/A"
            >
              {paintSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.row}>
            <span className={logoSkipped ? styles.rowLabelDone : styles.rowLabel}>
              {logoSkipped ? '✓ ' : ''}
              Logo
            </span>
            <button
              type="button"
              className={logoSkipped ? styles.naBtnActive : styles.naBtn}
              onClick={onToggleLogoSkip}
              aria-label="Toggle logo N/A"
            >
              {logoSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
