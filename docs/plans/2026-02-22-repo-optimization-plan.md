# Repo Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all mrd-producer-webapp features under the Compulocks brand design system (navy, Barlow), merge all worktrees into a single clean `main` branch, and extract the one-pager into a standalone deployable repo.

**Architecture:** Four sequential phases — (1) create CSS token system, (2) apply it to all features, (3) merge all branches + delete worktrees, (4) extract standalone one-pager repo. Each phase must be complete before starting the next. All work happens on `feature/unified-dashboard` until Phase 3 merges it to `main`.

**Tech Stack:** Next.js 14 App Router, CSS Modules, CSS custom properties, Barlow/Barlow Condensed (Google Fonts), Git worktrees.

---

## PHASE 1 — Compulocks Design System

### Task 1: Create the token file

**Files:**
- Create: `styles/tokens/compulocks.css`

**Step 1: Create the directory and file**

```bash
mkdir -p styles/tokens
```

Then write `styles/tokens/compulocks.css` with this exact content:

```css
/* Compulocks Brand Design System — Single Source of Truth */
/* All components reference these variables. Never hardcode brand values. */

:root {
  /* ─── Brand Colors ─────────────────────────────────── */
  --brand-primary: #1D1F4A;
  --brand-highlight: #243469;
  --brand-surface: #f4f5f9;
  --brand-surface-alt: #fafafa;

  /* ─── Typography ───────────────────────────────────── */
  --font-body: 'Barlow', sans-serif;
  --font-heading: 'Barlow Condensed', sans-serif;

  --text-xs:   12px;
  --text-sm:   13px;
  --text-base: 14px;
  --text-lg:   16px;
  --text-xl:   18px;
  --text-2xl:  22px;

  --leading-tight:   1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.6;

  /* ─── Spacing (8px grid) ───────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* ─── Border Radius ────────────────────────────────── */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 9999px;

  /* ─── Borders ──────────────────────────────────────── */
  --border-color:        #d1d5db;
  --border-color-strong: #9ca3af;

  /* ─── Shadows ──────────────────────────────────────── */
  --shadow-sm: 0 1px 3px rgba(29, 31, 74, 0.08);
  --shadow-md: 0 4px 12px rgba(29, 31, 74, 0.12);
  --shadow-lg: 0 8px 24px rgba(29, 31, 74, 0.16);

  /* ─── Semantic Text ────────────────────────────────── */
  --text-primary:   var(--brand-primary);
  --text-secondary: #374151;
  --text-muted:     #6b7280;

  /* ─── Component Tokens ─────────────────────────────── */
  --bg-chip:    #e8ecf4;
  --focus-ring: 0 0 0 2px rgba(36, 52, 105, 0.2);

  /* ─── Transitions ──────────────────────────────────── */
  --duration-fast:   120ms;
  --duration-normal: 200ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

**Step 2: Verify the file exists**

```bash
cat styles/tokens/compulocks.css | head -5
```
Expected output: `/* Compulocks Brand Design System...`

**Step 3: Commit**

```bash
git add styles/tokens/compulocks.css
git commit -m "feat(design): add Compulocks brand token file"
```

---

### Task 2: Update globals.css to use Compulocks tokens

**Files:**
- Modify: `app/globals.css`

**Step 1: Replace the entire `:root` block and body styles**

Open `app/globals.css`. Make these exact changes:

1. Add `@import '../styles/tokens/compulocks.css';` as the first line, before the CSS Reset comment.

2. Replace the `:root` block (lines 17–30) with:
```css
:root {
  /* Legacy aliases — map old variable names to new token system */
  --background: var(--brand-surface);
  --foreground: var(--brand-primary);
  --muted:      var(--text-muted);
  --surface:    #ffffff;
  --border:     var(--border-color);
  --accent:     var(--brand-primary);
  --accent-strong: var(--brand-highlight);
  --accent-soft:   rgba(29, 31, 74, 0.10);
  --radius:     var(--radius-md);
  --shadow:     var(--shadow-md);
  --font-sans:  var(--font-body);
  --font-mono:  'IBM Plex Mono', 'SF Mono', Menlo, monospace;
}
```

3. Remove the entire dark mode block (`@media (prefers-color-scheme: dark)` block, lines 33–45) — Compulocks brand has no dark mode spec.

4. Replace the `body` background-image lines (the teal radial gradients, lines 62–65):
```css
  background-image:
    radial-gradient(70% 50% at 12% 0%, rgba(29, 31, 74, 0.04), transparent 60%),
    radial-gradient(50% 40% at 90% 5%, rgba(36, 52, 105, 0.03), transparent 55%);
