# Compulocks Brand Token Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the entire MRD Producer webapp into full compliance with the Compulocks R&D AI Design Kit by consolidating tokens, applying correct brand colors/fonts, and aligning component styles.

**Architecture:** Single source of truth in `styles/tokens/compulocks.css`. All routes (`/`, `/mrd`, `/one-pager`, `/one-pager-beta`) reference this file. The `globals.css` IBM Plex defaults are replaced with Barlow. The `--op-*` one-pager namespace is preserved but updated to reference the canonical brand tokens.

**Tech Stack:** CSS custom properties, Next.js App Router, next/font/google (Barlow + Barlow Condensed already loaded), CSS Modules

---

## Source of Truth — Brand Kit Tokens

```css
/* COMPULOCKS R&D AI Design Kit — Reference */
--compulocks-primary: #1D1F4A;
--compulocks-light-navy: #243469;
--compulocks-green-dark: #009966;   /* Primary CTA / buttons / success */
--compulocks-green-light: #1db274;  /* Secondary accent / gradients */
--compulocks-bg-light: #f2f2f2;
--compulocks-white: #ffffff;
--font-heading: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
--font-body: 'Barlow', 'Segoe UI', Arial, sans-serif;

/* Typography hierarchy */
.section-heading  → Barlow Condensed, 69px, weight 500, capitalize
.slide-title      → Barlow Condensed, 36px, weight 500, capitalize
.small-title      → Barlow (body), 21px, weight 600
.paragraph-text   → Barlow, 18px, weight 400
.small-text       → Barlow, 12px, weight 400, italic

/* Card spec */
.content-card → bg #f2f2f2, border 1px solid #e0e0e0, border-radius 24px, padding 32px
.content-card img → border-radius 12px
```

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `styles/tokens/compulocks.css` | **Modify** | Add green tokens, fix surface color, add brand utility classes |
| `app/globals.css` | **Modify** | Replace `--accent` teal with green, replace `--font-sans` IBM Plex with Barlow, fix `--background` |
| `app/layout.tsx` | **Modify** | Remove IBM Plex font imports, keep Barlow/Barlow Condensed |
| `app/one-pager/one-pager-tokens.css` | **Modify** | Align `--op-accent`, card radius/border/padding to brand spec |
| `app/one-pager/components/CompetitorInput.module.css` | **Modify** | Fix card border-radius, border width, border color, padding |
| `app/one-pager/components/DocumentPreview.module.css` | **Modify** | Fix heading sizes (h1/h2/h3), body copy size, image border-radius |
| `app/one-pager/page.module.css` | **Modify** | Fix `.pageTitle` font-size to match brand heading scale |

---

## Task 1: Extend `styles/tokens/compulocks.css` with Green Palette + Brand Utility Classes

**Files:**
- Modify: `styles/tokens/compulocks.css`

- [ ] **Step 1: Add green tokens and fix surface color**

Open `styles/tokens/compulocks.css`. Replace the Brand Colors block:

```css
/* ─── Brand Colors ─────────────────────────────────── */
--brand-primary: #1D1F4A;
--brand-highlight: #243469;
--brand-green-dark: #009966;    /* Primary CTA, buttons, success — DO NOT change */
--brand-green-light: #1db274;   /* Secondary accent, gradients */
--brand-surface: #f2f2f2;       /* Was #f4f5f9 — corrected to brand spec */
--brand-surface-alt: #fafafa;
--brand-white: #ffffff;
```

- [ ] **Step 2: Add semantic accent aliases**

Add after the Brand Colors block:

```css
/* ─── Semantic Aliases ─────────────────────────────── */
--accent:        var(--brand-green-dark);   /* Primary CTA color */
--accent-hover:  #007a52;                   /* Darken 8% for hover */
--accent-soft:   rgba(0, 153, 102, 0.12);   /* Ghost button bg */
--accent-light:  var(--brand-green-light);  /* Secondary accent */
```

- [ ] **Step 3: Add brand typography utility classes at bottom of file**

Append after all `:root` blocks:

