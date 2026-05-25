'use client';
import { useRef } from 'react';
import type { OnePagerState, OnePagerAction } from '../lib/one-pager-state';
import styles from './ProductInfoCustomization.module.css';

interface Props {
  customization: OnePagerState['customization'];
  dispatch: React.Dispatch<OnePagerAction>;
}

const FINISH_OPTIONS = ['gloss', 'satin', 'matte', 'textured', 'clear'] as const;

export default function ProductInfoCustomization({ customization, dispatch }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.root}>
      {/* ── Paint, Texture & Logo ── */}
      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <span className={styles.subSectionLabel}>Paint, Texture &amp; Logo</span>
        </div>

        {/* Paint */}
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <span className={styles.blockLabel}>Paint / Finish</span>
            <button
              className={customization.paintSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_PAINT_SKIPPED', payload: !customization.paintSkipped })}
            >
              {customization.paintSkipped ? '↩ Relevant' : 'Not relevant'}
            </button>
          </div>

          {!customization.paintSkipped && (
            <>
              <div className={styles.finishChips}>
                {FINISH_OPTIONS.map((f) => (
                  <button
                    key={f}
                    className={`${styles.finishChip} ${customization.paint.finish === f ? styles.finishChipActive : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAINT_FINISH', payload: customization.paint.finish === f ? '' : f })}
                  >
                    {f === 'clear' ? 'Clear (no paint)' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Clear overrides everything — just a note */}
              {customization.paint.finish === 'clear' && (
                <p className={styles.clearNote}>Clear finish selected — no paint color required.</p>
              )}

              {/* RAL codes for gloss/satin */}
              {(customization.paint.finish === 'gloss' || customization.paint.finish === 'satin') && (
                <div className={styles.colorRow}>
                  <span className={styles.rowLabel}>RAL code(s)</span>
                  <div className={styles.colorList}>
                    {customization.paint.colors.map((c, i) => (
                      <div key={i} className={styles.colorEntry}>
                        <input
                          className={styles.colorInput}
                          type="text"
                          value={c}
                          placeholder="e.g. RAL 9005"
                          onChange={(e) => {
                            dispatch({ type: 'REMOVE_PAINT_COLOR', payload: i });
                            dispatch({ type: 'ADD_PAINT_COLOR', payload: e.target.value });
                          }}
                        />
                        <button className={styles.removeBtn} onClick={() => dispatch({ type: 'REMOVE_PAINT_COLOR', payload: i })}>&times;</button>
                      </div>
                    ))}
                    <button className={styles.addBtn} onClick={() => dispatch({ type: 'ADD_PAINT_COLOR', payload: '' })}>+ Add RAL code</button>
                  </div>
                </div>
              )}

              {/* Black/White for matte/textured */}
              {(customization.paint.finish === 'matte' || customization.paint.finish === 'textured') && (
                <div className={styles.colorRow}>
                  <span className={styles.rowLabel}>Color</span>
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

              {/* Free-text description (when finish selected and not clear) */}
              {customization.paint.finish && customization.paint.finish !== 'clear' && (
                <div className={styles.colorRow}>
                  <span className={styles.rowLabel}>Notes</span>
                  <input
                    className={styles.colorInput}
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

        {/* Logo */}
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <span className={styles.blockLabel}>Logo &amp; Brand Colors</span>
            <button
              className={customization.logoSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_LOGO_SKIPPED', payload: !customization.logoSkipped })}
            >
              {customization.logoSkipped ? '↩ Relevant' : 'Not relevant'}
            </button>
          </div>

          {!customization.logoSkipped && (
            <>
              <div className={styles.colorRow}>
                <span className={styles.rowLabel}>Logo file</span>
                <div className={styles.uploadWrap}>
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
                  <span className={styles.hint}>Vector only (SVG, AI, PDF)</span>
                </div>
              </div>

              <div className={styles.colorRow}>
                <span className={styles.rowLabel}>Logo color(s)</span>
                <div className={styles.colorList}>
                  {customization.logoColors.map((lc, i) => (
                    <div key={i} className={styles.colorEntry}>
                      <select
                        className={styles.modeSelect}
                        value={lc.mode}
                        onChange={(e) => dispatch({ type: 'UPDATE_LOGO_COLOR', payload: { index: i, mode: e.target.value as 'CMYK' | 'Pantone' } })}
                      >
                        <option value="CMYK">CMYK</option>
                        <option value="Pantone">Pantone</option>
                      </select>
                      <input
                        className={styles.colorInput}
                        type="text"
                        value={lc.value}
                        placeholder={lc.mode === 'CMYK' ? 'e.g. 0, 0, 0, 100' : 'e.g. PMS 295 C'}
                        onChange={(e) => dispatch({ type: 'UPDATE_LOGO_COLOR', payload: { index: i, value: e.target.value } })}
                      />
                      <button className={styles.removeBtn} onClick={() => dispatch({ type: 'REMOVE_LOGO_COLOR', payload: i })}>&times;</button>
                    </div>
                  ))}
                  <button
                    className={styles.addBtn}
                    onClick={() => dispatch({ type: 'ADD_LOGO_COLOR', payload: { mode: 'CMYK', value: '' } })}
                  >+ Add color</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Material (nice-to-have) */}
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <span className={styles.blockLabel}>Material <span className={styles.optional}>(optional)</span></span>
          </div>
          <input
            className={styles.colorInput}
            type="text"
            value={customization.material}
            placeholder="e.g. Aluminum, ABS plastic, stainless steel…"
            onChange={(e) => dispatch({ type: 'SET_MATERIAL', payload: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