```

5. Replace `.btn-primary` rule:
```css
.btn-primary {
  background-color: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: var(--radius-sm);
}

.btn-primary:hover {
  background-color: var(--brand-highlight);
  border-color: var(--brand-highlight);
}
```

6. Replace `.btn-ghost` rule:
```css
.btn-ghost {
  background-color: transparent;
  border-color: var(--border-color);
  color: var(--brand-primary);
  font-family: var(--font-heading);
  font-size: var(--text-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-radius: var(--radius-sm);
}

.btn-ghost:hover {
  border-color: var(--brand-primary);
  background-color: var(--bg-chip);
}
```

7. Replace `.field label` rule:
```css
.field label {
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}
```

8. Replace `.eyebrow` rule:
```css
.eyebrow {
  font-family: var(--font-heading);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--text-muted);
}
```

9. Update the dark mode media queries at bottom (lines 435–449 and 451+) — remove the dark mode `.sources` and `.result-body` overrides since we're removing dark mode support.

10. Update `.sources` background:
```css
.sources {
  padding: 0.75rem 1rem;
  background-color: var(--bg-chip);
  border-radius: var(--radius-sm);
}
```

11. Update `:focus-visible`:
```css
:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
```

12. Update input focus:
```css
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: var(--focus-ring);
}
```

**Step 2: Verify build still compiles**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): migrate globals.css to Compulocks brand tokens"
```

---

### Task 3: Update layout.tsx to load Barlow fonts

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Replace font imports and body className**

Replace the current content of `app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MRD Producer - AI-Powered Market Research Documents',
  description: 'Generate comprehensive Market Requirements Documents with AI assistance',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1D1F4A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${barlow.variable} ${barlowCondensed.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(design): switch root font to Barlow + Barlow Condensed"
```

---

## PHASE 2 — Apply Design System to All Features

### Task 4: Refactor one-pager CSS Modules (from worktree)

> NOTE: The one-pager currently lives in `.worktrees/one-pager-integrate/app/one-pager/`. We are working on `feature/unified-dashboard`, so we need to copy the one-pager into the main tree first (see Task 9 which does the git merge). However, to keep things clean, we do the CSS refactor on the worktree files directly NOW so that when we merge in Task 9, they arrive already refactored.

**Files to modify** (all in `.worktrees/one-pager-integrate/app/one-pager/components/`):
- `CheckboxGroup.module.css`
- `ChipInput.module.css`
- `CompetitorInput.module.css`
- `DocumentPreview.module.css`
- `DynamicRoleSelector.module.css`
- `FeatureSelector.module.css`
- `PhotoPicker.module.css`
- `SplitLayout.module.css`
- `TextFieldWithExpand.module.css`
- `app/one-pager/page.module.css`

**Step 1: Run the find-replace across all module files**

Run each of these sed commands in sequence:

