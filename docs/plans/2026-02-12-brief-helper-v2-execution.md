# Brief Helper V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Brief Helper from manual 6-field form into intelligent guided experience with initial description seeding, split-screen layout, collapsible fields, and live preview.

**Architecture:** Start page captures natural language description → Batch extraction agent (single AI call) populates all 6 fields → Split-screen interface (input left, suggestions/preview right) → Collapsible field sections with "Done" button → Toggle between AI suggestions and formatted document preview.

**Tech Stack:** Next.js 14, React 18, TypeScript 5, Gemini 2.5 Pro (primary), GPT-4o-mini (fallback), CSS Modules with design tokens

---

## Prerequisites

**Verify Environment:**
- On branch: `feature/brief-helper`
- Dev server running: `npm run dev`
- Tests passing: `npm test`
- Environment vars: `GOOGLE_API_KEY`, `OPENAI_API_KEY` set

**Read First:**
- Design doc: `docs/plans/2026-02-12-brief-helper-v2-design.md`
- Existing Brief Helper state: `app/brief-helper/lib/brief-state.ts`
- Existing components: `app/brief-helper/components/`

---

## Task 1: Update Gemini Provider Model

**Files:**
- Modify: `lib/providers/gemini-provider.ts:20`

**Step 1: Update model constant**

```typescript
// Line 20 - Change from Flash to Pro
const DEFAULT_MODEL = 'gemini-2.5-pro';
```

**Step 2: Verify change**

Run: `grep -n "DEFAULT_MODEL" lib/providers/gemini-provider.ts`
Expected: Line 20 shows `'gemini-2.5-pro'`

**Step 3: Test provider instantiation**

Run: `npm run dev`
Check console for: `[ProviderChain] Registered provider: gemini`
No errors should appear

**Step 4: Commit**

```bash
git add lib/providers/gemini-provider.ts
git commit -m "chore: switch Gemini to 2.5 Pro model

Update DEFAULT_MODEL from gemini-2.5-flash to gemini-2.5-pro for
better extraction quality and consistent free tier access.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update Provider Configuration

**Files:**
- Modify: `config/agents/default.yaml:3-20`

**Step 1: Update Gemini config**

```yaml
providers:
  priority:
    - name: gemini
      enabled: true
      priority: 0
      config:
        model: gemini-2.5-pro
        temperature: 0.3
```

**Step 2: Update OpenAI config**

```yaml
    - name: openai
      enabled: true
      priority: 1
      config:
        model: gpt-4o-mini
        temperature: 0.3
```

**Step 3: Remove Anthropic section**

Delete entire `anthropic` provider block (if present)

**Step 4: Verify YAML syntax**

Run: `npm run dev`
Check console for config load success
No YAML parsing errors

**Step 5: Commit**

```bash
git add config/agents/default.yaml
git commit -m "chore: update provider config - Gemini Pro + GPT-4o-mini

- Gemini 2.5 Pro as primary (priority 0)
- GPT-4o-mini as fallback (priority 1)
- Remove Anthropic/Claude provider

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Delete Anthropic Provider

**Files:**
- Delete: `lib/providers/anthropic-provider.ts`

**Step 1: Remove provider file**

Run: `git rm lib/providers/anthropic-provider.ts`

**Step 2: Verify no imports remain**

Run: `grep -r "anthropic-provider" lib/ app/ agent/`
Expected: No results (empty output)

**Step 3: Verify tests still pass**

Run: `npm test -- --testPathPattern=provider`
Expected: All provider tests pass

**Step 4: Commit**

