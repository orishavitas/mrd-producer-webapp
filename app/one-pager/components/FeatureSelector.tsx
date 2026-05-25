'use client';
import { useState, KeyboardEvent } from 'react';
import styles from './FeatureSelector.module.css';

export interface FeatureCategory {
  id: string;
  label: string;
  features: { id: string; label: string }[];
}

interface FeatureSelectorProps {
  categories: FeatureCategory[];
  mustHave: string[];
  niceToHave: string[];
  onToggle: (label: string, category: 'mustHave' | 'niceToHave') => void;
  onRemove: (label: string, category: 'mustHave' | 'niceToHave') => void;
  onAutoFill?: () => void;
  isAutoFilling?: boolean;
  layout?: 'sideBySide' | 'stacked';
  onLayoutChange?: (layout: 'sideBySide' | 'stacked') => void;
}

type Layout = 'sideBySide' | 'stacked';

export function FeatureSelector({
  categories,
  mustHave,
  niceToHave,
  onToggle,
  onRemove,
  onAutoFill,
  isAutoFilling,
  layout: layoutProp,
  onLayoutChange,
}: FeatureSelectorProps) {
  const [layoutLocal, setLayoutLocal] = useState<Layout>('sideBySide');
  const layout = layoutProp ?? layoutLocal;
  const [customInput, setCustomInput] = useState('');

  function handleChipCycle(label: string) {
    if (mustHave.includes(label)) {
      // must → nice
      onRemove(label, 'mustHave');
      onToggle(label, 'niceToHave');
    } else if (niceToHave.includes(label)) {
      // nice → unselected
      onRemove(label, 'niceToHave');
    } else {
      // unselected → must
      onToggle(label, 'mustHave');
    }
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && customInput.trim()) {
      e.preventDefault();
      onToggle(customInput.trim(), 'mustHave');
      setCustomInput('');
    }
  }

  const FrameContent = ({ category }: { category: 'mustHave' | 'niceToHave' }) => {
    const items = category === 'mustHave' ? mustHave : niceToHave;
    const label = category === 'mustHave' ? 'MUST HAVE' : 'NICE TO HAVE';
    return (
      <div className={styles.frame}>
        <div className={styles.frameHeader}>{label}</div>
        <div className={styles.chipGroup}>
          {items.length === 0 && (
            <span className={styles.emptyHint}>None selected yet</span>
          )}
          {items.map((f) => (
            <span key={f} className={styles.selectedChip}>
              {f}
              <button className={styles.removeChip} onClick={() => onRemove(f, category)}>&times;</button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        {onAutoFill && (
          <button
            className={styles.autoFillButton}
            onClick={onAutoFill}
            disabled={isAutoFilling}
          >
            {isAutoFilling ? 'Filling...' : 'Auto-fill Features'}
          </button>
        )}
      </div>

      {/* Predefined chip palette */}
      <div className={styles.palette}>
        {categories.map((cat) => (
          <div key={cat.id} className={styles.categoryGroup}>
            <div className={styles.categoryLabel}>{cat.label}</div>
            <div className={styles.chipRow}>
              {cat.features.map((f) => {
                const isMust = mustHave.includes(f.label);
                const isNice = niceToHave.includes(f.label);
                return (
                  <div key={f.id} className={styles.chipWrapper}>
                    <button
                      className={`${styles.chip} ${isMust ? styles.chipMust : isNice ? styles.chipNice : ''}`}
                      onClick={() => handleChipCycle(f.label)}
                    >
                      {f.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Other (custom) input */}
        <div className={styles.customRow}>
          <div className={styles.categoryLabel}>Other</div>
          <div className={styles.chipRow}>
            <div className={styles.chipWrapper}>
              <input
                type="text"
                placeholder="Type feature + Enter"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                className={styles.customInput}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Selection frames */}
      <div className={layout === 'sideBySide' ? styles.framesSideBySide : styles.framesStacked}>
        <FrameContent category="mustHave" />
        <FrameContent category="niceToHave" />
      </div>
    </div>
  );
}
