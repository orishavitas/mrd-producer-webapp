'use client';

import { useState, useRef } from 'react';
import styles from './kickstart-panel.module.css';

interface KickstartPanelProps {
  onDescribe: (text: string) => void;
  onStartFromScratch: () => void;
  isProcessing?: boolean;
}

export default function KickstartPanel({
  onDescribe,
  onStartFromScratch,
  isProcessing = false,
}: KickstartPanelProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleDescribeClick() {
    setActiveCard('describe');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleSubmitDescription() {
    const trimmed = description.trim();
    if (trimmed) {
      onDescribe(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitDescription();
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardGrid}>
        {/* Option 1: Describe your product */}
        <div
          className={`${styles.optionCard} ${activeCard === 'describe' ? styles.optionCardActive : ''}`}
        >
          {activeCard !== 'describe' ? (
            <button
              type="button"
              className={styles.optionButton}
              onClick={handleDescribeClick}
            >
              <span className={styles.optionIcon} aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="var(--accent-soft)" />
                  <path d="M10 16h12M16 10v12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.optionTitle}>Describe your product</span>
              <span className={styles.optionDescription}>
                Tell us about your product idea and we will help structure it
              </span>
            </button>
          ) : (
            <div className={styles.describeForm}>
              <span className={styles.optionTitle}>Describe your product</span>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell us about your product concept, target market, key features, problems it solves..."
                disabled={isProcessing}
              />
              <button
                type="button"
                className={styles.parseButton}
                onClick={handleSubmitDescription}
                disabled={!description.trim() || isProcessing}
              >
                {isProcessing ? (
                  <span className={styles.spinnerWrapper}>
                    <span className={styles.spinner} aria-hidden="true" />
                    Processing...
                  </span>
                ) : (
                  'Parse & Continue'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Option 2: Upload a document (Coming soon) */}
        <div className={`${styles.optionCard} ${styles.optionCardDisabled}`}>
          <div className={styles.optionButton} aria-disabled="true">
            <span className={styles.optionIcon} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--accent-soft)" />
                <path d="M11 21h10M16 11v7M13 14l3-3 3 3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={styles.optionTitle}>Upload a document</span>
            <span className={styles.optionDescription}>
              Import from a Word doc, PDF, or text file
            </span>
            <span className={styles.comingSoonBadge}>Coming soon</span>
          </div>
          <div className={styles.dropZoneSilhouette} aria-hidden="true">
            <span className={styles.dropZoneText}>Drop file here</span>
          </div>
        </div>

        {/* Option 3: Import from link (Coming soon) */}
        <div className={`${styles.optionCard} ${styles.optionCardDisabled}`}>
          <div className={styles.optionButton} aria-disabled="true">
            <span className={styles.optionIcon} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="var(--accent-soft)" />
                <path d="M13 19l6-6M13 13h.01M19 19h-.01" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                <path d="M15 12l-1-1a3 3 0 00-4.24 4.24l1 1M17 20l1 1a3 3 0 004.24-4.24l-1-1" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className={styles.optionTitle}>Import from link</span>
            <span className={styles.optionDescription}>
              Paste a URL to an existing product page or brief
            </span>
            <span className={styles.comingSoonBadge}>Coming soon</span>
          </div>
          <div className={styles.urlInputSilhouette} aria-hidden="true">
            <span className={styles.urlPlaceholder}>https://...</span>
          </div>
        </div>
      </div>

      {/* Start from scratch link */}
      <div className={styles.scratchRow}>
        <button
          type="button"
          className={styles.scratchLink}
          onClick={onStartFromScratch}
        >
          Start from scratch
        </button>
      </div>
    </div>
  );
}