```bash
git commit -m "chore: remove Anthropic provider

Anthropic/Claude removed from provider chain. Using Gemini 2.5 Pro
primary with GPT-4o-mini fallback only.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Provider Chain Registration

**Files:**
- Modify: `lib/providers/provider-chain.ts:1-50`

**Step 1: Remove Anthropic import**

Find and delete line:
```typescript
import { AnthropicProvider } from './anthropic-provider';
```

**Step 2: Remove Anthropic registration**

In `getProviderChain()` function, remove:
```typescript
if (config?.providers?.anthropic?.enabled) {
  chain.registerProvider(new AnthropicProvider(), config.providers.anthropic.priority);
}
```

**Step 3: Update provider list comment**

Change comment from:
```typescript
// Providers: Gemini, Claude, OpenAI
```
To:
```typescript
// Providers: Gemini (2.5 Pro), OpenAI (GPT-4o-mini)
```

**Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors, build succeeds

**Step 5: Commit**

```bash
git add lib/providers/provider-chain.ts
git commit -m "chore: update provider chain - remove Anthropic

Remove Anthropic import and registration from provider chain.
Update comments to reflect current provider set.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Test Provider Fallback

**Manual Test - No Commit**

**Step 1: Temporarily break Gemini**

Create `.env.local.backup`:
```bash
cp .env.local .env.local.backup
```

Set invalid key in `.env.local`:
```
GOOGLE_API_KEY=invalid_key_for_testing
```

**Step 2: Make test API call**

```bash
curl -X POST http://localhost:3000/api/brief/extract \
  -H "Content-Type: application/json" \
  -d '{"fieldType":"what","text":"iPad stand"}'
```

**Step 3: Check logs**

Expected console output:
```
[ProviderChain] Provider gemini failed
[ProviderChain] Trying fallback: openai
```

**Step 4: Restore environment**

```bash
mv .env.local.backup .env.local
```

**Step 5: Verify restoration**

Retry API call, should succeed with Gemini

---

## Task 6: Add State Fields - Type Definitions

**Files:**
- Modify: `app/brief-helper/lib/brief-state.ts:1-30`

**Step 1: Update BriefState interface**

Add new fields to interface:
```typescript
export interface BriefState {
  // Existing
  fields: Record<BriefField, FieldState>;

  // NEW - Add these
  initialDescription: string;
  activeFieldId: BriefField | null;
  previewMode: 'suggestions' | 'document';
  processingFields: BriefField[];
  collapsedFields: BriefField[];
}
```

**Step 2: Update FieldState interface**