```css
/* ─── Brand Typography Utility Classes ─────────────── */
/* Use these globally — matches Compulocks R&D AI Design Kit */

.section-heading {
  font-family: var(--font-heading);
  font-size: 69px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--brand-primary);
}

.slide-title {
  font-family: var(--font-heading);
  font-size: 36px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--brand-primary);
}

.small-title {
  font-family: var(--font-body);
  font-size: 21px;
  font-weight: 600;
  color: var(--brand-primary);
}

.paragraph-text {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 400;
  color: var(--brand-primary);
}

.small-text {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 400;
  font-style: italic;
  color: var(--brand-primary);
}

/* ─── Brand Card ────────────────────────────────────── */
.content-card {
  background-color: var(--brand-surface);
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  padding: 32px;
}

.content-card img {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 16px;
}

.content-card .card-caption {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 600;
  color: var(--brand-primary);
  text-align: center;
}
```

- [ ] **Step 4: Verify file looks correct**

```bash
head -30 styles/tokens/compulocks.css
```
Expected: Brand Colors block shows `--brand-green-dark: #009966` and `--brand-surface: #f2f2f2`

- [ ] **Step 5: Commit**

```bash
git add styles/tokens/compulocks.css
git commit -m "feat(tokens): add brand green palette, fix surface color, add utility classes"
```

---

## Task 2: Fix `app/globals.css` — Replace Teal Accent + IBM Plex Default

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace teal accent colors with brand green**

In the `:root` block in `app/globals.css`, replace:

```css
/* OLD — remove these */
--accent: #0f766e;
--accent-strong: #0b5f59;
--accent-soft: rgba(15, 118, 110, 0.12);
```

With:

```css
/* NEW — Compulocks brand green */
--accent: var(--brand-green-dark, #009966);
--accent-hover: #007a52;
--accent-soft: rgba(0, 153, 102, 0.12);
```

- [ ] **Step 2: Fix background color**

In the same `:root` block, change:

```css
/* OLD */
--background: #f6f5f1;
```

To:

```css
/* NEW */
--background: #f2f2f2;
```

- [ ] **Step 3: Fix default font to Barlow**

In the `:root` block, change:

```css
/* OLD */
--font-sans: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif;
```

To:

```css
/* NEW — Barlow is the brand body font */
--font-sans: 'Barlow', 'Segoe UI', Arial, sans-serif;
```

- [ ] **Step 4: Verify no IBM Plex references remain in globals.css**

```bash
grep -n "IBM Plex" app/globals.css
```
Expected: no output

- [ ] **Step 5: Run build to catch breakage**

```bash
npm run build 2>&1 | tail -20
```
Expected: no errors (CSS-only change, no type errors)

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(globals): replace teal accent with brand green, Barlow as default font"
```

---

## Task 3: Update `app/layout.tsx` — Remove IBM Plex Imports

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Remove IBM Plex font imports and variables**

In `app/layout.tsx`, remove the IBM Plex Sans and IBM Plex Mono font declarations:

```typescript
// REMOVE these two blocks entirely:
const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
```

Also remove from the import line:
```typescript
// Change from:
import { IBM_Plex_Mono, IBM_Plex_Sans, Barlow, Barlow_Condensed } from 'next/font/google';

