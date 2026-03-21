'use client';

import { useState } from 'react';
import styles from './TextFieldWithExpand.module.css';

interface TextFieldWithExpandProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  field: string;
}

export default function TextFieldWithExpand({
  label,
  value,
  onChange,
  placeholder,
  field,
}: TextFieldWithExpandProps) {
  const [expandedText, setExpandedText] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleExpand = async () => {
    if (value.trim().length < 10) return;
    setIsExpanding(true);
    setIsPanelOpen(true);

    try {
      const response = await fetch('/api/one-pager/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, field }),
      });
      const data = await response.json();
      if (data.expanded) {
        setExpandedText(data.expanded);
      }
    } catch (error) {
      console.error('Expand failed:', error);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleUpdate = () => {
    onChange(expandedText);
    setIsPanelOpen(false);
    setExpandedText('');
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
      />
      <button
        className={styles.expandButton}
        onClick={handleExpand}
        disabled={value.trim().length < 10 || isExpanding}
      >
        {isExpanding ? 'Expanding...' : 'Expand with AI'}
      </button>

      {isPanelOpen && (
        <div className={styles.expandPanel}>
          {isExpanding ? (
            <div className={styles.loading}>Generating expanded text...</div>
          ) : (
            <>
              <div className={styles.expandedText}>{expandedText}</div>
              <div className={styles.panelActions}>
                <button className={styles.updateButton} onClick={handleUpdate}>
                  Update Text
                </button>
                <button
                  className={styles.closeButton}
                  onClick={() => setIsPanelOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
