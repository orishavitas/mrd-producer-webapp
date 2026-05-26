'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './OverflowMenu.module.css';

interface OverflowMenuProps {
  onReset: () => void;
  isAdmin: boolean;
  documentId: string | null;
  onShowVersionHistory: () => void;
}

export default function OverflowMenu({
  onReset,
  isAdmin,
  documentId,
  onShowVersionHistory,
}: OverflowMenuProps) {
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
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ...
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <Link href="/" role="menuitem" className={styles.linkItem}>
            Home
          </Link>
          <button role="menuitem" className={styles.item} onClick={() => run(onReset)}>
            Reset form
          </button>
          {isAdmin && documentId && (
            <button role="menuitem" className={styles.item} onClick={() => run(onShowVersionHistory)}>
              Version History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
