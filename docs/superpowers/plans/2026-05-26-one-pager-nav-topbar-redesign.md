# One-Pager Nav + Top Bar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the One-Pager's cluttered top bar and horizontal pill nav with a clean 52px 3-zone bar, a floating preview FAB, and a clipping section nav that only expands the active ± 1 sections.

**Architecture:** Five new focused components (`ProgressRing`, `ExportMenu`, `OverflowMenu`, `PreviewFab`, updated `SectionNavMenu`) replace the monolithic bar row in `OnePagerClient`. `SplitLayout` gains a horizontal split mode for portrait preview. `OnePagerTopBar` is rebuilt as a pure 3-zone layout bar — it no longer contains any action buttons.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.3, CSS Modules, existing `--op-*` design tokens in `app/one-pager/one-pager-tokens.css`.

**Spec:** `docs/superpowers/specs/2026-05-26-one-pager-nav-topbar-redesign.md`

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `app/one-pager/components/SectionNavMenu.tsx` | Add `completionSections` prop; render circles vs pills |
| Modify | `app/one-pager/components/SectionNavMenu.module.css` | Add circle, done, tooltip styles |
| Create | `app/one-pager/components/ProgressRing.tsx` | SVG ring + N/A dropdown panel |
| Create | `app/one-pager/components/ProgressRing.module.css` | Ring + panel styles |
| Create | `app/one-pager/components/ExportMenu.tsx` | Export ▾ dropdown (DOCX/HTML/PDF/Publish) |
| Create | `app/one-pager/components/ExportMenu.module.css` | Dropdown styles |
| Create | `app/one-pager/components/OverflowMenu.tsx` | ··· dropdown (Home/Reset/Version History) |
| Create | `app/one-pager/components/OverflowMenu.module.css` | Dropdown styles |
| Create | `app/one-pager/components/PreviewFab.tsx` | Floating preview button + responsive mode logic |
| Create | `app/one-pager/components/PreviewFab.module.css` | FAB styles |
| Modify | `app/one-pager/components/OnePagerTopBar.tsx` | Rebuild as 3-zone bar accepting new component props |
| Modify | `app/one-pager/components/OnePagerTopBar.module.css` | 3-zone layout styles |
| Modify | `app/one-pager/components/SplitLayout.tsx` | Add `splitDirection` prop ('horizontal'|'vertical'); render top/bottom mode |
| Modify | `app/one-pager/components/SplitLayout.module.css` | Horizontal split styles |
| Modify | `app/one-pager/OnePagerClient.tsx` | Remove old bar row; wire all new components |
| Modify | `app/one-pager/page.module.css` | Remove `.barRow`, `.barLeft`, `.barRight`, `.progressWrap` |

---

## Task 1: Update SectionNavMenu — Clipping + Done States

**Files:**
- Modify: `app/one-pager/components/SectionNavMenu.tsx`
- Modify: `app/one-pager/components/SectionNavMenu.module.css`

### What changes

The nav currently renders every section as a full labeled pill. After this task:
- Only the active section and its immediate neighbors (±1) render as labeled pills.
- All other sections render as small numbered circles.
- Done sections (from `completionSections` prop) get a green style on both pills and circles.
- Circles show a hover tooltip with the section name.
- Skipped sections stay dimmed (existing behavior).

- [ ] **Step 1: Add `completionSections` prop to SectionNavMenu**

Open `app/one-pager/components/SectionNavMenu.tsx`. Change the props interface:

```tsx
import type { CompletionSection } from '../lib/one-pager-state';

interface SectionNavMenuProps {
  skippedSections: Record<string, boolean>;
  completionSections: CompletionSection[];  // ADD THIS
}
```

- [ ] **Step 2: Derive a done-set from completionSections**

Inside the component function, before the return, add:

```tsx
const doneKeys = new Set(
  completionSections.filter(s => s.done).map(s => s.key)
);
```

- [ ] **Step 3: Determine which sections render as pills vs circles**

Replace the existing `return` JSX. The rule: pills for `[prevIndex, activeIndex, nextIndex]`, circles for everything else.

```tsx
const activeIndex = NAV_SECTIONS.findIndex(s => s.key === activeSection);

return (
  <nav className={styles.nav} aria-label="Section navigation">
    <div className={styles.pills}>
      {NAV_SECTIONS.map(({ key, label, number }, idx) => {
        const isActive = activeSection === key;
        const isDone = doneKeys.has(key);
        const isDimmed = !!skippedSections[key];
        const isNeighbor =
          activeIndex >= 0 &&
          (idx === activeIndex - 1 || idx === activeIndex + 1);
        const showAsPill = isActive || isNeighbor || activeIndex < 0;

        if (showAsPill) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => scrollTo(key)}
              aria-current={isActive ? 'true' : undefined}
              className={
                isDimmed
                  ? styles.pillDimmed
                  : isActive
                  ? styles.pillActive
                  : isDone
                  ? styles.pillDone
                  : styles.pill
              }
            >
              {number && <span className={styles.pillNumber}>{number}</span>}
              {label}
            </button>
          );
        }

        // Circle
        return (
          <button
            key={key}
            type="button"
            onClick={() => scrollTo(key)}
            className={
              isDimmed
                ? styles.circDimmed
                : isDone
                ? styles.circDone
                : styles.circ
            }
            aria-label={`Go to section ${label}`}
          >
            <span className={styles.circTooltip}>{label}</span>
            {number ?? '·'}
          </button>
        );
      })}
    </div>
  </nav>
);
```