Add hiddenGaps field:
```typescript
export interface FieldState {
  rawText: string;
  bulletPoints: string[];
  gaps: Gap[];
  hiddenGaps: string[];  // NEW
  isComplete: boolean;
  aiProcessing: boolean;
}
```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Type errors (expected - we'll fix in next steps)

**Step 4: Commit**

```bash
git add app/brief-helper/lib/brief-state.ts
git commit -m "feat(brief): add V2 state fields - types only

Add new state fields for V2 features:
- initialDescription: from start page
- activeFieldId: currently focused field
- previewMode: suggestions vs document toggle
- processingFields: batch extraction progress
- collapsedFields: fields marked Done
- hiddenGaps: per-field hidden gap IDs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add State Action Types

**Files:**
- Modify: `app/brief-helper/lib/brief-state.ts:31-60`

**Step 1: Add new action types to union**

```typescript
export type BriefAction =
  // Existing actions...
  | { type: 'SET_RAW_TEXT'; fieldId: BriefField; text: string }
  | { type: 'SET_BULLET_POINTS'; fieldId: BriefField; bullets: string[] }
  // ... other existing actions

  // NEW - Add these
  | { type: 'SET_INITIAL_DESCRIPTION'; payload: string }
  | { type: 'SET_ACTIVE_FIELD'; fieldId: BriefField | null }
  | { type: 'SET_PREVIEW_MODE'; mode: 'suggestions' | 'document' }
  | { type: 'SET_FIELD_EXTRACTION'; fieldId: BriefField; bullets: string[]; gaps: Gap[] }
  | { type: 'TOGGLE_FIELD_COLLAPSE'; fieldId: BriefField }
  | { type: 'HIDE_GAP'; fieldId: BriefField; gapId: string }
  | { type: 'BATCH_EXTRACTION_START'; fields: BriefField[] }
  | { type: 'BATCH_EXTRACTION_COMPLETE' };
```

**Step 2: Verify TypeScript recognizes new actions**

Run: `npx tsc --noEmit`
Expected: Still type errors (reducer cases not implemented yet)

**Step 3: Commit**

```bash
git add app/brief-helper/lib/brief-state.ts
git commit -m "feat(brief): add V2 action types

Add action types for V2 state management:
- SET_INITIAL_DESCRIPTION, SET_ACTIVE_FIELD, SET_PREVIEW_MODE
- SET_FIELD_EXTRACTION, TOGGLE_FIELD_COLLAPSE, HIDE_GAP
- BATCH_EXTRACTION_START, BATCH_EXTRACTION_COMPLETE

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Initial State

**Files:**
- Modify: `app/brief-helper/lib/brief-state.ts:61-100`

**Step 1: Find initial state definition**

Locate the `initialState` or default state object

**Step 2: Add new fields with defaults**

```typescript
const initialState: BriefState = {
  fields: {
    what: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
    who: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
    where: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
    moq: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
    mustHaves: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
    niceToHaves: { rawText: '', bulletPoints: [], gaps: [], hiddenGaps: [], isComplete: false, aiProcessing: false },
  },
  // NEW
  initialDescription: '',
  activeFieldId: null,
  previewMode: 'suggestions',
  processingFields: [],
  collapsedFields: [],
};
```

**Step 3: Verify state structure**

Run: `npx tsc --noEmit`
Expected: Still errors (reducer cases needed)

**Step 4: Commit**

```bash
git add app/brief-helper/lib/brief-state.ts
git commit -m "feat(brief): update initial state with V2 defaults

Add default values for new V2 state fields:
- initialDescription: empty string
- activeFieldId: null (no field focused)
- previewMode: suggestions (default view)
- processingFields: empty array
- collapsedFields: empty array
- hiddenGaps: empty array per field

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Implement New Reducer Cases

**Files:**
- Modify: `app/brief-helper/lib/brief-state.ts:101-200`

**Step 1: Add SET_INITIAL_DESCRIPTION case**

```typescript
case 'SET_INITIAL_DESCRIPTION':
  return { ...state, initialDescription: action.payload };
```

**Step 2: Add SET_ACTIVE_FIELD case**

```typescript
case 'SET_ACTIVE_FIELD':
  return { ...state, activeFieldId: action.fieldId };
```

**Step 3: Add SET_PREVIEW_MODE case**

```typescript
case 'SET_PREVIEW_MODE':
  return { ...state, previewMode: action.mode };
```

**Step 4: Add SET_FIELD_EXTRACTION case**

```typescript
case 'SET_FIELD_EXTRACTION':
  return {
    ...state,
    fields: {
      ...state.fields,
      [action.fieldId]: {
        ...state.fields[action.fieldId],
        bulletPoints: action.bullets,
        gaps: action.gaps,
      },
    },
  };
```

**Step 5: Add TOGGLE_FIELD_COLLAPSE case**

```typescript
case 'TOGGLE_FIELD_COLLAPSE': {
  const isCollapsed = state.collapsedFields.includes(action.fieldId);
  return {
    ...state,
    collapsedFields: isCollapsed
      ? state.collapsedFields.filter((f) => f !== action.fieldId)
      : [...state.collapsedFields, action.fieldId],
  };
}
```

**Step 6: Add HIDE_GAP case**

```typescript
case 'HIDE_GAP':
  return {
    ...state,
    fields: {
      ...state.fields,
      [action.fieldId]: {
        ...state.fields[action.fieldId],
        hiddenGaps: [
          ...state.fields[action.fieldId].hiddenGaps,
          action.gapId,
        ],
      },
    },
  };
```

**Step 7: Add BATCH_EXTRACTION cases**

```typescript
case 'BATCH_EXTRACTION_START':
  return { ...state, processingFields: action.fields };

case 'BATCH_EXTRACTION_COMPLETE':
  return { ...state, processingFields: [] };
```

**Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 9: Commit**

```bash
git add app/brief-helper/lib/brief-state.ts
git commit -m "feat(brief): implement V2 reducer cases

Implement all V2 action handlers in reducer:
- SET_INITIAL_DESCRIPTION: store start page description
- SET_ACTIVE_FIELD: track focused field
- SET_PREVIEW_MODE: toggle suggestions/document
- SET_FIELD_EXTRACTION: batch populate fields
- TOGGLE_FIELD_COLLAPSE: expand/collapse field sections
- HIDE_GAP: track hidden gaps per field
- BATCH_EXTRACTION_START/COMPLETE: loading state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Write State Reducer Tests

**Files:**
- Create: `__tests__/app/brief-helper/lib/brief-state.test.ts`

**Step 1: Write test file structure**

```typescript
import { briefReducer, initialBriefState } from '@/app/brief-helper/lib/brief-state';
import type { BriefAction, BriefState } from '@/app/brief-helper/lib/brief-state';

describe('BriefState Reducer - V2 Actions', () => {
  let state: BriefState;

  beforeEach(() => {
    state = { ...initialBriefState };
  });

  // Tests go here
});
```

**Step 2: Write SET_INITIAL_DESCRIPTION test**

```typescript
test('SET_INITIAL_DESCRIPTION updates state', () => {
  const action: BriefAction = {
    type: 'SET_INITIAL_DESCRIPTION',
    payload: 'iPad stand for retail',
  };

  const newState = briefReducer(state, action);

  expect(newState.initialDescription).toBe('iPad stand for retail');
});
```

**Step 3: Write SET_ACTIVE_FIELD test**

```typescript
test('SET_ACTIVE_FIELD updates activeFieldId', () => {
  const action: BriefAction = {
    type: 'SET_ACTIVE_FIELD',
    fieldId: 'what',
  };

  const newState = briefReducer(state, action);

  expect(newState.activeFieldId).toBe('what');
});

test('SET_ACTIVE_FIELD can clear active field', () => {
  const stateWithActive = { ...state, activeFieldId: 'what' as const };
  const action: BriefAction = {
    type: 'SET_ACTIVE_FIELD',
    fieldId: null,
  };

  const newState = briefReducer(stateWithActive, action);

  expect(newState.activeFieldId).toBeNull();
});
```

**Step 4: Write TOGGLE_FIELD_COLLAPSE tests**

```typescript
test('TOGGLE_FIELD_COLLAPSE adds field to collapsedFields', () => {
  const action: BriefAction = {
    type: 'TOGGLE_FIELD_COLLAPSE',
    fieldId: 'what',
  };

  const newState = briefReducer(state, action);

  expect(newState.collapsedFields).toContain('what');
});

test('TOGGLE_FIELD_COLLAPSE removes field from collapsedFields', () => {
  const stateWithCollapsed = {
    ...state,
    collapsedFields: ['what' as const],
  };
  const action: BriefAction = {
    type: 'TOGGLE_FIELD_COLLAPSE',
    fieldId: 'what',
  };

  const newState = briefReducer(stateWithCollapsed, action);

  expect(newState.collapsedFields).not.toContain('what');
});
```

**Step 5: Write remaining tests**

```typescript
test('SET_PREVIEW_MODE switches mode', () => {
  const action: BriefAction = {
    type: 'SET_PREVIEW_MODE',
    mode: 'document',
  };

  const newState = briefReducer(state, action);

  expect(newState.previewMode).toBe('document');
});

test('HIDE_GAP adds gap ID to hiddenGaps', () => {
  const action: BriefAction = {
    type: 'HIDE_GAP',
    fieldId: 'what',
    gapId: 'gap-1',
  };

  const newState = briefReducer(state, action);

  expect(newState.fields.what.hiddenGaps).toContain('gap-1');
});

test('BATCH_EXTRACTION_START sets processingFields', () => {
  const action: BriefAction = {
    type: 'BATCH_EXTRACTION_START',
    fields: ['what', 'who', 'where'],
  };

  const newState = briefReducer(state, action);

  expect(newState.processingFields).toEqual(['what', 'who', 'where']);
});

test('BATCH_EXTRACTION_COMPLETE clears processingFields', () => {
  const stateWithProcessing = {
    ...state,
    processingFields: ['what', 'who'] as const[],
  };
  const action: BriefAction = {
    type: 'BATCH_EXTRACTION_COMPLETE',
  };

  const newState = briefReducer(stateWithProcessing, action);

  expect(newState.processingFields).toEqual([]);
});
```

**Step 6: Run tests to verify they fail**

Run: `npm test -- brief-state.test.ts`
Expected: Tests fail (exports not defined yet)

**Step 7: Export reducer and initial state**

In `brief-state.ts`, add exports:
```typescript
export { briefReducer, initialBriefState };
```

**Step 8: Run tests to verify they pass**

Run: `npm test -- brief-state.test.ts`
Expected: All tests pass

**Step 9: Commit**

```bash
git add __tests__/app/brief-helper/lib/brief-state.test.ts app/brief-helper/lib/brief-state.ts
git commit -m "test(brief): add V2 reducer tests

Test coverage for all V2 reducer actions:
- SET_INITIAL_DESCRIPTION, SET_ACTIVE_FIELD, SET_PREVIEW_MODE
- TOGGLE_FIELD_COLLAPSE (add and remove)
- HIDE_GAP, BATCH_EXTRACTION_START/COMPLETE

All tests passing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add Design Tokens for V2

**Files:**
- Modify: `styles/tokens/brief-helper.css:1-100`

**Step 1: Add split layout tokens**

```css
/* Split Screen Layout */
:root {
  --brief-split-ratio: 50%;
  --brief-panel-gap: 32px;
  --brief-panel-padding: 24px;
  --brief-mobile-breakpoint: 768px;
  --brief-tablet-breakpoint: 1024px;
```

**Step 2: Add progress bar tokens**

```css
  /* Progress Bar (Start Page) */
  --brief-progress-height: 8px;
  --brief-progress-radius: 4px;
  --brief-progress-warning: var(--brief-color-warning);
  --brief-progress-info: var(--brief-color-info);
  --brief-progress-success: var(--brief-color-success);
  --brief-progress-excellent: #00d68f;

  /* Progress Text Colors */
  --brief-progress-text-warning: #d97706;
  --brief-progress-text-info: #0ea5e9;
  --brief-progress-text-success: #10b981;
```

**Step 3: Add collapsed field tokens**

```css
  /* Collapsed Field Card */
  --brief-collapsed-height: 80px;
  --brief-collapsed-bg: var(--brief-color-surface);
  --brief-collapsed-border: var(--brief-color-border);
  --brief-collapsed-padding: 16px;
```

**Step 4: Add right panel tokens**

```css
  /* Right Panel Toggle */
  --brief-toggle-bg: var(--brief-color-surface);
  --brief-toggle-active-bg: var(--brief-color-primary);
  --brief-toggle-active-text: white;
  --brief-toggle-height: 40px;
```

**Step 5: Add loading overlay tokens**

```css
  /* Loading Overlay */
  --brief-overlay-bg: rgba(0, 0, 0, 0.5);
  --brief-overlay-content-bg: var(--brief-color-surface);
  --brief-overlay-padding: 32px;
```

**Step 6: Add spacing tokens**

```css
  /* Spacing */
  --brief-field-gap: 24px;
  --brief-section-gap: 16px;
}
```

**Step 7: Add dark mode overrides**

```css
@media (prefers-color-scheme: dark) {
  :root {
    --brief-progress-excellent: #00ff9d;
    --brief-overlay-bg: rgba(0, 0, 0, 0.7);
  }
}
```

**Step 8: Verify CSS loads**

Run dev server, open DevTools, check Computed styles for custom properties

**Step 9: Commit**

```bash
git add styles/tokens/brief-helper.css
git commit -m "feat(brief): add V2 design tokens

Add tokens for V2 components:
- Split layout: ratios, gaps, breakpoints
- Progress bar: colors, heights for character grading
- Collapsed fields: height, padding, borders
- Right panel toggle: active states
- Loading overlay: backdrop, modal styling
- Spacing: field and section gaps

Dark mode support for excellent grade and overlay.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create Start Page Route

**Files:**
- Create: `app/brief-helper/start/page.tsx`

**Step 1: Create start directory**

```bash
mkdir -p app/brief-helper/start
```

**Step 2: Write page component**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './start.module.css';

export default function BriefHelperStart() {
  const router = useRouter();
  const [description, setDescription] = useState('');

  const handleContinue = () => {
    if (description.length < 20) return;

    // Store description for batch extraction
    sessionStorage.setItem('brief-helper-description', description);
    router.push('/brief-helper');
  };

  const handleSkip = () => {
    router.push('/brief-helper');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Describe Your Product</h1>
        <p className={styles.subtitle}>
          Tell us about what you&apos;re building. The more detail, the better we can help.
        </p>

        <div className={styles.inputSection}>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: iPad Pro stand for retail environments with 360° rotation, height adjustment from 10-18 inches, secure locking mechanism, cable management..."
            aria-label="Product description"
          />
          <div className={styles.charCount}>{description.length} characters</div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={handleContinue}
            disabled={description.length < 20}
          >
            Continue
          </button>
          <button className={styles.secondaryButton} onClick={handleSkip}>
            Skip to manual entry
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create basic styles**

Create `app/brief-helper/start/start.module.css`:
```css
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--brief-color-background);
}

.content {
  max-width: 800px;
  width: 100%;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--brief-color-text);
}

.subtitle {
  font-size: 1rem;
  color: var(--brief-color-text-secondary);
  margin-bottom: 2rem;
}

.inputSection {
  margin-bottom: 1rem;
}

.textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  font-size: 1rem;
  font-family: inherit;
  border: 1px solid var(--brief-color-border);
  border-radius: var(--brief-radius-md);
  resize: vertical;
}

.charCount {
  text-align: right;
  font-size: 0.875rem;
  color: var(--brief-color-text-secondary);
  margin-top: 0.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.primaryButton {
  flex: 1;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: var(--brief-color-primary);
  color: white;
  border: none;
  border-radius: var(--brief-radius-md);
  cursor: pointer;
  transition: opacity 0.2s;
}

.primaryButton:hover:not(:disabled) {
  opacity: 0.9;
}

.primaryButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondaryButton {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: transparent;
  color: var(--brief-color-primary);
  border: 1px solid var(--brief-color-border);
  border-radius: var(--brief-radius-md);
  cursor: pointer;
}
```

**Step 4: Test navigation**

Run: Navigate to `http://localhost:3000/brief-helper/start`
Expected: See start page, textarea, buttons

**Step 5: Test character validation**

Type < 20 chars, verify "Continue" disabled
Type 20+ chars, verify "Continue" enabled

**Step 6: Commit**

```bash
git add app/brief-helper/start/
git commit -m "feat(brief): add start page with description input

Create /brief-helper/start route:
- Large textarea for product description
- Real-time character counter
- Continue button (disabled < 20 chars)
- Skip to manual entry link
- sessionStorage integration for description passing

Minimal styling, components come in next tasks.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Create ProgressGrading Component

**Files:**
- Create: `app/brief-helper/start/components/ProgressGrading.tsx`
- Create: `app/brief-helper/start/components/ProgressGrading.module.css`

**Step 1: Create components directory**

```bash
mkdir -p app/brief-helper/start/components
```

**Step 2: Write component**

```typescript
'use client';

import styles from './ProgressGrading.module.css';

interface ProgressGradingProps {
  characterCount: number;
}

const THRESHOLDS = {
  warning: 50,
  good: 100,
  excellent: 150,
};

const getGrade = (count: number): string => {
  if (count < THRESHOLDS.warning) return 'warning';
  if (count < THRESHOLDS.good) return 'info';
  if (count < THRESHOLDS.excellent) return 'success';
  return 'excellent';
};

const getLabel = (count: number): string => {
  if (count < THRESHOLDS.warning) return 'Add more details for better results';
  if (count < THRESHOLDS.good) return 'Good start ✓';
  if (count < THRESHOLDS.excellent) return 'Great detail ✓✓';
  return 'Excellent! ✓✓✓';
};

export default function ProgressGrading({ characterCount }: ProgressGradingProps) {
  const grade = getGrade(characterCount);
  const label = getLabel(characterCount);
  const percentage = Math.min((characterCount / THRESHOLDS.excellent) * 100, 100);

  return (
    <div className={styles.container}>
      <div className={styles.bar} role="progressbar" aria-valuenow={percentage}>
        <div
          className={`${styles.fill} ${styles[grade]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`${styles.label} ${styles[`${grade}Text`]}`}>{label}</p>
    </div>
  );
}
```

**Step 3: Write styles**

```css
.container {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.bar {
  height: var(--brief-progress-height);
  background: var(--brief-color-border);
  border-radius: var(--brief-progress-radius);
  overflow: hidden;
}

.fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.fill.warning {
  background: var(--brief-progress-warning);
}

.fill.info {
  background: var(--brief-progress-info);
}

.fill.success {
  background: var(--brief-progress-success);
}

.fill.excellent {
  background: var(--brief-progress-excellent);
}

.label {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.warningText {
  color: var(--brief-progress-text-warning);
}

.infoText {
  color: var(--brief-progress-text-info);
}

.successText,
.excellentText {
  color: var(--brief-progress-text-success);
}
```

**Step 4: Import in start page**

Update `app/brief-helper/start/page.tsx`:
```typescript
import ProgressGrading from './components/ProgressGrading';

// ... in JSX, after textarea:
<ProgressGrading characterCount={description.length} />
```

**Step 5: Test grading**

- Type 0-49 chars: amber bar, "Add more details"
- Type 50-99 chars: blue bar, "Good start ✓"
- Type 100-149 chars: green bar, "Great detail ✓✓"
- Type 150+ chars: bright green bar, "Excellent! ✓✓✓"

**Step 6: Commit**

```bash
git add app/brief-helper/start/
git commit -m "feat(brief): add character grading component

ProgressGrading component shows visual feedback:
- 0-49 chars: amber (warning)
- 50-99 chars: blue (info)
- 100-149 chars: green (success)
- 150+ chars: bright green (excellent)

Horizontal progress bar with smooth transitions.
Accessible with role=progressbar and aria-valuenow.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**[CONTINUED IN NEXT MESSAGE - This plan is 62 tasks total, truncating here for message length. The plan continues with Tasks 14-62 covering: batch extraction agent, API routes, split layout, left/right panels, all V2 components, integration, testing, and documentation.]**

---

## Testing Strategy

**Unit Tests:**
- All new components: ProgressGrading, CollapsedField, SuggestionsView, etc.
- State reducer: All V2 actions
- Batch extraction agent: Field extraction, JSON cleaning, confidence

**Integration Tests:**
- API endpoints: /batch-extract, updated /extract
- Full flow: Start → Extract → Edit → Preview
- Provider fallback: Gemini → OpenAI

**Manual Tests:**
- Character grading thresholds
- Batch extraction with various inputs
- Collapse/expand animations
- Toggle suggestions/preview
- Mobile responsive layout
- Keyboard navigation
- Dark mode

**Coverage Target:** > 50% overall, > 80% for new components

---

## Rollback Plan

If critical issues found:

1. **Revert last commit:** `git reset --soft HEAD~1`
2. **Revert to pre-V2:** `git revert <commit-hash-of-first-v2-task>`
3. **Feature flag:** Add `ENABLE_BRIEF_V2=false` env var check

---

## Success Criteria

- [ ] All tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Start page loads, grading works
- [ ] Batch extraction populates all 6 fields
- [ ] Split layout responsive
- [ ] Toggle switches views smoothly
- [ ] Fields collapse/expand correctly
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Documentation updated

---

**Plan saved to:** `docs/plans/2026-02-12-brief-helper-v2-execution.md`

**Next:** Choose execution approach (subagent-driven or parallel session)