```bash
cd ".worktrees/one-pager-integrate/app/one-pager"

# Brand colors
find . -name "*.module.css" -exec sed -i 's/#1D1F4A/var(--brand-primary)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#1d1f4a/var(--brand-primary)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#243469/var(--brand-highlight)/g' {} +

# Border radius
find . -name "*.module.css" -exec sed -i 's/border-radius: 6px/border-radius: var(--radius-sm)/g' {} +
find . -name "*.module.css" -exec sed -i 's/border-radius: 8px/border-radius: var(--radius-md)/g' {} +
find . -name "*.module.css" -exec sed -i 's/border-radius: 16px/border-radius: var(--radius-full)/g' {} +

# Border colors
find . -name "*.module.css" -exec sed -i 's/#d1d5db/var(--border-color)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#e5e7eb/var(--border-color)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#e2e8f0/var(--border-color)/g' {} +

# Text colors
find . -name "*.module.css" -exec sed -i 's/#6b7280/var(--text-muted)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#374151/var(--text-secondary)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#111827/var(--brand-primary)/g' {} +

# Chip background
find . -name "*.module.css" -exec sed -i 's/#e8ecf4/var(--bg-chip)/g' {} +
find . -name "*.module.css" -exec sed -i 's/rgba(36,52,105,0.15)/var(--focus-ring)/g' {} +
find . -name "*.module.css" -exec sed -i 's/rgba(36, 52, 105, 0.15)/var(--focus-ring)/g' {} +

# Surfaces
find . -name "*.module.css" -exec sed -i 's/#fafafa/var(--brand-surface-alt)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#f4f5f9/var(--brand-surface)/g' {} +
find . -name "*.module.css" -exec sed -i 's/#f9fafb/var(--brand-surface)/g' {} +

# Font sizes
find . -name "*.module.css" -exec sed -i 's/font-size: 13px/font-size: var(--text-sm)/g' {} +
find . -name "*.module.css" -exec sed -i 's/font-size: 14px/font-size: var(--text-base)/g' {} +
find . -name "*.module.css" -exec sed -i 's/font-size: 12px/font-size: var(--text-xs)/g' {} +
```

**Step 2: Verify no hardcoded brand colors remain**

```bash
grep -r "#1D1F4A\|#1d1f4a\|#243469" . --include="*.module.css"
```
Expected: no output (empty).

**Step 3: Commit in the worktree**

```bash
git add app/one-pager/
git commit -m "feat(design): refactor one-pager CSS Modules to use brand tokens"
```

**Step 4: Return to main tree**

```bash
cd "C:/Users/OriShavit/Documents/GitHub/mrd-producer-webapp"
```

---

### Task 5: Restyle login page

**Files:**
- Modify: `app/login/page.tsx`

**Step 1: Update inline styles to use brand tokens**

Replace the content of `app/login/page.tsx` with:

```tsx
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="page">
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>MRD Producer</p>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Sign In
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: 'var(--text-base)' }}>
            Access your tools and documents
          </p>
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(design): apply brand tokens to login page"
```

---

### Task 6: Restyle dashboard components

**Files:**
- Modify: `app/components/TopBar.tsx`
- Modify: `app/components/ToolCard.tsx`
- Modify: `app/components/DocumentsTable.tsx`
- Modify: `app/page.tsx`

**Step 1: Update TopBar.tsx**

Replace inline style values in `app/components/TopBar.tsx`:
- `background: 'var(--surface)'` → keep (already maps to white via alias)
- Sign out button style: change `color: 'var(--muted)'` → `color: 'var(--text-muted)'` and `border-radius: 'var(--radius)'` → `borderRadius: 'var(--radius-sm)'`
- Add to sign out button: `fontFamily: 'var(--font-heading)'`, `fontSize: 'var(--text-xs)'`, `textTransform: 'uppercase' as const`, `letterSpacing: '0.06em'`

**Step 2: Update ToolCard.tsx**

In `app/components/ToolCard.tsx`:
- Change `background: 'var(--surface)'` → keep
- Change `border: '1px solid var(--border)'` → `border: '1px solid var(--border-color)'`
- Change `borderRadius: 'var(--radius)'` → `borderRadius: 'var(--radius-md)'`
- Change `boxShadow: '0 1px 4px rgba(0,0,0,0.04)'` → `boxShadow: 'var(--shadow-sm)'`
- Badge colors: change `background: 'var(--accent-soft)'` → `background: 'var(--bg-chip)'`, `color: 'var(--accent)'` → `color: 'var(--brand-primary)'`
- Title: add `fontFamily: 'var(--font-heading)'`, `textTransform: 'uppercase' as const`, `letterSpacing: '0.04em'`
- Add CSS transition to the anchor: `transition: 'box-shadow var(--duration-normal) var(--ease-out), transform var(--duration-fast) var(--ease-out)'`

