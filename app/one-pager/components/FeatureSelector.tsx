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
  const [customInput, setCustomInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allSelected = new Set([...mustHave, ...niceToHave]);

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

        {/* ── Custom Logo & Color ─────────────────────────────────── */}
        <div className={styles.customizationSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className={styles.categoryLabel}>Custom Logo &amp; Color</div>
            <button
              className={customization.logoSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_LOGO_SKIPPED', payload: !customization.logoSkipped })}
            >
              {customization.logoSkipped ? '↩ Mark as relevant' : 'Not relevant'}
            </button>
          </div>

          {!customization.logoSkipped && (
            <>
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
            </>
          )}
        </div>

        {/* ── Product Paint ───────────────────────────────────────── */}
        <div className={styles.customizationSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className={styles.categoryLabel}>Product Paint</div>
            <button
              className={customization.paintSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_PAINT_SKIPPED', payload: !customization.paintSkipped })}
            >
              {customization.paintSkipped ? '↩ Mark as relevant' : 'Not relevant'}
            </button>
          </div>

          {!customization.paintSkipped && (
            <>
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
                  <span className={styles.custLabel}>RAL code(s)</span>
                  <div className={styles.custField}>
                    {customization.paint.colors.map((c, i) => (
                      <div key={i} className={styles.colorEntry}>
                        <input
                          className={styles.colorValueInput}
                          type="text"
                          value={c}
                          placeholder="e.g. RAL 9005"
                          onChange={(e) => {
                            const updated = [...customization.paint.colors];
                            updated[i] = e.target.value;
                            dispatch({ type: 'REMOVE_PAINT_COLOR', payload: i });
                            dispatch({ type: 'ADD_PAINT_COLOR', payload: e.target.value });
                          }}
                        />
                        <button className={styles.removeColorBtn} onClick={() => dispatch({ type: 'REMOVE_PAINT_COLOR', payload: i })}>&times;</button>
                      </div>
                    ))}
                    <button
                      className={styles.addColorBtn}
                      onClick={() => dispatch({ type: 'ADD_PAINT_COLOR', payload: '' })}
                    >+ Add RAL code</button>
                  </div>
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
                        className={`${styles.finishChip} ${customization.paint.colors.includes(c) ? styles.finishChipActive : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_PAINT_COLOR', payload: c })}
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
            </>
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