- [ ] **Step 4: Add circle + done + tooltip styles to SectionNavMenu.module.css**

Append to the end of `app/one-pager/components/SectionNavMenu.module.css`:

```css
/* ── Numbered circle (non-neighbor sections) ── */
.circ {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--op-outline);
  background: transparent;
  color: var(--op-on-surface-muted);
  font-family: var(--op-font-heading);
  font-size: var(--op-fs-xs);
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.circ:hover {
  border-color: var(--op-primary);
  color: var(--op-primary);
}
.circ:hover .circTooltip {
  display: block;
}

.circDone {
  composes: circ;
  border-color: var(--op-accent);
  background: var(--op-accent-soft, rgba(0,153,102,0.10));
  color: var(--op-accent);
}
.circDone:hover {
  border-color: var(--op-accent-hover, #007a52);
  color: var(--op-accent-hover, #007a52);
}

.circDimmed {
  composes: circ;
  opacity: 0.38;
}

/* ── Done pill ── */
.pillDone {
  composes: pill;
  border-color: var(--op-accent);
  background: var(--op-accent-soft, rgba(0,153,102,0.10));
  color: var(--op-accent);
}
.pillDone:hover {
  border-color: var(--op-accent-hover, #007a52);
  color: var(--op-accent-hover, #007a52);
}

/* ── Tooltip on circle hover ── */
.circTooltip {
  display: none;
  position: absolute;
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--op-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
  font-family: var(--op-font-heading);
  letter-spacing: 0.04em;
  text-transform: capitalize;
}
.circTooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: var(--op-primary);
}
```

- [ ] **Step 5: Pass completionSections from OnePagerClient**

In `app/one-pager/OnePagerClient.tsx`, find the `<SectionNavMenu>` usage (~line 241) and add the prop:

```tsx
<SectionNavMenu
  skippedSections={skippedSections}
  completionSections={completionSections}
/>
```

(`completionSections` is already computed at the top of `OnePagerContent` via `getCompletionSections(state)`.)

- [ ] **Step 6: Run dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000/one-pager. Scroll through sections. Verify:
- Only active ± 1 sections show as labeled pills
- All others show as numbered circles
- Circles show tooltip on hover
- Completed sections turn green (fill in Product Name + Prepared By to make "Document Info" go green)
- Skipped sections are dimmed

- [ ] **Step 7: Commit**

```bash
git add app/one-pager/components/SectionNavMenu.tsx app/one-pager/components/SectionNavMenu.module.css app/one-pager/OnePagerClient.tsx
git commit -m "feat(one-pager): section nav clipping — active±1 pills, circles elsewhere, done=green"
```

---

## Task 2: Create ProgressRing Component

**Files:**
- Create: `app/one-pager/components/ProgressRing.tsx`
- Create: `app/one-pager/components/ProgressRing.module.css`

### What it does

SVG ring showing `done/total * 100%`. Clicking opens a dropdown panel listing all sections with their completion state and N/A toggles. This replaces `MissingInfoWidget` entirely.

- [ ] **Step 1: Create ProgressRing.tsx**