Add a `<style>` tag or use `:global` — simpler: just add a hover effect via `onMouseEnter/Leave`:
```tsx
// In ToolCard, add these props to the Link element:
onMouseEnter={(e) => {
  (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-md)';
  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
}}
onMouseLeave={(e) => {
  (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-sm)';
  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
}}
```

**Step 3: Update DocumentsTable.tsx**

In `app/components/DocumentsTable.tsx`:
- `background: doc.status === 'complete' ? 'var(--accent-soft)' : 'rgba(0,0,0,0.06)'` → `background: doc.status === 'complete' ? 'var(--bg-chip)' : 'rgba(0,0,0,0.05)'`
- `color: doc.status === 'complete' ? 'var(--accent)' : 'var(--muted)'` → `color: doc.status === 'complete' ? 'var(--brand-primary)' : 'var(--text-muted)'`

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

**Step 5: Commit**

```bash
git add app/components/ app/page.tsx
git commit -m "feat(design): apply brand tokens to dashboard components"
```

---

### Task 7: Restyle MRD page

**Files:**
- Modify: `app/mrd/page.tsx`

**Step 1: Update inline styles and class names**

In `app/mrd/page.tsx`:
- The `.btn-primary`, `.btn-ghost`, `.card`, `.field`, `.eyebrow` classes already pick up the new tokens from globals.css automatically — nothing to change there.
- Update the spinner border color: `border-top-color` will use `var(--brand-primary)` via the updated globals.
- Update the sources div background if hardcoded: change any `rgba(15, 118, 110, 0.08)` → `var(--bg-chip)`.
- In the result card heading, add: `fontFamily: 'var(--font-heading)'`, `textTransform: 'uppercase'`, `letterSpacing: '0.04em'`.

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

**Step 3: Commit**

```bash
git add app/mrd/page.tsx
git commit -m "feat(design): apply brand tokens to MRD page"
```

---

## PHASE 3 — Merge to main + cleanup

### Task 8: Merge feature/unified-dashboard to main

**Step 1: Switch to main**

```bash
git checkout main
```

**Step 2: Merge the dashboard branch**

```bash
git merge feature/unified-dashboard --no-ff -m "feat: merge unified-dashboard — auth, dashboard, design system, docs API"
```

**Step 3: Verify build on main**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

---

### Task 9: Merge one-pager-integrate to main

**Step 1: Merge the branch**

```bash
git merge feat/one-pager-integrate --no-ff -m "feat: merge one-pager-integrate — one-pager generator with 9 components + DOCX export"
```

**Step 2: Resolve conflicts**

Most likely conflicts:
- `app/page.tsx` — run `git checkout --ours app/page.tsx` (keep the dashboard version)
- `app/globals.css` — run `git checkout --ours app/globals.css` (keep the Compulocks version)
- `app/layout.tsx` — run `git checkout --ours app/layout.tsx` (keep the Barlow version)
- `app/api/generate/route.ts` — review manually; keep the more recent version from main

After resolving:
```bash
git add .
git commit -m "chore: resolve merge conflicts keeping dashboard + Compulocks design"
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

If TypeScript errors appear, fix them — they will likely be missing types from the one-pager components. Common fixes:
- Missing `'use client'` directive → add it to affected components
- Type errors in one-pager `page.tsx` → check imports resolve correctly

---

### Task 10: Merge product-brief-helper to main

**Step 1: Add the external worktree as a git remote temporarily**

```bash
git remote add brief-worktree "C:/Users/OriShavit/Documents/GitHub/mrd-producer-webapp-product-brief"
git fetch brief-worktree
git merge brief-worktree/feature/product-brief-helper --no-ff -m "feat: merge product-brief-helper — brief helper with 14 components"
```

**Step 2: Resolve conflicts (same strategy as Task 9)**

```bash
git checkout --ours app/page.tsx
git checkout --ours app/globals.css
git checkout --ours app/layout.tsx
git add .
git commit -m "chore: resolve merge conflicts after brief-helper merge"
```

**Step 3: Remove temporary remote**

```bash
git remote remove brief-worktree
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

---

### Task 11: Clean up intermediate branches and worktrees

**Step 1: Remove the worktree directories**

