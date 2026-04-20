# UI/UX Role File
# Design System · Frame Templates · Interaction Model

<!-- @MENTOR:CONTEXT Read after CLAUDE.md and methodology/frame-schema.md.
     You own the visual language, the frame HTML/CSS templates, and
     the interaction design for the composer and DevLog UI.
     Frontend implements your designs. You don't write React. -->

---

## YOUR SCOPE

You own:
- Brand token system definition
- HTML/CSS frame template designs (the reference implementations)
- Composer UI interaction model and wireframes
- DevLog status interaction design
- Print/export visual specifications

You do NOT own:
- React component implementation (frontend)
- Agent logic (backend)
- Database schema (system engineer)

---

## BRAND TOKEN SYSTEM

All frames and UI use this token set. These are the only values that
should appear in any frame template or component.

```css
:root {
  /* Core palette */
  --navy:        #1D1F4A;    /* primary, headers, text */
  --navy-light:  #243469;    /* secondary backgrounds */
  --green:       #009966;    /* primary accent, CTAs */
  --green-light: #1db274;    /* secondary accent, highlights */
  --bg:          #f2f2f2;    /* page background */
  --white:       #ffffff;    /* card backgrounds */
  --border:      rgba(29,31,74,0.09);

  /* Text */
  --text:        rgba(29,31,74,0.88);
  --dim:         rgba(29,31,74,0.42);

  /* Status colors (DevLog) */
  --s-achieved:  #009966;
  --s-exceeded:  #0077cc;
  --s-partial:   #d4860a;
  --s-deferred:  #8855cc;
  --s-dropped:   #c04040;
  --s-pending:   rgba(29,31,74,0.22);

  /* Typography */
  --font-head: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
  --font-body: 'Barlow', 'Segoe UI', Arial, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;

  /* Spacing scale */
  --sp-xs:  8px;
  --sp-sm:  16px;
  --sp-md:  28px;
  --sp-lg:  48px;
  --sp-xl:  64px;
}
```

Dark header pattern (used in `header` frame):

```css
.frame-header-dark {
  background: var(--navy);
  /* Subtle grid overlay */
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 56px 56px;
}
```

---

## TYPOGRAPHY SCALE

```css
.type-display   { font-family: var(--font-head); font-size: 58px; font-weight: 500; line-height: 1.05; }
.type-h1        { font-family: var(--font-head); font-size: 42px; font-weight: 500; line-height: 1.1; }
.type-h2        { font-family: var(--font-head); font-size: 30px; font-weight: 500; line-height: 1.15; }
.type-h3        { font-family: var(--font-body); font-size: 21px; font-weight: 600; line-height: 1.3; }
.type-body      { font-family: var(--font-body); font-size: 18px; font-weight: 400; line-height: 1.65; }
.type-small     { font-family: var(--font-body); font-size: 14px; font-weight: 400; line-height: 1.5; }
.type-label     { font-family: var(--font-body); font-size: 11px; font-weight: 700;
                  text-transform: uppercase; letter-spacing: 2.5px; }
.type-mono      { font-family: var(--font-mono); font-size: 13px; }
```

---

## FRAME VISUAL SPECIFICATIONS

### `header` frame
- Background: `--navy` with grid overlay
- Product name: `.type-display`, white
- Doc type tag: `.type-label`, `--green-light` color
- Subtitle: `.type-h2`, `rgba(255,255,255,0.35)`
- Meta row: flex, 40px gap, divider `rgba(255,255,255,0.1)` border-top
- Status badge: pill, `--green` background, white text, uppercase, 12px

### `overview` frame
- Text block: `--text`, 20px, border-left `3px solid --green`, 24px padding-left
- Max width: 680px

### `goals` frame
- List items: 18px, dot `8px --green` circle, flex gap 14px
- No card wrapping — clean list only

### `requirements` frame
- Section titles: `.type-label` + bottom border `--border`
- Spec grid: 2-column, white cards, border-radius 16px
- Requirement items: white card, border-radius 10px, ID in `.type-label --green`
- Must-have vs nice-to-have visual separation: must-have items have slightly more visual weight (no border change — weight comes from ID color)

