'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ExportMenu.module.css';

interface ExportMenuProps {
  onExport: (format: 'docx' | 'html' | 'pdf') => void;
  onPublish: () => void;
  onUnpublish: () => void;
  isPublished: boolean;
  isWorking: boolean;
  exportingFormat: string | null;
  isPublishing: boolean;
}

export default function ExportMenu({
  onExport,
  onPublish,
  onUnpublish,
  isPublished,
  isWorking,
  exportingFormat,
  isPublishing,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        disabled={isWorking}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {exportingFormat ? 'Exporting...' : 'Export'}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button role="menuitem" className={styles.item} onClick={() => run(() => onExport('docx'))}>
            Download DOCX
          </button>
          <button role="menuitem" className={styles.item} onClick={() => run(() => onExport('html'))}>
            Download HTML
          </button>
          <button role="menuitem" className={styles.item} onClick={() => run(() => onExport('pdf'))}>
            Print / PDF
          </button>
          <div className={styles.divider} />
          <button
            role="menuitem"
            className={isPublished ? styles.item : styles.publishItem}
            onClick={() => run(isPublished ? onUnpublish : onPublish)}
            disabled={isPublishing}
          >
            {isPublishing ? 'Publishing...' : isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      )}
    </div>
  );
}