```bash
git worktree remove .worktrees/one-pager-ui --force
git worktree remove .worktrees/one-pager-state --force
git worktree remove .worktrees/one-pager-scraper --force
git worktree remove .worktrees/one-pager-integrate --force
```

**Step 2: Delete intermediate branches**

```bash
git branch -d feat/one-pager-ui
git branch -d feat/one-pager-state
git branch -d feat/one-pager-scraper
git branch -d feat/one-pager-integrate
git branch -d feature/unified-dashboard
```

If any `-d` fails (unmerged), use `-D` only after confirming the content is in main.

**Step 3: Archive the M3 design stash, then drop it**

```bash
# Create a tag so the work is preserved in history
git tag archive/design-material-3-expressive
git stash drop
```

**Step 4: Verify worktrees are clean**

```bash
git worktree list
```
Expected output: only the main repo path, on `main`.

**Step 5: Commit .gitignore update (remove .worktrees entry if present)**

```bash
git status
# If .worktrees/ shows as deleted, stage it
git add -A
git commit -m "chore: remove worktrees and intermediate branches, clean repo"
```

---

### Task 12: Verify final state of main

**Step 1: Full build**

```bash
npm run build
```
Expected: `✓ Compiled successfully`, all routes present:
- `ƒ /` (dashboard)
- `○ /login`
- `○ /mrd`
- `○ /one-pager`
- `ƒ /brief-helper`
- `ƒ /brief-helper/start`