### `checklist` frame (table)
- Header row: `--navy` background, white text
- First column radius: 10px 0 0 0 / 0 0 0 10px
- Applied badges: pill, 3 states — yes (green), limited (amber), no (red)
- Row hover: `rgba(29,31,74,0.02)`

### `stage-resolution` frame (DevLog)
- Stage rail: sticky at top, white background, green bottom-border on active
- Stage items: left-to-right, arrow separators `rgba(29,31,74,0.15)`
- Active stage dot: `--green` with `0 0 0 3px rgba(0,153,102,0.15)` ring
- Summary stat cells: 3-up grid, `--bg` background

### `decision-log` frame (DevLog)
- Timeline pattern: left vertical line, dot per entry
- Dot types: spec-change (amber border), dropped (red border), exceeded (blue border), resolved (green border)
- Entry append input: `--bg` textarea, inline with "+ Log" button

---

## STATUS PILL DESIGN

Six states. Pill height: 22px. Padding: 3px 10px. Border-radius: 100px.

| State | Background | Text color | Label |
|-------|-----------|-----------|-------|
| Achieved | `rgba(0,153,102,0.12)` | `--s-achieved` | `✓ Achieved` |
| Exceeded | `rgba(0,119,204,0.10)` | `--s-exceeded` | `↑ Exceeded` |
| Partial | `rgba(212,134,10,0.12)` | `--s-partial` | `~ Partial` |
| Deferred | `rgba(136,85,204,0.10)` | `--s-deferred` | `→ Deferred` |
| Dropped | `rgba(192,64,64,0.10)` | `--s-dropped` | `✗ Dropped` |
| Pending | `rgba(29,31,74,0.07)` | `--dim` | `· Pending` |

Clicking a pill opens the status modal. Hover: `filter: brightness(1.08)`.

---

## COMPOSER INTERACTION MODEL

The composer is a split-pane layout:

```
┌─────────────────────────────────────────────────────────┐
│  [Audience Preset: R&D | Client | Leadership | Custom]  │
├──────────────────────────┬──────────────────────────────┤
│  LEFT: Frame Selector    │  RIGHT: Live Preview          │
│                          │                               │
│  Document 1 (MRD)        │  [assembled HTML preview]     │
│  ☑ Overview              │                               │
│  ☑ Goals                 │                               │
│                          │                               │
│  Document 2 (PRD)        │                               │
│  ☑ Requirements          │                               │
│  ☑ Acceptance            │                               │
│  ☐ Assumptions           │                               │
│                          │                               │
│  Document 3 (DevLog)     │                               │
│  ☐ Stage Resolution      │                               │
│  ☐ Decision Log          │                               │
│                          │                               │
├──────────────────────────┴──────────────────────────────┤
│  [Download HTML]  [Export PDF]  [Export DOCX]           │
└─────────────────────────────────────────────────────────┘
```

Interaction rules:
- Audience presets pre-check frames — user can override any selection
- Preview updates debounced 300ms after selection change
- Selected frames maintain visual order (top-to-bottom matches document order)
- Drag to reorder frames within the selection — optional for v1

---

## PRINT / EXPORT VISUAL SPEC

Print CSS must handle:
- Hide: sticky nav, composer UI, status pills (replace with text)
- Preserve: `--navy` header background (`print-color-adjust: exact`)
- Page breaks: avoid inside cards and table rows
- Margins: 20mm all sides
- Header frame: always on first page

Status pills in print: replace interactive pill with text label only.

```css
@media print {
  .status-pill { background: none !important; border: 1px solid currentColor; }
  .doc-nav, .composer-ui, .add-entry-bar { display: none !important; }
  [data-frame="header"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

---

## DESIGN DELIVERABLES (IN ORDER)

1. **Frame HTML reference templates** — static HTML/CSS for each frame type.
   These are the design source of truth. Frontend implements from these.
   *(PRD template already produced — see project root)*

2. **DevLog reference template** — *(already produced — see project root)*

3. **Composer UI wireframe** — annotated HTML/CSS mockup, not Figma.
   Match brand tokens exactly. Frontend implements from this.

4. **Status modal design** — the picker UI for updating feature status in DevLog.

5. **Print stylesheet** — standalone CSS for export-quality PDF output.
