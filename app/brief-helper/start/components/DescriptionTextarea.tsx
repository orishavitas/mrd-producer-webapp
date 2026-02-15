/**
 * Description Textarea Component
 *
 * Large auto-resizing textarea for initial product description.
 * Features:
 * - Auto-resize based on content
 * - Character count display
 * - Max length enforcement
 * - Accessible labeling
 */

'use client';

import { useRef, useEffect } from 'react';
import styles from './DescriptionTextarea.module.css';

// ============================================================================
// Props
// ============================================================================

interface DescriptionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  maxLength: number;
}

// ============================================================================
// Component
// ============================================================================

export default function DescriptionTextarea({
  value,
  onChange,
  onKeyDown,
  maxLength,
}: DescriptionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight (with minimum)
    textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const charCount = value.length;
  const remainingChars = maxLength - charCount;

  return (
    <div className={styles.container}>
      <label htmlFor="product-description" className={styles.label}>
        Product Description
      </label>

      <textarea
        ref={textareaRef}
        id="product-description"
        className={styles.textarea}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        maxLength={maxLength}
        placeholder="Describe your product idea in detail... For example: A tablet stand for retail point-of-sale that supports 10-inch iPads, mounts on countertops, rotates 360 degrees, and includes a cable management system. Target customers are small retail businesses. Minimum order quantity is 100 units."
        aria-describedby="char-count"
      />

      <div className={styles.footer}>
        <span id="char-count" className={styles.charCount} aria-live="polite">
          {charCount} / {maxLength} characters
          {remainingChars < 100 && remainingChars > 0 && (
            <span className={styles.warning}> ({remainingChars} remaining)</span>
          )}
          {remainingChars === 0 && <span className={styles.warning}> (maximum reached)</span>}
        </span>
      </div>
    </div>
  );
}
