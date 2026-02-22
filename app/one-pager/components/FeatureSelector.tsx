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
}

type Layout = 'sideBySide' | 'stacked';

export function FeatureSelector({
  categories,
  mustHave,
  niceToHave,
  onToggle,
  onRemove,
}: FeatureSelectorProps) {
  const [layout, setLayout] = useState<Layout>('sideBySide');
  const [popover, setPopover] = useState<string | null>(null); // feature label
  const [customInput, setCustomInput] = useState('');

  const allSelected = new Set([...mustHave, ...niceToHave]);

  function handleChipClick(label: string) {
    if (allSelected.has(label)) {
      // Already selected — remove from whichever list it's in
      if (mustHave.includes(label)) onRemove(label, 'mustHave');
      else onRemove(label, 'niceToHave');
      setPopover(null);
    } else {
      setPopover(popover === label ? null : label);
    }
  }

  function handleAddToCategory(label: string, cat: 'mustHave' | 'niceToHave') {
    onToggle(label, cat);
    setPopover(null);
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && customInput.trim()) {
      e.preventDefault();
      setPopover(`__custom__${customInput.trim()}`);
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
        <button
          className={layout === 'sideBySide' ? styles.layoutBtnActive : styles.layoutBtn}
          onClick={() => setLayout('sideBySide')}
        >Side by side</button>
        <button
          className={layout === 'stacked' ? styles.layoutBtnActive : styles.layoutBtn}
          onClick={() => setLayout('stacked')}
        >Stacked</button>
      </div>

      {/* Predefined chip palette */}
      <div className={styles.palette}>
        {categories.map((cat) => (
          <div key={cat.id} className={styles.categoryGroup}>
            <div className={styles.categoryLabel}>{cat.label}</div>
            <div className={styles.chipRow}>
              {cat.features.map((f) => {
                const isSelected = allSelected.has(f.label);
                const isMust = mustHave.includes(f.label);
                return (
                  <div key={f.id} className={styles.chipWrapper}>
                    <button
                      className={`${styles.chip} ${isSelected ? (isMust ? styles.chipMust : styles.chipNice) : ''}`}
                      onClick={() => handleChipClick(f.label)}
                    >
                      {f.label}
                    </button>
                    {popover === f.label && (
                      <div className={styles.popover}>
                        <button onClick={() => handleAddToCategory(f.label, 'mustHave')}>Must Have</button>
                        <button onClick={() => handleAddToCategory(f.label, 'niceToHave')}>Nice to Have</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom input */}
        <div className={styles.customRow}>
          <div className={styles.categoryLabel}>Custom</div>
          <div className={styles.chipRow}>
            <input
              type="text"
              placeholder="Type feature + Enter"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              className={styles.customInput}
            />
            {popover?.startsWith('__custom__') && (
              <div className={styles.popover}>
                <button onClick={() => { handleAddToCategory(customInput.trim(), 'mustHave'); setCustomInput(''); }}>Must Have</button>
                <button onClick={() => { handleAddToCategory(customInput.trim(), 'niceToHave'); setCustomInput(''); }}>Nice to Have</button>
              </div>
            )}
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
