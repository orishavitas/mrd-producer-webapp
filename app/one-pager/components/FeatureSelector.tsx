'use client';
import { useRef, useState, KeyboardEvent } from 'react';
import styles from './FeatureSelector.module.css';
import type { OnePagerState, OnePagerAction } from '../lib/one-pager-state';

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
  customization: OnePagerState['customization'];
  dispatch: React.Dispatch<OnePagerAction>;
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
  customization,
  dispatch,
  layout: layoutProp,
  onLayoutChange,
}: FeatureSelectorProps) {
  const [layoutLocal, setLayoutLocal] = useState<Layout>('sideBySide');
  const layout = layoutProp ?? layoutLocal;
  function setLayout(l: Layout) { setLayoutLocal(l); onLayoutChange?.(l); }
  const [popover, setPopover] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              {popover?.startsWith('__custom__') && (
                <div className={styles.popover}>
                  <button onClick={() => { handleAddToCategory(customInput.trim(), 'mustHave'); setCustomInput(''); }}>Must Have</button>
                  <button onClick={() => { handleAddToCategory(customInput.trim(), 'niceToHave'); setCustomInput(''); }}>Nice to Have</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Custom Logo & Color ─────────────────────────────────── */}
        <div className={styles.customizationSection}>
          <div className={styles.categoryLabel}>Custom Logo &amp; Color</div>

          {/* Logo upload */}
          <div className={styles.custRow}>
            <span className={styles.custLabel}>Logo file</span>
            <div className={styles.custField}>
              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                {customization.logoFileName ? customization.logoFileName : 'Upload logo…'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.ai,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) dispatch({ type: 'SET_LOGO_FILE', payload: file.name });
                }}
              />
              <span className={styles.custHint}>Vector only (SVG, AI, PDF)</span>
            </div>
          </div>

          {/* Logo colors */}
          <div className={styles.custRow}>
            <span className={styles.custLabel}>Logo color(s)</span>
            <div className={styles.custField}>
              {customization.logoColors.map((lc, i) => (
                <div key={i} className={styles.colorEntry}>
                  <select
                    className={styles.colorModeSelect}
                    value={lc.mode}
                    onChange={(e) => dispatch({ type: 'UPDATE_LOGO_COLOR', payload: { index: i, mode: e.target.value as 'CMYK' | 'Pantone' } })}
                  >
                    <option value="CMYK">CMYK</option>
                    <option value="Pantone">Pantone</option>
                  </select>
                  <input
                    className={styles.colorValueInput}
                    type="text"
                    value={lc.value}
                    placeholder={lc.mode === 'CMYK' ? 'e.g. 0, 0, 0, 100' : 'e.g. PMS 295 C'}
                    onChange={(e) => dispatch({ type: 'UPDATE_LOGO_COLOR', payload: { index: i, value: e.target.value } })}
                  />
                  <button className={styles.removeColorBtn} onClick={() => dispatch({ type: 'REMOVE_LOGO_COLOR', payload: i })}>&times;</button>
                </div>
              ))}
              <button
                className={styles.addColorBtn}
                onClick={() => dispatch({ type: 'ADD_LOGO_COLOR', payload: { mode: 'CMYK', value: '' } })}
              >+ Add color</button>
            </div>
          </div>
        </div>

        {/* ── Product Paint ───────────────────────────────────────── */}
        <div className={styles.customizationSection}>
          <div className={styles.categoryLabel}>Product Paint</div>

          {/* Finish selector */}
          <div className={styles.custRow}>
            <span className={styles.custLabel}>Finish</span>
            <div className={styles.finishChips}>
              {(['gloss', 'satin', 'matte', 'textured'] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.finishChip} ${customization.paint.finish === f ? styles.finishChipActive : ''}`}
                  onClick={() => dispatch({ type: 'SET_PAINT_FINISH', payload: customization.paint.finish === f ? '' : f })}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color — only for gloss/satin */}
          {(customization.paint.finish === 'gloss' || customization.paint.finish === 'satin') && (
            <div className={styles.custRow}>
              <span className={styles.custLabel}>RAL code</span>
              <input
                className={styles.colorValueInput}
                type="text"
                value={customization.paint.color}
                placeholder="e.g. RAL 9005"
                onChange={(e) => dispatch({ type: 'SET_PAINT_COLOR', payload: e.target.value })}
              />
            </div>
          )}

          {/* Color — matte/textured: only black or white */}
          {(customization.paint.finish === 'matte' || customization.paint.finish === 'textured') && (
            <div className={styles.custRow}>
              <span className={styles.custLabel}>Color</span>
              <div className={styles.finishChips}>
                {(['Black', 'White'] as const).map((c) => (
                  <button
                    key={c}
                    className={`${styles.finishChip} ${customization.paint.color === c ? styles.finishChipActive : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAINT_COLOR', payload: customization.paint.color === c ? '' : c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Free text description — always visible when finish is selected */}
          {customization.paint.finish && (
            <div className={styles.custRow}>
              <span className={styles.custLabel}>Description</span>
              <input
                className={styles.colorValueInput}
                type="text"
                value={customization.paint.description}
                placeholder="Any additional paint notes…"
                onChange={(e) => dispatch({ type: 'SET_PAINT_DESCRIPTION', payload: e.target.value })}
              />
            </div>
          )}
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