Create `app/one-pager/components/ProgressRing.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CompletionSection, OnePagerAction } from '../lib/one-pager-state';
import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  sections: CompletionSection[];
  version: string;
  isPublished: boolean;
  onToggleSkip: (key: string) => void;
  onTogglePaintSkip: () => void;
  onToggleLogoSkip: () => void;
  paintSkipped: boolean;
  logoSkipped: boolean;
}

const CIRCUMFERENCE = 2 * Math.PI * 13; // r=13

export default function ProgressRing({
  sections,
  version,
  isPublished,
  onToggleSkip,
  onTogglePaintSkip,
  onToggleLogoSkip,
  paintSkipped,
  logoSkipped,
}: ProgressRingProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const done = sections.filter(s => s.done).length;
  const total = sections.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const offset = CIRCUMFERENCE * (1 - done / total);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.ringBtn}
        onClick={() => setOpen(v => !v)}
        aria-label={`${pct}% complete — click to manage sections`}
        aria-expanded={open}
      >
        <svg className={styles.svg} viewBox="0 0 30 30">
          <circle className={styles.track} cx="15" cy="15" r="13" />
          <circle
            className={styles.fill}
            cx="15" cy="15" r="13"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
          <text className={styles.pctText} x="15" y="19" textAnchor="middle">
            {pct}%
          </text>
        </svg>
      </button>

      <span className={styles.verBadge} title={isPublished ? 'Published' : 'Draft'}>
        v{version}
      </span>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Section status">
          <div className={styles.panelTitle}>Section Status</div>
          {sections.map(s => (
            <div key={s.key} className={styles.row}>
              <span className={s.done ? styles.rowLabelDone : styles.rowLabel}>
                {s.done ? '✓ ' : ''}{s.label}
              </span>
              {s.skippable && (
                <button
                  type="button"
                  className={styles.naBtn + (s.done && !s.skippable ? '' : '')}
                  onClick={() => onToggleSkip(s.key)}
                >
                  {/* done via skip shows as active */}
                  N/A
                </button>
              )}
            </div>
          ))}
          <div className={styles.panelDivider} />
          <div className={styles.row}>
            <span className={paintSkipped ? styles.rowLabelDone : styles.rowLabel}>
              {paintSkipped ? '✓ ' : ''}Paint finish
            </span>
            <button
              type="button"
              className={paintSkipped ? styles.naBtnActive : styles.naBtn}
              onClick={onTogglePaintSkip}
            >
              {paintSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.row}>
            <span className={logoSkipped ? styles.rowLabelDone : styles.rowLabel}>
              {logoSkipped ? '✓ ' : ''}Logo
            </span>
            <button
              type="button"
              className={logoSkipped ? styles.naBtnActive : styles.naBtn}
              onClick={onToggleLogoSkip}
            >
              {logoSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ProgressRing.module.css**

Create `app/one-pager/components/ProgressRing.module.css`:

```css
.wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ringBtn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}
.ringBtn:hover { opacity: 0.8; }

.svg {
  width: 34px;
  height: 34px;
}

.track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 3.5;
}

.fill {
  fill: none;
  stroke: var(--op-accent, #009966);
  stroke-width: 3.5;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.4s ease;
}

.pctText {
  fill: #fff;
  font-size: 9px;
  font-weight: 700;
  font-family: var(--op-font-heading, 'Arial Narrow', Arial, sans-serif);
}

.verBadge {
  font-size: var(--op-fs-xs, 11px);
  font-weight: 700;
  font-family: var(--op-font-heading);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.12);
  border-radius: var(--op-radius-full, 9999px);
  padding: 2px 9px;
  white-space: nowrap;
}

/* ── Dropdown panel ── */
.panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--op-primary, #1D1F4A);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 200px;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.panel::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.panelTitle {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
  font-family: var(--op-font-heading);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
}

.rowLabel {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  font-family: var(--op-font-body);
}

.rowLabelDone {
  font-size: 11px;
  color: var(--op-accent-light, #1DB274);
  font-family: var(--op-font-body);
}

.panelDivider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.naBtn {
  height: 18px;
  padding: 0 7px;
  border-radius: var(--op-radius-full, 9999px);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: var(--op-font-heading);
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.naBtn:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.75);
}

