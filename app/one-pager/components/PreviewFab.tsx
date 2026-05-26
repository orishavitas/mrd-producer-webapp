'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './PreviewFab.module.css';

interface PreviewFabProps {
  previewOpen: boolean;
  onToggle: () => void;
  getStateJson: () => string;
}

const STORAGE_KEY = 'op-preview-mode';

export default function PreviewFab({ previewOpen, onToggle, getStateJson }: PreviewFabProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPrompt) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPrompt(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showPrompt]);

  function openPreviewInNewTab() {
    const form = document.createElement('form');
    form.method = 'POST';
    form.target = '_blank';
    form.action = '/api/one-pager/export?format=html';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '__json__';
    input.value = getStateJson();
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  function chooseMode(mode: 'split' | 'tab') {
    localStorage.setItem(STORAGE_KEY, mode);
    setShowPrompt(false);
    if (mode === 'split') onToggle();
    else openPreviewInNewTab();
  }

  function handleClick() {
    if (window.innerWidth >= 1024) {
      onToggle();
      return;
    }

    const storedMode = localStorage.getItem(STORAGE_KEY);
    if (storedMode === 'split') {
      onToggle();
      return;
    }
    if (storedMode === 'tab') {
      openPreviewInNewTab();
      return;
    }
    setShowPrompt(true);
  }

  return (
    <div className={styles.container} ref={containerRef}>
      {showPrompt && (
        <div className={styles.prompt}>
          <div className={styles.promptTitle}>How do you want to view the preview?</div>
          <div className={styles.promptBtns}>
            <button type="button" className={styles.promptBtn} onClick={() => chooseMode('split')}>
              Split view
            </button>
            <button type="button" className={styles.promptBtnSecondary} onClick={() => chooseMode('tab')}>
              New tab
            </button>
          </div>
          <button type="button" className={styles.promptForget} onClick={() => setShowPrompt(false)}>
            Cancel
          </button>
        </div>
      )}
      <button
        type="button"
        className={styles.fab}
        onClick={handleClick}
        aria-pressed={previewOpen}
      >
        {previewOpen ? 'Close Preview' : 'Preview'}
      </button>
    </div>
  );
}