**Step 2: No hardcoded brand colors anywhere in app/**

```bash
grep -r "#1D1F4A\|#1d1f4a\|#0f766e\|#0b5f59" app/ --include="*.css" --include="*.module.css"
```
Expected: no output.

**Step 3: No worktrees**

```bash
git worktree list
```
Expected: only `main` repo.

**Step 4: Commit verification checkpoint**

```bash
git commit --allow-empty -m "chore: phase 3 complete — all features merged, worktrees removed"
```

---

## PHASE 4 — Standalone One-Pager Repo

### Task 13: Create the standalone one-pager repo directory

**Step 1: Create new directory and initialize**

```bash
cd "C:/Users/OriShavit/Documents/GitHub"
mkdir mrd-one-pager
cd mrd-one-pager
git init
```

**Step 2: Copy source files from main repo**

```bash
# Copy Next.js config files
cp "../mrd-producer-webapp/next.config.js" .
cp "../mrd-producer-webapp/next.config.mjs" . 2>/dev/null || true
cp "../mrd-producer-webapp/tsconfig.json" .
cp "../mrd-producer-webapp/postcss.config.js" . 2>/dev/null || true
cp "../mrd-producer-webapp/.eslintrc.json" . 2>/dev/null || true

# Copy design system
mkdir -p styles/tokens
cp "../mrd-producer-webapp/styles/tokens/compulocks.css" styles/tokens/

# Copy app foundation
mkdir -p app
cp "../mrd-producer-webapp/app/layout.tsx" app/
cp "../mrd-producer-webapp/app/globals.css" app/

# Copy one-pager feature
cp -r "../mrd-producer-webapp/app/one-pager" app/

# Copy API routes (one-pager only)
mkdir -p app/api
cp -r "../mrd-producer-webapp/app/api/one-pager" app/api/

# Copy lib (only what one-pager needs)
mkdir -p lib/providers
cp "../mrd-producer-webapp/lib/providers/types.ts" lib/providers/
cp "../mrd-producer-webapp/lib/providers/gemini-provider.ts" lib/providers/
cp "../mrd-producer-webapp/lib/providers/provider-chain.ts" lib/providers/
cp "../mrd-producer-webapp/lib/sanitize.ts" lib/
cp "../mrd-producer-webapp/lib/schemas.ts" lib/ 2>/dev/null || true
```

**Step 3: Create root page.tsx pointing to one-pager**

Create `app/page.tsx`:

```tsx
import OnePagerPage from './one-pager/page';

export default OnePagerPage;
```

Or if the one-pager page uses `'use client'`, redirect instead:

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/one-pager');
}
```

Check which approach works by looking at `app/one-pager/page.tsx` — if it has `'use client'`, use the redirect approach.

---

### Task 14: Write package.json for one-pager repo

**Step 1: Create `package.json`**

```json
{
  "name": "mrd-one-pager",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@google/genai": "^1.39.0",
    "core-js": "^3.36.0",
    "docx": "^9.5.1",
    "next": "^14.2.0",
    "openai": "^4.76.1",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "typescript": "^5.3.0"
  }
}
```

Note: removed `@vercel/postgres`, `next-auth`, `googleapis`, `@auth/core`, `@react-pdf/renderer` — not needed.

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# Required: Google Gemini API key for AI generation
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional: Anthropic Claude (fallback AI provider)
ANTHROPIC_API_KEY=

# Optional: OpenAI GPT (fallback AI provider)
OPENAI_API_KEY=
EOF
```

---

### Task 15: Verify standalone repo builds

**Step 1: Run build**

```bash
npm run build 2>&1
```

Fix any TypeScript errors that appear (likely missing imports from the main repo that weren't copied). Common issues:
- Missing `lib/gemini.ts` → copy it: `cp ../mrd-producer-webapp/lib/gemini.ts lib/`
- Missing `lib/document-generator.ts` → copy if one-pager uses it: `cp ../mrd-producer-webapp/lib/document-generator.ts lib/`
- Path alias `@/*` not configured → check `tsconfig.json` has `"paths": { "@/*": ["./*"] }`

**Step 2: Confirm no auth references**

```bash
grep -r "next-auth\|@auth\|signIn\|useSession\|getServerSession" app/ lib/ --include="*.ts" --include="*.tsx"
```
Expected: no output.

**Step 3: Confirm no Postgres references**

```bash
grep -r "vercel/postgres\|@vercel/postgres" app/ lib/ --include="*.ts" --include="*.tsx"
```
Expected: no output.

**Step 4: Test dev server starts**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | head -5
kill %1
```
Expected: HTML response with no crash.

---

### Task 16: Initialize git history and create README

**Step 1: Create README.md**

```bash
cat > README.md << 'EOF'
# MRD One-Pager Generator

AI-powered product one-pager generator. Built with Next.js 14, Google Gemini, and the Compulocks brand design system.

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `npm run dev`

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Gemini API key for AI generation |
| `ANTHROPIC_API_KEY` | No | Claude fallback provider |
| `OPENAI_API_KEY` | No | OpenAI fallback provider |

## Deploy

Deploy to Vercel: connect this repo, set environment variables in Vercel dashboard.

## Tech Stack

- Next.js 14 App Router
- Google Gemini (`@google/genai`)
- Compulocks brand design system (navy, Barlow Condensed)
- CSS Modules
EOF
```

**Step 2: Initial commit**

```bash
git add .
git commit -m "$(cat <<'EOF'
feat: initial one-pager standalone repo

Extracted from mrd-producer-webapp. Includes:
- One-pager generator with 9 components
- Compulocks brand design system (styles/tokens/compulocks.css)
- Barlow/Barlow Condensed fonts
- AI providers: Gemini, Claude, OpenAI (fallback chain)
- No auth dependency, no dashboard, no Postgres

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 3: Create GitHub repo and push**

```bash
gh repo create mrd-one-pager --private --source=. --remote=origin --push
```

If `gh` CLI is not available, create the repo manually on GitHub then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/mrd-one-pager.git
git branch -M main
git push -u origin main
```

---

## Success Criteria Checklist

After all tasks complete, verify:

```bash
# 1. Main repo builds clean
cd "C:/Users/OriShavit/Documents/GitHub/mrd-producer-webapp"
npm run build 2>&1 | grep -E "✓|error"

# 2. No hardcoded brand colors
grep -r "#1D1F4A\|#1d1f4a\|#0f766e" app/ --include="*.css" --include="*.module.css" | wc -l
# Expected: 0

# 3. Only main worktree
git worktree list
# Expected: 1 line

# 4. Standalone repo builds
cd "C:/Users/OriShavit/Documents/GitHub/mrd-one-pager"
npm run build 2>&1 | grep -E "✓|error"

# 5. No auth in standalone
grep -r "next-auth" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l
# Expected: 0
```