.naBtnActive {
  composes: naBtn;
  background: rgba(0, 153, 102, 0.2);
  border-color: var(--op-accent, #009966);
  color: var(--op-accent-light, #1DB274);
}
.naBtnActive:hover {
  background: rgba(0, 153, 102, 0.3);
}
```

- [ ] **Step 3: Run dev server — no wiring yet, just verify no TS errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors in the new file.

- [ ] **Step 4: Commit**

```bash
git add app/one-pager/components/ProgressRing.tsx app/one-pager/components/ProgressRing.module.css
git commit -m "feat(one-pager): ProgressRing component — SVG ring + N/A toggle panel"
```

---

## Task 3: Create ExportMenu Component

**Files:**
- Create: `app/one-pager/components/ExportMenu.tsx`
- Create: `app/one-pager/components/ExportMenu.module.css`

- [ ] **Step 1: Create ExportMenu.tsx**

Create `app/one-pager/components/ExportMenu.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ExportMenu.module.css';

interface ExportMenuProps {
  onExport: (format: 'docx' | 'html' | 'pdf') => void;
  onPublish: () => void;
  onUnpublish: () => void;
  isPublished: boolean;
  isWorking: boolean;
  exportingFormat: string | null;
  isPublishing: boolean;
}

export default function ExportMenu({
  onExport,
  onPublish,
  onUnpublish,
  isPublished,
  isWorking,
  exportingFormat,
  isPublishing,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleItem(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        disabled={isWorking}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {exportingFormat ? 'Exporting…' : 'Export ▾'}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <button
            role="menuitem"
            className={styles.item}
            onClick={() => handleItem(() => onExport('docx'))}
          >
            <span className={styles.itemIcon}>↓</span>
            Download DOCX
          </button>
          <button
            role="menuitem"
            className={styles.item}
            onClick={() => handleItem(() => onExport('html'))}
          >
            <span className={styles.itemIcon}>↓</span>
            Download HTML
          </button>
          <button
            role="menuitem"
            className={styles.item}
            onClick={() => handleItem(() => onExport('pdf'))}
          >
            <span className={styles.itemIcon}>🖨</span>
            Print / PDF
          </button>
          <div className={styles.divider} />
          {isPublished ? (
            <button
              role="menuitem"
              className={styles.itemUnpublish}
              onClick={() => handleItem(onUnpublish)}
            >
              <span className={styles.itemIcon}>✕</span>
              Unpublish
            </button>
          ) : (
            <button
              role="menuitem"
              className={styles.itemPublish}
              onClick={() => handleItem(onPublish)}
              disabled={isPublishing}
            >
              <span className={styles.itemIcon}>✦</span>
              {isPublishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ExportMenu.module.css**

Create `app/one-pager/components/ExportMenu.module.css`:

```css
.wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.trigger {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--op-radius-full, 9999px);
  border: none;
  background: var(--op-accent, #009966);
  color: #fff;
  font-family: var(--op-font-heading);
  font-size: var(--op-fs-xs, 11px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s;
}
.trigger:hover:not(:disabled) { background: var(--op-accent-hover, #007a52); }
.trigger:disabled { opacity: 0.45; cursor: not-allowed; }

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--op-primary, #1D1F4A);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 5px;
  min-width: 160px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.menu::before {
  content: '';
  position: absolute;
  bottom: 100%;
  right: 14px;
  border: 6px solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-family: var(--op-font-body);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}
.item:hover { background: rgba(255, 255, 255, 0.08); }

.itemPublish {
  composes: item;
  color: var(--op-accent-light, #1DB274);
  padding-top: 8px;
}
.itemPublish:disabled { opacity: 0.45; cursor: not-allowed; }

.itemUnpublish {
  composes: item;
  color: rgba(255, 140, 140, 0.9);
  padding-top: 8px;
}

.itemIcon {
  font-size: 13px;
  width: 16px;
  text-align: center;
  opacity: 0.7;
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 3px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/components/ExportMenu.tsx app/one-pager/components/ExportMenu.module.css
git commit -m "feat(one-pager): ExportMenu dropdown — DOCX/HTML/PDF/Publish"
```

---

## Task 4: Create OverflowMenu Component

**Files:**
- Create: `app/one-pager/components/OverflowMenu.tsx`
- Create: `app/one-pager/components/OverflowMenu.module.css`

- [ ] **Step 1: Create OverflowMenu.tsx**

Create `app/one-pager/components/OverflowMenu.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
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
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleItem(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ···
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <Link href="/" className={styles.item} onClick={() => setOpen(false)}>
            <span className={styles.itemIcon}>⌂</span>
            Home
          </Link>
          <button
            role="menuitem"
            className={styles.item}
            onClick={() => handleItem(onReset)}
          >
            <span className={styles.itemIcon}>↺</span>
            Reset form
          </button>
          {isAdmin && documentId && (
            <>
              <div className={styles.divider} />
              <button
                role="menuitem"
                className={styles.item}
                onClick={() => handleItem(onShowVersionHistory)}
              >
                <span className={styles.itemIcon}>🕐</span>
                Version History
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create OverflowMenu.module.css**

Create `app/one-pager/components/OverflowMenu.module.css`:

```css
.wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.trigger {
  width: 36px;
  height: 32px;
  border-radius: var(--op-radius-full, 9999px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 17px;
  letter-spacing: 0.12em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding-bottom: 4px;
  transition: border-color 0.15s, color 0.15s;
}
.trigger:hover {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--op-primary, #1D1F4A);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 5px;
  min-width: 160px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.menu::before {
  content: '';
  position: absolute;
  bottom: 100%;
  right: 12px;
  border: 6px solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-family: var(--op-font-body);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.1s;
}
.item:hover { background: rgba(255, 255, 255, 0.08); }

.itemIcon {
  font-size: 13px;
  width: 16px;
  text-align: center;
  opacity: 0.7;
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 3px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/components/OverflowMenu.tsx app/one-pager/components/OverflowMenu.module.css
git commit -m "feat(one-pager): OverflowMenu — Home, Reset, Version History"
```

---

## Task 5: Create PreviewFab Component

**Files:**
- Create: `app/one-pager/components/PreviewFab.tsx`
- Create: `app/one-pager/components/PreviewFab.module.css`

### What it does

Floating button in the bottom-right corner of the form panel. On click:
- **Desktop (≥ 1024px):** calls `onToggle()` — parent handles the split panel
- **Tablet/Phone (< 1024px):** first click checks `localStorage.getItem('op-preview-mode')`. If not set, shows a small choice prompt ("Split" or "New Tab"). Saves choice to `localStorage`. Subsequent clicks use saved preference.
  - `'split'` → calls `onToggle()`
  - `'tab'` → opens HTML export in a new tab via `window.open('/api/one-pager/export?format=html', '_blank')` with a POST (need to use a form submit trick — see step below)

- [ ] **Step 1: Create PreviewFab.tsx**

Create `app/one-pager/components/PreviewFab.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PreviewFab.module.css';

interface PreviewFabProps {
  previewOpen: boolean;
  onToggle: () => void;
  getStateJson: () => string;  // returns JSON string of current state for new-tab preview
}

type PreviewMode = 'split' | 'tab';
const STORAGE_KEY = 'op-preview-mode';
const DESKTOP_BREAKPOINT = 1024;

export default function PreviewFab({ previewOpen, onToggle, getStateJson }: PreviewFabProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);

  // Close prompt on outside click
  useEffect(() => {
    if (!showPrompt) return;
    function handler(e: MouseEvent) {
      if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
        setShowPrompt(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPrompt]);

  function isDesktop() {
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  }

  function openInNewTab() {
    // POST the state JSON to the export endpoint and open result in new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/one-pager/export?format=html';
    form.target = '_blank';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = '__json__';
    input.value = getStateJson();
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  function handleClick() {
    if (isDesktop()) {
      onToggle();
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY) as PreviewMode | null;
    if (saved === 'split') {
      onToggle();
    } else if (saved === 'tab') {
      openInNewTab();
    } else {
      // First time — show choice prompt
      setShowPrompt(true);
    }
  }

  function chooseMode(mode: PreviewMode) {
    localStorage.setItem(STORAGE_KEY, mode);
    setShowPrompt(false);
    if (mode === 'split') {
      onToggle();
    } else {
      openInNewTab();
    }
  }

  const label = previewOpen ? '✕ Preview' : '▶ Preview';

  return (
    <div className={styles.container} ref={promptRef}>
      <button
        type="button"
        className={styles.fab}
        onClick={handleClick}
        aria-label={previewOpen ? 'Close preview' : 'Open preview'}
        aria-pressed={previewOpen}
      >
        {label}
      </button>

      {showPrompt && (
        <div className={styles.prompt} role="dialog" aria-label="Choose preview mode">
          <p className={styles.promptTitle}>How do you want to view the preview?</p>
          <div className={styles.promptBtns}>
            <button
              type="button"
              className={styles.promptBtn}
              onClick={() => chooseMode('split')}
            >
              Split view
            </button>
            <button
              type="button"
              className={styles.promptBtnSecondary}
              onClick={() => chooseMode('tab')}
            >
              New tab
            </button>
          </div>
          <button
            type="button"
            className={styles.promptForget}
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setShowPrompt(false); }}
          >
            Ask me next time
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PreviewFab.module.css**

Create `app/one-pager/components/PreviewFab.module.css`:

```css
.container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.fab {
  height: 40px;
  padding: 0 18px;
  border-radius: var(--op-radius-full, 9999px);
  border: none;
  background: var(--op-accent, #009966);
  color: #fff;
  font-family: var(--op-font-heading);
  font-size: var(--op-fs-s, 13px);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(0, 153, 102, 0.4);
  transition: background 0.15s, box-shadow 0.15s, transform 0.04s;
}
.fab:hover {
  background: var(--op-accent-hover, #007a52);
  box-shadow: 0 6px 20px rgba(0, 153, 102, 0.5);
}
.fab:active { transform: translateY(1px); }
.fab[aria-pressed="true"] {
  background: var(--op-on-surface-muted, #5A5C70);
  box-shadow: none;
}

/* ── Mode choice prompt ── */
.prompt {
  background: var(--op-surface, #fff);
  border: 1px solid var(--op-outline, #D9DAE2);
  border-radius: var(--op-radius-l, 20px);
  padding: 14px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 200px;
}

.promptTitle {
  font-size: var(--op-fs-s, 13px);
  color: var(--op-on-surface, #1A1B2A);
  margin-bottom: 10px;
  font-weight: 500;
  line-height: 1.4;
}

.promptBtns {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.promptBtn {
  flex: 1;
  height: 32px;
  border-radius: var(--op-radius-full, 9999px);
  border: none;
  background: var(--op-accent, #009966);
  color: #fff;
  font-family: var(--op-font-heading);
  font-size: var(--op-fs-xs, 11px);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
}
.promptBtn:hover { background: var(--op-accent-hover, #007a52); }

.promptBtnSecondary {
  composes: promptBtn;
  background: transparent;
  border: 1.5px solid var(--op-outline, #D9DAE2);
  color: var(--op-on-surface, #1A1B2A);
}
.promptBtnSecondary:hover {
  border-color: var(--op-primary, #1D1F4A);
  background: var(--op-info-soft, rgba(29,31,74,0.06));
}

.promptForget {
  display: block;
  width: 100%;
  border: none;
  background: none;
  font-size: var(--op-fs-xs, 11px);
  color: var(--op-on-surface-faint, #8C8E9F);
  cursor: pointer;
  text-align: center;
  padding: 2px 0;
}
.promptForget:hover { color: var(--op-on-surface-muted, #5A5C70); }
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/components/PreviewFab.tsx app/one-pager/components/PreviewFab.module.css
git commit -m "feat(one-pager): PreviewFab — floating preview toggle with responsive split/tab choice"
```

---

## Task 6: Rebuild OnePagerTopBar

**Files:**
- Modify: `app/one-pager/components/OnePagerTopBar.tsx`
- Modify: `app/one-pager/components/OnePagerTopBar.module.css`

The top bar becomes a 3-zone layout bar. It accepts `leftSlot`, `centerSlot`, `rightSlot` as ReactNode props so `OnePagerClient` can compose it with the new components.

- [ ] **Step 1: Rewrite OnePagerTopBar.tsx**

Replace the entire content of `app/one-pager/components/OnePagerTopBar.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { ReactNode } from 'react';
import styles from './OnePagerTopBar.module.css';

interface OnePagerTopBarProps {
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export default function OnePagerTopBar({ centerSlot, rightSlot }: OnePagerTopBarProps) {
  return (
    <header className={styles.topBar}>
      {/* Left zone: identity */}
      <div className={styles.left}>
        <Image
          src="/compulocks-logo.svg"
          alt="Compulocks"
          width={100}
          height={20}
          className={styles.logo}
          priority
        />
        <div className={styles.divider} />
        <span className={styles.product}>One-Pager</span>
      </div>

      {/* Center zone: progress ring + version */}
      <div className={styles.center}>
        {centerSlot}
      </div>

      {/* Right zone: actions */}
      <div className={styles.right}>
        {rightSlot}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Rewrite OnePagerTopBar.module.css**

Replace the entire content of `app/one-pager/components/OnePagerTopBar.module.css`:

```css
.topBar {
  display: flex;
  align-items: center;
  height: var(--op-h-topbar, 52px);
  padding: 0 var(--op-sp-4, 16px);
  background: var(--op-primary, #1D1F4A);
  color: #fff;
  border-bottom: 3px solid var(--op-accent, #009966);
  flex-shrink: 0;
  z-index: 20;
  gap: 8px;
}

/* Left: identity */
.left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.logo {
  display: block;
  height: 20px;
  width: auto;
  filter: brightness(0) invert(1);
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.product {
  font-family: var(--op-font-heading, 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  font-size: var(--op-fs-s, 13px);
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
}

/* Center: grows to push right zone to edge */
.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Right: action buttons */
.right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/components/OnePagerTopBar.tsx app/one-pager/components/OnePagerTopBar.module.css
git commit -m "feat(one-pager): rebuild OnePagerTopBar as 3-zone slot layout"
```

---

## Task 7: Wire Everything in OnePagerClient + SplitLayout

**Files:**
- Modify: `app/one-pager/OnePagerClient.tsx`
- Modify: `app/one-pager/components/SplitLayout.tsx`
- Modify: `app/one-pager/components/SplitLayout.module.css`
- Modify: `app/one-pager/page.module.css`

This is the integration task. It:
1. Removes the old `leftBar` / `barRow` from `OnePagerClient`
2. Passes the new components into `OnePagerTopBar` slots
3. Adds the `PreviewFab` inside the left panel
4. Updates `SplitLayout` to render the new bar and support top/bottom split

- [ ] **Step 1: Update SplitLayout to accept splitDirection and remove leftBar prop**

Replace the contents of `app/one-pager/components/SplitLayout.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import styles from './SplitLayout.module.css';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  previewOpen?: boolean;
  splitDirection?: 'horizontal' | 'vertical';
  topBar?: ReactNode;
}

export default function SplitLayout({
  leftPanel,
  rightPanel,
  previewOpen = false,
  splitDirection = 'vertical',
  topBar,
}: SplitLayoutProps) {
  return (
    <div className="one-pager-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {topBar}
      <div
        className={
          splitDirection === 'horizontal'
            ? styles.containerH
            : styles.container
        }
        data-preview={previewOpen ? 'open' : 'closed'}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div
          className={
            splitDirection === 'horizontal'
              ? styles.leftPanelH
              : styles.leftPanel
          }
          role="region"
          aria-label="Input fields"
        >
          <div className={styles.leftScroll}>
            {leftPanel}
          </div>
        </div>
        {previewOpen && (
          <div
            className={
              splitDirection === 'horizontal'
                ? styles.rightPanelH
                : styles.rightPanel
            }
            role="region"
            aria-label="Document preview"
          >
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update SplitLayout.module.css to add horizontal split styles**

Read the current file first, then append at the bottom:

```css
/* ── Horizontal (top/bottom) split — for tablet/phone portrait ── */
.containerH {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.leftPanelH {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rightPanelH {
  height: 45vh;
  min-height: 200px;
  border-top: 2px solid var(--op-outline-soft, #E8E9EE);
  overflow: auto;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Update OnePagerClient — wire new top bar and remove old bar row**

In `app/one-pager/OnePagerClient.tsx`:

**a) Add imports** (after existing imports):

```tsx
import ProgressRing from './components/ProgressRing';
import ExportMenu from './components/ExportMenu';
import OverflowMenu from './components/OverflowMenu';
import PreviewFab from './components/PreviewFab';
```

**b) Remove `featureLayout` state** — it's no longer needed in the bar row. Keep it if `FeatureSelector` still uses it internally (it does — keep it).

**c) Add `splitDirection` state** for tablet split orientation:

```tsx
const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('vertical');
```

Also update preview toggle: on mobile, after `localStorage` choice is 'split', determine direction from screen width:

```tsx
const handlePreviewToggle = useCallback(() => {
  const isPortrait = window.innerWidth < 1024;
  if (isPortrait) {
    setSplitDirection('horizontal');
  } else {
    setSplitDirection('vertical');
  }
  setPreviewOpen(v => !v);
}, []);
```

**d) Build the `centerSlot`:**

```tsx
const centerSlot = (
  <ProgressRing
    sections={completionSections}
    version={state.version}
    isPublished={state.isPublished}
    onToggleSkip={(key) => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: key })}
    onTogglePaintSkip={() => dispatch({ type: 'SET_PAINT_SKIPPED', payload: !state.customization.paintSkipped })}
    onToggleLogoSkip={() => dispatch({ type: 'SET_LOGO_SKIPPED', payload: !state.customization.logoSkipped })}
    paintSkipped={state.customization.paintSkipped}
    logoSkipped={state.customization.logoSkipped}
  />
);
```

**e) Build the `rightSlot`:**

```tsx
const rightSlot = (
  <>
    {!state.isPublished && (
      <button
        className={styles.saveBtn}
        onClick={handleSaveDraft}
        disabled={isWorking}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    )}
    <ExportMenu
      onExport={handleExport}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
      isPublished={state.isPublished}
      isWorking={isWorking}
      exportingFormat={isExporting}
      isPublishing={isPublishing}
    />
    <OverflowMenu
      onReset={handleReset}
      isAdmin={isAdmin}
      documentId={state.documentId}
      onShowVersionHistory={() => {
        // scroll to version history section (admin panel is already at bottom of left panel)
        const el = document.querySelector('[data-section="versionHistory"]');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }}
    />
  </>
);
```

**f) Add `data-section` attribute to the version history section div** in the left panel JSX (around line 673):

```tsx
<div className={styles.formSection} data-section="versionHistory">
```

**g) Add `saveBtn` style to `page.module.css`:**

```css
/* ── Save button (top bar) ── */
.saveBtn {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--op-radius-full, 9999px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--op-font-heading);
  font-size: var(--op-fs-xs, 11px);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.saveBtn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}
.saveBtn:disabled { opacity: 0.45; cursor: not-allowed; }
```

**h) Update the `return` of `OnePagerContent`:**

Replace the existing `<SplitLayout>` call:

```tsx
const getStateJson = useCallback(() => JSON.stringify({ ...state, featureLayout }), [state, featureLayout]);

// left panel: add PreviewFab at the bottom (inside .inputSections wrapper)
// Wrap the existing leftPanel in a relative-positioned div:
const leftPanelWithFab = (
  <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    {leftPanel}
    <PreviewFab
      previewOpen={previewOpen}
      onToggle={handlePreviewToggle}
      getStateJson={getStateJson}
    />
  </div>
);

return (
  <SplitLayout
    leftPanel={leftPanelWithFab}
    rightPanel={rightPanel}
    previewOpen={previewOpen}
    splitDirection={splitDirection}
    topBar={
      <OnePagerTopBar
        centerSlot={centerSlot}
        rightSlot={rightSlot}
      />
    }
  />
);
```

**i) Remove the old `leftBar` variable** (the entire `const leftBar = (...)` block from `OnePagerClient.tsx`).

**j) Remove now-unused imports** from `OnePagerClient.tsx`:
- `MissingInfoWidget` (replaced by ProgressRing)
- `Link` (no longer needed for Home icon — it's in OverflowMenu)

Check: `Link` is used in `OverflowMenu` now, not `OnePagerClient`. Remove if no other usage.

- [ ] **Step 4: Remove dead CSS from page.module.css**

Delete the following class blocks from `app/one-pager/page.module.css` (they are replaced by the new component styles):
- `.barRow`
- `.barLeft`
- `.barRight`
- `.progressWrap`
- `.barIconBtn` and `.barIconBtn:hover`
- `.previewToggleBtn` and its variants
- `.exportButton`, `.exportButtonGhost` and their hover/disabled states
- `.versionBadge`

Keep: `.saveBtn` (just added above), all form/section/card/field styles.

- [ ] **Step 5: Run dev server and do a full smoke test**

```bash
npm run dev
```

Open http://localhost:3000/one-pager and verify:
- Top bar shows logo · One-Pager | ring | Save · Export▾ · ···
- Progress ring shows completion %, click opens N/A panel
- N/A toggles work (try toggling Goal)
- Export ▾ dropdown opens with DOCX/HTML/PDF/Publish
- Publish item publishes; Save button disappears after publish; Unpublish appears
- ··· opens with Home/Reset; Version History shows only when isAdmin+documentId
- Section nav clips correctly; circles show tooltips on hover
- FAB appears bottom-right of form
- On desktop: FAB click opens side-by-side split
- Narrow the browser to < 1024px: FAB shows the choice prompt on first click

- [ ] **Step 6: Fix any TypeScript errors**

```bash
npm run build 2>&1 | grep -E "^.*error TS" | head -30
```

Fix each error before proceeding.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(one-pager): wire new top bar, preview FAB, remove old bar row"
```

---

## Task 8: Export HTML Route — Accept POST body from new-tab preview

**Files:**
- Modify: `app/api/one-pager/export/route.ts`

The `PreviewFab` submits a hidden form with `__json__` when opening in a new tab. The export route currently reads from the request JSON body. We need it to also handle `application/x-www-form-urlencoded` form submissions.

- [ ] **Step 1: Read the existing export route**

```bash
head -40 app/api/one-pager/export/route.ts
```

- [ ] **Step 2: Update the route to handle both JSON and form body**

At the top of the `POST` handler, replace the body-parsing logic with:

```ts
let state: Record<string, unknown>;
const contentType = request.headers.get('content-type') ?? '';

if (contentType.includes('application/x-www-form-urlencoded')) {
  const formData = await request.formData();
  const jsonStr = formData.get('__json__');
  if (!jsonStr || typeof jsonStr !== 'string') {
    return NextResponse.json({ error: 'Missing __json__ field' }, { status: 400 });
  }
  state = JSON.parse(jsonStr);
} else {
  state = await request.json();
}
```

Keep everything else in the route unchanged.

- [ ] **Step 3: Test new-tab preview**

On a narrow viewport (< 1024px), click the FAB, choose "New tab". Verify the HTML preview opens in a new browser tab with the current document content.

- [ ] **Step 4: Commit**

```bash
git add app/api/one-pager/export/route.ts
git commit -m "fix(one-pager/export): accept form-encoded body for new-tab preview"
```

---

## Task 9: Final Polish + Lint

- [ ] **Step 1: Run lint**

```bash
npm run lint 2>&1 | grep -v "^$" | head -40
```

Fix any lint errors.

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build completes with no errors.

- [ ] **Step 3: Remove the old `.superpowers/topbar-ideas*.html` mockup files** (optional housekeeping — skip if you want to keep them for reference).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(one-pager): lint + build clean for nav/topbar redesign"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| Section nav: active ± 1 as pills | Task 1 |
| Section nav: circles for others | Task 1 |
| Section nav: green when done | Task 1 |
| Section nav: hover tooltip on circles | Task 1 |
| Section nav: skipped = dimmed | Task 1 (existing behavior preserved) |
| Progress ring (SVG, % complete) | Task 2 |
| Progress ring: clickable N/A panel | Task 2 |
| N/A toggles: section skip, paint skip, logo skip | Task 2 |
| Export dropdown: DOCX/HTML/PDF/Publish | Task 3 |
| Save disappears after publish | Task 7e |
| Unpublish in export dropdown | Task 3 |
| ··· menu: Home/Reset/Version History | Task 4 |
| Preview FAB: bottom-right of form panel | Task 5, 7h |
| Desktop FAB: side-by-side split | Task 5, 7c |
| Mobile FAB: prompt split/tab first time | Task 5 |
| Mobile FAB: remember preference | Task 5 |
| Mobile split: top/bottom | Task 7c, SplitLayout |
| New tab preview: form POST | Task 5, 8 |
| 3-zone top bar layout | Task 6 |
| Remove old bar row clutter | Task 7i, 7j |

### Type consistency check

- `CompletionSection` imported from `one-pager-state.ts` consistently across Task 1, 2, 7
- `ProgressRing` props: `sections: CompletionSection[]`, `paintSkipped: boolean`, `logoSkipped: boolean` — all sourced from `state.customization` which has these fields
- `ExportMenu.onExport(format: 'docx' | 'html' | 'pdf')` — matches existing `runExport` signature in `OnePagerClient`
- `handlePreviewToggle` introduced in Task 7c replaces direct `setPreviewOpen` calls — verify no other usages of `setPreviewOpen` remain after Task 7

### No placeholders — confirmed all steps have code.
