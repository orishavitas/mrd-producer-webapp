# One-Pager Nav + Top Bar Redesign — Design Spec

**Date:** 2026-05-26  
**Version:** 1.0  
**Status:** Approved

---

## Overview

Two UI changes to the One-Pager Generator:

1. **Section Nav Clipping** — replace the always-expanded pill strip with a compact design that shows only the active section ± 1 neighbor as labeled pills; all other sections are numbered circles with hover tooltips. Done sections turn green.

2. **Top Bar Redesign** — replace the wide, messy top bar with a clean 52px single bar: logo · name (left) | progress ring (center) | Save · Export▾ · ··· (right). Preview moves to a floating FAB. Export and secondary actions collapse into dropdowns.

---

## 1. Section Nav

### Behavior

- **11 sections** tracked (same as today): `documentInfo`, `productDescription`, `goal`, `where`, `who`, `useCases`, `features`, `commercials`, `competitors`, `referencePhotos`, `footnotes`
- Active section detected via `IntersectionObserver` (keep existing logic)
- **Visible as labeled pill:** active section, one section before it, one section after it
- **Visible as numbered circle:** all other sections
- **Done state (green):** section circle or pill turns green when the section's completion check passes. Uses `getCompletionSections()` from `one-pager-state.ts`
- **Skipped/N/A state:** dimmed (keep existing `pillDimmed` behavior for skipped sections)
- **Hover tooltip on circles:** section name appears in a small tooltip above the circle
- Clicking any pill or circle scrolls to that section (keep existing `scrollIntoView` behavior)

### Visual States

| State | Circle | Pill |
|---|---|---|
| Default | Outlined circle, muted number | Outlined pill, muted label |
| Active | — | Navy fill, white text |
| Done | Green outline, green number | Green outline, green tint bg, green text |
| Skipped/N/A | Dimmed (opacity 0.38) | Dimmed pill |

---

## 2. Top Bar

### Layout (52px, single row)

```
[ COMPULOCKS logo ] | One-Pager      [ring]  v0.3  |  [Save]  [Export ▾]  [···]
```

- **Left zone:** Logo block + divider + "One-Pager" product name
- **Center zone:** Progress ring (clickable) + version badge. Center is achieved via `flex: 1` spacers on both sides.
- **Right zone:** Save button (ghost) · Export dropdown (filled) · ··· overflow menu

### Progress Ring

- SVG ring showing completion percentage (from `getCompletionSections`)
- **Clickable** — opens an inline dropdown panel listing all sections with their completion state and N/A toggles
- Ring panel replaces the existing `MissingInfoWidget`
- Panel items: section name + done check OR "N/A" toggle button
- Dispatches `TOGGLE_SECTION_SKIP`, `SET_PAINT_SKIPPED`, `SET_LOGO_SKIPPED` on toggle

### Export Dropdown

Opens downward from the Export button. Items:

1. Download DOCX
2. Download HTML
3. Print / PDF
4. ─── divider ───
5. **Publish** (green tint)

Publish triggers existing `handlePublish` logic. After publishing, "Publish" item changes to "Unpublish". Save button disappears from the bar once `state.isPublished === true`.

### ··· Overflow Menu

Items:
1. Home (→ `/`)
2. Reset form
3. Version History (admin only, when `isAdmin && state.documentId`)

### Preview FAB

- Floating button, bottom-right of the **left (form) panel**
- Label: `▶ Preview` when closed, `✕ Preview` when open
- **Desktop (≥ 1024px wide):** clicking FAB slides the right panel in from the right. Draggable divider between panels. FAB changes label.
- **Tablet / Phone (< 1024px):** first click shows a one-time prompt: "How do you want to view the preview?" with two options: "Split (top/bottom)" or "Open in new tab". Choice saved to `localStorage` key `op-preview-mode`. Subsequent clicks use saved preference.
  - **Split:** preview slides up from the bottom. Draggable horizontal handle between form and preview.
  - **New tab:** opens a new browser tab with the document preview rendered as standalone HTML (can reuse the existing export HTML route or a dedicated preview route).

### Removed from Top Bar

The following are removed from the current top bar / left bar row and their functions absorbed as described:

| Old element | New home |
|---|---|
| Home icon button | ··· menu |
| Reset icon button | ··· menu |
| Preview toggle button | FAB |
| MissingInfoWidget | Progress ring click panel |
| Version badge | Stays (in center zone of bar) |
| Publish button | Export dropdown |
| Unpublish button | Export dropdown (replaces Publish) |
| Print/PDF button | Export dropdown |
| Export DOCX button | Export dropdown (primary item) |

---

## 3. Component Architecture

### New / changed components

| Component | File | Change |
|---|---|---|
| `SectionNavMenu` | `app/one-pager/components/SectionNavMenu.tsx` + `.module.css` | Rewrite rendering logic; add done-state prop |
| `OnePagerTopBar` | `app/one-pager/components/OnePagerTopBar.tsx` + `.module.css` | Replace static bar with new 3-zone layout |
| `ProgressRing` | `app/one-pager/components/ProgressRing.tsx` + `.module.css` | New — SVG ring + clickable N/A panel |
| `ExportMenu` | `app/one-pager/components/ExportMenu.tsx` + `.module.css` | New — dropdown with DOCX/HTML/PDF/Publish |
| `OverflowMenu` | `app/one-pager/components/OverflowMenu.tsx` + `.module.css` | New — ··· dropdown |
| `PreviewFab` | `app/one-pager/components/PreviewFab.tsx` + `.module.css` | New — floating FAB + preview mode logic |
| `OnePagerClient` | `app/one-pager/OnePagerClient.tsx` | Wire new components; remove old bar row |
| `SplitLayout` | `app/one-pager/components/SplitLayout.tsx` + `.module.css` | Add draggable divider support; top/bottom split mode |

### Props flow

`OnePagerClient` owns all state/handlers and passes down:
- `ProgressRing`: `sections`, `onToggleSkip`, `onTogglePaintSkip`, `onToggleLogoSkip`
- `ExportMenu`: `onExport(format)`, `onPublish`, `onUnpublish`, `isPublished`, `isWorking`
- `OverflowMenu`: `onHome`, `onReset`, `isAdmin`, `documentId`
- `PreviewFab`: `previewOpen`, `onToggle`, breakpoint detection internal
- `SectionNavMenu`: `skippedSections`, `completionSections` (new prop)

---

## 4. Responsive Breakpoints

| Viewport | Split direction | Preview trigger |
|---|---|---|
| ≥ 1024px (desktop) | Left/right (existing) | FAB slides panel in |
| 768–1023px (tablet) | Top/bottom OR new tab (user choice, localStorage) | FAB |
| < 768px (phone) | Top/bottom OR new tab (user choice, localStorage) | FAB |

---

## 5. What Does NOT Change

- `getCompletionSections()` logic in `one-pager-state.ts`
- All reducer actions and state shape
- Export API routes
- Document save/publish API routes
- `DocumentPreview` component
- Design tokens in `one-pager-tokens.css`
- `OnePagerTopBar` brand identity (logo, colors, green underline)

---

## 6. Out of Scope

- Drag-to-resize (draggable handle is visual only for now; can be a follow-up)
- Preview new-tab route (use existing HTML export endpoint)
- Animation polish (basic CSS transitions only)