// Change to:
import { Barlow, Barlow_Condensed } from 'next/font/google';
```

- [ ] **Step 2: Add Barlow weight 600 (needed for small-title)**

Update the `barlow` font declaration — add weight 600:

```typescript
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-barlow',
  display: 'swap',
});
```

- [ ] **Step 3: Update RootLayout className to use barlow + barlowCondensed only**

Find the `<html>` or `<body>` className line. Remove `sans.variable` and `mono.variable`, keep `barlow.variable` and `barlowCondensed.variable`.

The className should look like:
```typescript
className={`${barlow.variable} ${barlowCondensed.variable}`}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(layout): remove IBM Plex, use Barlow+BarlowCondensed only"
```

---

## Task 4: Align `app/one-pager/one-pager-tokens.css` to Brand Spec

**Files:**
- Modify: `app/one-pager/one-pager-tokens.css`

- [ ] **Step 1: Read the current file**

```bash
cat app/one-pager/one-pager-tokens.css
```

- [ ] **Step 2: Fix accent color token**

Find `--op-accent` or equivalent accent variable. Change its value from any teal to reference the brand green:

```css
--op-accent: var(--brand-green-dark, #009966);
--op-accent-hover: #007a52;
--op-accent-soft: rgba(0, 153, 102, 0.12);
```

- [ ] **Step 3: Fix card tokens**

Find card-related tokens in `--op-*` namespace. Update to match brand spec:

```css
--op-card-radius: 24px;        /* Was likely 28px — spec is 24px */
--op-card-border: 1px solid #e0e0e0;  /* Was 1.5px */
--op-card-padding: 32px;       /* Was ~14px */
--op-card-image-radius: 12px;  /* Brand spec for images inside cards */
```

- [ ] **Step 4: Fix background surface**

Find `--op-surface` or `--op-bg` equivalent. Change to:
```css
--op-surface: #f2f2f2;   /* Was #f4f5f9 — corrected to brand spec */
```

- [ ] **Step 5: Verify no broken references**

```bash
grep -rn "var(--op-card" app/one-pager/components/ | head -20
```
Expected: lists usages you'll need to verify still work visually

- [ ] **Step 6: Commit**

```bash
git add app/one-pager/one-pager-tokens.css
git commit -m "feat(one-pager-tokens): align card, accent, surface tokens to brand spec"
```

---

## Task 5: Fix `CompetitorInput.module.css` Card Styling

**Files:**
- Modify: `app/one-pager/components/CompetitorInput.module.css`

- [ ] **Step 1: Read the card class in CompetitorInput**

```bash
grep -n "card\|border-radius\|padding\|border:" app/one-pager/components/CompetitorInput.module.css
```

- [ ] **Step 2: Update card wrapper styles**

Find the card-wrapper or competitor card class (likely `.competitorCard` or `.card`). Update:

```css
/* Replace existing values with: */
border-radius: var(--op-card-radius, 24px);
border: var(--op-card-border, 1px solid #e0e0e0);
padding: var(--op-card-padding, 32px);
background-color: var(--op-surface, #f2f2f2);
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/components/CompetitorInput.module.css
git commit -m "fix(competitor-input): align card styles to brand spec (radius 24px, 1px border)"
```

---

## Task 6: Fix `DocumentPreview.module.css` — Typography + Image Radius

**Files:**
- Modify: `app/one-pager/components/DocumentPreview.module.css`

- [ ] **Step 1: Read heading and body styles**

```bash
grep -n "h1\|h2\|h3\|font-size\|border-radius" app/one-pager/components/DocumentPreview.module.css | head -30
```

- [ ] **Step 2: Fix heading font sizes in the preview**

The DocumentPreview renders the actual exported document — its heading scale should match the brand hierarchy. Update:

```css
/* Section heading equivalent */
h1 {
  font-family: var(--font-barlow-condensed, 'Barlow Condensed', sans-serif);
  font-size: 36px;      /* slide-title scale for document context */
  font-weight: 500;
  text-transform: capitalize;
  color: var(--brand-primary, #1D1F4A);
}

/* Sub-section heading */
h2 {
  font-family: var(--font-barlow-condensed, 'Barlow Condensed', sans-serif);
  font-size: 21px;      /* small-title scale */
  font-weight: 600;
  color: var(--brand-primary, #1D1F4A);
}

/* Body copy */
p, li {
  font-family: var(--font-barlow, 'Barlow', sans-serif);
  font-size: 18px;
  font-weight: 400;
  color: var(--brand-primary, #1D1F4A);
}
```

Note: 69px section-heading is for presentation slides — DocumentPreview uses 36px as practical max for document output.

- [ ] **Step 3: Fix image border-radius**

Find any `img` or image-related selectors:

```css
img {
  border-radius: 12px;   /* Was 8px — brand spec for images inside cards */
}
```

- [ ] **Step 4: Fix body content font-size**

Find `.content` or main body text class:

```css
.content {
  font-size: 18px;   /* Was 0.875rem (14px) — brand spec is 18px */
  font-family: var(--font-barlow, 'Barlow', sans-serif);
}
```

- [ ] **Step 5: Run dev server and visually check one-pager preview**

```bash
npm run dev
```

Open `http://localhost:3000/one-pager` and confirm the document preview renders with correct heading sizes and no layout breakage.

- [ ] **Step 6: Commit**

```bash
git add app/one-pager/components/DocumentPreview.module.css
git commit -m "fix(document-preview): fix heading sizes, body font 18px, image radius 12px"
```

---

## Task 7: Fix `app/one-pager/page.module.css` — Page Title Size

**Files:**
- Modify: `app/one-pager/page.module.css`

- [ ] **Step 1: Read the pageTitle class**

```bash
grep -n "pageTitle\|font-size\|font-family" app/one-pager/page.module.css
```

- [ ] **Step 2: Update `.pageTitle` to slide-title scale**

```css
.pageTitle {
  font-family: var(--font-barlow-condensed, 'Barlow Condensed', sans-serif);
  font-size: 36px;     /* slide-title per brand spec — was 1.25rem/20px */
  font-weight: 500;
  text-transform: capitalize;
  color: var(--brand-primary, #1D1F4A);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/one-pager/page.module.css
git commit -m "fix(one-pager): page title to brand slide-title scale (36px Barlow Condensed)"
```

---

## Task 8: Import `compulocks.css` token file into globals

**Files:**
- Modify: `app/globals.css`

**Context:** `styles/tokens/compulocks.css` is the single source of truth for brand tokens. Verify it's imported into globals so the utility classes (`.section-heading`, `.content-card`, etc.) are available globally.

- [ ] **Step 1: Check current imports in globals.css**

```bash
grep -n "@import" app/globals.css
```

- [ ] **Step 2: Add compulocks import if missing**

If `styles/tokens/compulocks.css` is not already imported, add it at the top of globals.css alongside the existing brief-helper import:

```css
@import '../styles/tokens/compulocks.css';
@import '../styles/tokens/brief-helper.css';
```

- [ ] **Step 3: Verify no token name conflicts between files**

```bash
grep "^  --accent" styles/tokens/compulocks.css styles/tokens/brief-helper.css app/globals.css
```

Expected: `--accent` defined only once (in compulocks.css via alias), not redefined in globals.css

If there's a conflict, remove the duplicate from `globals.css` (prefer compulocks.css definition).

- [ ] **Step 4: Run full build**

```bash
npm run build 2>&1 | tail -30
```
Expected: clean build, no CSS errors

- [ ] **Step 5: Run tests**

```bash
npm test 2>&1 | tail -20
```
Expected: all tests pass (CSS changes don't affect JS tests)

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(globals): import compulocks.css as global brand token source"
```

---

## Task 9: Visual Smoke Test + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check each route**

Visit each route and verify:
- `http://localhost:3000/` — Dashboard uses Barlow font, navy colors, green buttons
- `http://localhost:3000/mrd` — MRD generator uses Barlow, no IBM Plex fallback visible
- `http://localhost:3000/one-pager` — One-pager preview shows 36px headings, 18px body, green CTA
- `http://localhost:3000/one-pager-beta` — Beta route consistent with above

- [ ] **Step 3: Check button colors**

Every primary button should be `#009966` (dark green), not `#0f766e` (teal). In browser DevTools, inspect a primary button and confirm computed `background-color` is `rgb(0, 153, 102)`.

- [ ] **Step 4: Check card rendering on one-pager**

Competitor cards should have: 24px radius, 1px border, 32px padding. Inspect in DevTools.

- [ ] **Step 5: Run full test suite one final time**

```bash
npm test
```
Expected: 178 tests pass (or more if tests were added)

- [ ] **Step 6: Final commit tag**

```bash
git add -A
git commit -m "chore: brand migration complete — Compulocks R&D AI Design Kit v1"
```

---

## Self-Review

### Spec Coverage
| Brand Kit Requirement | Task |
|---|---|
| `--compulocks-green-dark: #009966` | Task 1 ✅ |
| `--compulocks-green-light: #1db274` | Task 1 ✅ |
| `--compulocks-bg-light: #f2f2f2` | Task 1 + Task 2 ✅ |
| Barlow as default body font | Task 2 + Task 3 ✅ |
| Barlow Condensed on headings | Task 3 + Task 6 + Task 7 ✅ |
| Typography utility classes as globals | Task 1 ✅ |
| Card: 24px radius, 1px border, 32px padding | Task 4 + Task 5 ✅ |
| Card image: 12px border-radius | Task 6 ✅ |
| Body text: 18px | Task 6 ✅ |
| Remove teal accent (#0f766e) | Task 2 ✅ |
| Fragmented token systems unified | Task 8 ✅ |

### Known Non-Goals (out of scope)
- Slogan "DISPLAY. SECURE. ENGAGE." — no UI location defined, deferred
- 69px section-heading in DocumentPreview — 69px is slides scale; document context uses 36px intentionally
- Dark mode brand color variants — deferred to follow-up sprint
