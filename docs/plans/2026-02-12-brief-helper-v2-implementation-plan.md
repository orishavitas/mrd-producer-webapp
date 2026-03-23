# Brief Helper V2 - Implementation Plan

**Date:** 2026-02-12
**Design Document:** `2026-02-12-brief-helper-v2-design.md`
**Branch:** `feature/brief-helper` (continue on existing branch)
**Estimated Time:** 17 hours across 9 phases

---

## Overview

This plan implements the Brief Helper V2 enhancements: initial description seeding, split-screen layout, collapsible fields, and live preview toggle. Builds on Phase 1 (Tasks 1-7: text extraction, gap detection, AI expansion).

**Key Additions:**
- Start page with description input and character grading
- Batch extraction agent (all 6 fields in one AI call)
- Split-screen layout (input left, suggestions/preview right)
- Collapsible field sections with "Done" button
- Toggle between AI suggestions and document preview
- Model optimization (Gemini 2.5 Pro, remove Claude)

---

## Phase 1: Model & Provider Updates

**Goal:** Switch to Gemini 2.5 Pro, add GPT-4o-mini fallback, remove Claude

**Time:** 30 minutes

### Task 1.1: Update Gemini Provider Model
**File:** `lib/providers/gemini-provider.ts`
**Changes:**
```typescript
// Line 20: Change model
const DEFAULT_MODEL = 'gemini-2.5-pro'; // Was: 'gemini-2.5-flash'
```

### Task 1.2: Update Provider Configuration
**File:** `config/agents/default.yaml`
**Changes:**
```yaml
providers:
  priority:
    - name: gemini
      enabled: true
      priority: 0
      config:
        model: gemini-2.5-pro  # Updated from Flash
        temperature: 0.3

    - name: openai
      enabled: true
      priority: 1
      config:
        model: gpt-4o-mini  # Fallback
        temperature: 0.3

    # Remove entire anthropic section
```

### Task 1.3: Delete Anthropic Provider
**Action:** Delete file `lib/providers/anthropic-provider.ts`

### Task 1.4: Update Provider Chain
**File:** `lib/providers/provider-chain.ts`
**Changes:**
- Remove Anthropic import
- Remove Anthropic registration in `getProviderChain()`
- Update provider list comment

### Task 1.5: Manual Test Provider Fallback
**Action:**
1. Temporarily invalidate `GOOGLE_API_KEY`
2. Make test API call to `/api/brief/extract`
3. Verify falls back to OpenAI (check logs)
4. Restore `GOOGLE_API_KEY`

**Validation:**
- Run existing tests: `npm test`
- Verify no Anthropic imports remain: `grep -r "anthropic" lib/ agent/`
- Check config loads: Start dev server, check console

---

## Phase 2: State Management Updates

**Goal:** Extend BriefState for new features

**Time:** 1 hour

### Task 2.1: Update State Interface
**File:** `app/brief-helper/lib/brief-state.ts`
**Changes:**

1. Add new state fields:
```typescript
export interface BriefState {
  // Existing
  fields: Record<BriefField, FieldState>;

  // NEW
  initialDescription: string;           // From start page
  activeFieldId: BriefField | null;     // Currently focused
  previewMode: 'suggestions' | 'document'; // Right panel toggle
  processingFields: BriefField[];       // Batch extraction progress
  collapsedFields: BriefField[];        // Fields marked "Done"
}
```

2. Update FieldState:
```typescript
export interface FieldState {
  rawText: string;
  bulletPoints: string[];
  gaps: Gap[];
  hiddenGaps: string[];                 // NEW: Hidden gap IDs
  isComplete: boolean;
  aiProcessing: boolean;
}
```

3. Add new action types:
```typescript
| { type: 'SET_INITIAL_DESCRIPTION'; payload: string }
| { type: 'SET_ACTIVE_FIELD'; fieldId: BriefField | null }
| { type: 'SET_PREVIEW_MODE'; mode: 'suggestions' | 'document' }
| { type: 'SET_FIELD_EXTRACTION'; fieldId: BriefField; bullets: string[]; gaps: Gap[] }
| { type: 'TOGGLE_FIELD_COLLAPSE'; fieldId: BriefField }
| { type: 'HIDE_GAP'; fieldId: BriefField; gapId: string }
| { type: 'BATCH_EXTRACTION_START'; fields: BriefField[] }
| { type: 'BATCH_EXTRACTION_COMPLETE' }
```

4. Update reducer with new cases:
```typescript
case 'SET_INITIAL_DESCRIPTION':
  return { ...state, initialDescription: action.payload };

case 'SET_ACTIVE_FIELD':
  return { ...state, activeFieldId: action.fieldId };

case 'SET_PREVIEW_MODE':
  return { ...state, previewMode: action.mode };

case 'SET_FIELD_EXTRACTION':
  return {
    ...state,
    fields: {
      ...state.fields,
      [action.fieldId]: {
        ...state.fields[action.fieldId],
        bulletPoints: action.bullets,
        gaps: action.gaps,
      }
    }
  };

case 'TOGGLE_FIELD_COLLAPSE':
  const isCollapsed = state.collapsedFields.includes(action.fieldId);
  return {
    ...state,
    collapsedFields: isCollapsed
      ? state.collapsedFields.filter(f => f !== action.fieldId)
      : [...state.collapsedFields, action.fieldId]
  };

case 'HIDE_GAP':
  return {
    ...state,
    fields: {
      ...state.fields,
      [action.fieldId]: {
        ...state.fields[action.fieldId],
        hiddenGaps: [
          ...state.fields[action.fieldId].hiddenGaps,
          action.gapId
        ]
      }
    }
  };

case 'BATCH_EXTRACTION_START':
  return { ...state, processingFields: action.fields };

case 'BATCH_EXTRACTION_COMPLETE':
  return { ...state, processingFields: [] };
```

5. Update initial state:
```typescript
const initialState: BriefState = {
  fields: { /* existing */ },
  initialDescription: '',
  activeFieldId: null,
  previewMode: 'suggestions',
  processingFields: [],
  collapsedFields: [],
};
```

### Task 2.2: Update Context Provider
**File:** `app/brief-helper/lib/brief-context.tsx`
**Changes:**

1. Export new helper functions:
```typescript
export const setActiveField = (
  dispatch: Dispatch<BriefAction>,
  fieldId: BriefField | null
) => {
  dispatch({ type: 'SET_ACTIVE_FIELD', fieldId });
};

export const togglePreviewMode = (
  dispatch: Dispatch<BriefAction>,
  mode: 'suggestions' | 'document'
) => {
  dispatch({ type: 'SET_PREVIEW_MODE', mode });
};

export const toggleFieldCollapse = (
  dispatch: Dispatch<BriefAction>,
  fieldId: BriefField
) => {
  dispatch({ type: 'TOGGLE_FIELD_COLLAPSE', fieldId });
};
```

2. Update sessionStorage persistence to include new fields

3. Update context value interface:
```typescript
interface BriefContextValue {
  state: BriefState;
  dispatch: Dispatch<BriefAction>;
  setActiveField: (fieldId: BriefField | null) => void;
  togglePreviewMode: (mode: 'suggestions' | 'document') => void;
  toggleFieldCollapse: (fieldId: BriefField) => void;
}
```

### Task 2.3: Create Unit Tests
**File:** `__tests__/app/brief-helper/lib/brief-state.test.ts`
**Tests:**
```typescript
describe('BriefState Reducer - New Actions', () => {
  test('SET_INITIAL_DESCRIPTION updates state', () => {});
  test('SET_ACTIVE_FIELD updates activeFieldId', () => {});
  test('SET_PREVIEW_MODE toggles between suggestions/document', () => {});
  test('TOGGLE_FIELD_COLLAPSE adds/removes from array', () => {});
  test('HIDE_GAP adds to hiddenGaps', () => {});
  test('BATCH_EXTRACTION_START sets processingFields', () => {});
  test('BATCH_EXTRACTION_COMPLETE clears processingFields', () => {});
});
```

**Validation:**
- Run tests: `npm test -- brief-state.test.ts`
- All new reducer cases covered
- 100% branch coverage for new code

---

## Phase 3: Start Page

**Goal:** Create initial description entry page

**Time:** 2 hours

### Task 3.1: Create Start Page Route
**File:** `app/brief-helper/start/page.tsx`
**Content:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DescriptionInput from './components/DescriptionInput';
import ProgressGrading from './components/ProgressGrading';
import FutureOptions from './components/FutureOptions';
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
          Tell us about what you're building. The more detail, the better we can help.
        </p>

        <DescriptionInput
          value={description}
          onChange={setDescription}
          minLength={20}
        />

        <ProgressGrading characterCount={description.length} />

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

        <FutureOptions />
      </div>
    </div>
  );
}
```

### Task 3.2: Create DescriptionInput Component
**File:** `app/brief-helper/start/components/DescriptionInput.tsx`
**Content:**
```typescript
'use client';

import { useEffect, useRef } from 'react';
import styles from './DescriptionInput.module.css';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
}

export default function DescriptionInput({
  value,
  onChange,
  minLength = 20,
}: DescriptionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className={styles.container}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: iPad Pro stand for retail environments with 360° rotation, height adjustment from 10-18 inches, secure locking mechanism, cable management..."
        aria-label="Product description"
        aria-describedby="char-count"
      />
      <div id="char-count" className={styles.charCount}>
        {value.length} characters
      </div>
    </div>
  );
}
```

### Task 3.3: Create ProgressGrading Component
**File:** `app/brief-helper/start/components/ProgressGrading.tsx`
**Content:**
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

const getGrade = (count: number) => {
  if (count < THRESHOLDS.warning) return 'warning';
  if (count < THRESHOLDS.good) return 'info';
  if (count < THRESHOLDS.excellent) return 'success';
  return 'excellent';
};

const getLabel = (count: number) => {
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
      <p className={`${styles.label} ${styles[`${grade}Text`]}`}>
        {label}
      </p>
    </div>
  );
}
```

### Task 3.4: Create FutureOptions Component
**File:** `app/brief-helper/start/components/FutureOptions.tsx`
**Content:**
```typescript
'use client';

import styles from './FutureOptions.module.css';

export default function FutureOptions() {
  return (
    <div className={styles.container}>
      <div className={styles.divider}>
        <span>or</span>
      </div>

      <button className={styles.disabledButton} disabled>
        <span className={styles.icon}>📄</span>
        Upload Document (.doc, .docx, .pdf)
        <span className={styles.badge}>Coming Soon</span>
      </button>

      <button className={styles.disabledButton} disabled>
        <span className={styles.icon}>🔗</span>
        Analyze Link
        <span className={styles.badge}>Coming Soon</span>
      </button>
    </div>
  );
}
```

### Task 3.5: Add Design Tokens
**File:** `styles/tokens/brief-helper.css`
**Add:**
```css
/* Progress Bar */
--brief-progress-height: 8px;
--brief-progress-radius: 4px;
--brief-progress-warning: var(--brief-color-warning);
--brief-progress-info: var(--brief-color-info);
--brief-progress-success: var(--brief-color-success);
--brief-progress-excellent: #00d68f;

/* Progress Text */
--brief-progress-text-warning: #d97706;
--brief-progress-text-info: #0ea5e9;
--brief-progress-text-success: #10b981;
```

### Task 3.6: Create Start Page Styles
**File:** `app/brief-helper/start/start.module.css`
**Content:**
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

### Task 3.7: Wire Up Navigation
**File:** `app/brief-helper/start/page.tsx`
**Action:** Already included in Task 3.1 (uses `sessionStorage` + `router.push`)

**Validation:**
- Navigate to `http://localhost:3000/brief-helper/start`
- Type < 20 chars, verify "Continue" disabled
- Type 50 chars, verify bar turns blue
- Type 100 chars, verify bar turns green
- Type 150 chars, verify bar turns bright green
- Click "Continue", verify navigates to `/brief-helper`
- Check sessionStorage has `brief-helper-description`

---

## Phase 4: Batch Extraction Agent

**Goal:** Create agent that extracts all 6 fields from description

**Time:** 2 hours

### Task 4.1: Create Batch Extraction Agent
**File:** `agent/agents/brief/batch-extraction-agent.ts`
**Content:** (See design doc for full implementation - ~250 lines)

Key sections:
1. Input/Output interfaces
2. System prompt (extraction guidelines for all 6 fields)
3. User prompt builder
4. JSON cleaning logic (reuse from text-extraction-agent)
5. Field extraction and validation
6. Confidence calculation

### Task 4.2: Update Brief Agent Types
**File:** `agent/agents/brief/types.ts`
**Add:**
```typescript
export interface BatchExtractionInput {
  description: string;
}

export interface FieldExtractionResult {
  bullets: string[];
  entities: ExtractedEntity[];
  confidence: number;
}

export interface BatchExtractionOutput {
  fields: {
    what: FieldExtractionResult;
    who: FieldExtractionResult;
    where: FieldExtractionResult;
    moq: FieldExtractionResult;
    mustHaves: FieldExtractionResult;
    niceToHaves: FieldExtractionResult;
  };
}
```

### Task 4.3: Create API Route
**File:** `app/api/brief/batch-extract/route.ts`
**Content:**
```typescript
import { NextResponse } from 'next/server';
import { BatchExtractionAgent } from '@/agent/agents/brief/batch-extraction-agent';
import { GapDetectionAgent } from '@/agent/agents/brief/gap-detection-agent';
import { createExecutionContext } from '@/agent/core/execution-context';
import { loadAgentConfig } from '@/agent/core/config-loader';
import { sanitizeInput } from '@/lib/sanitize';
import type { BriefField, Gap } from '@/agent/agents/brief/types';

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitized = sanitizeInput(description, { maxLength: 2000 });

    // Create execution context
    const config = await loadAgentConfig();
    const context = createExecutionContext({
      requestId: `batch-${Date.now()}`,
      config,
    });

    // Execute batch extraction
    const agent = new BatchExtractionAgent();
    const result = await agent.execute({ description: sanitized }, context);

    if (!result.success) {
      throw new Error(result.error || 'Batch extraction failed');
    }

    // Run gap detection for each field
    const gapAgent = new GapDetectionAgent();
    const gaps: Record<BriefField, Gap[]> = {} as any;

    const fieldIds: BriefField[] = [
      'what',
      'who',
      'where',
      'moq',
      'mustHaves',
      'niceToHaves',
    ];

    for (const fieldId of fieldIds) {
      const fieldData = result.data.fields[fieldId];
      const gapResult = await gapAgent.execute(
        {
          fieldType: fieldId,
          bulletPoints: fieldData.bullets,
          rawText: sanitized,
        },
        context
      );

      gaps[fieldId] = gapResult.success ? gapResult.data.gaps : [];
    }

    return NextResponse.json({
      fields: result.data.fields,
      gaps,
    });
  } catch (error: any) {
    console.error('[batch-extract] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 4.4: Create Agent Tests
**File:** `__tests__/agent/agents/brief/batch-extraction-agent.test.ts`
**Tests:**
```typescript
describe('BatchExtractionAgent', () => {
  test('extracts all 6 fields from description', async () => {});
  test('handles markdown-wrapped JSON', () => {});
  test('calculates confidence scores', () => {});
  test('validates all fields present', () => {});
  test('falls back to GPT-4o-mini on failure', async () => {});
});
```

### Task 4.5: Create API Tests
**File:** `__tests__/app/api/brief/batch-extract.test.ts`
**Tests:**
```typescript
describe('POST /api/brief/batch-extract', () => {
  test('returns all 6 fields with bullets', async () => {});
  test('runs gap detection on each field', async () => {});
  test('sanitizes input description', async () => {});
  test('returns 400 on missing description', async () => {});
  test('returns 500 on agent failure', async () => {});
});
```

**Validation:**
- Run tests: `npm test -- batch-extraction`
- Manual test via Postman/curl:
  ```bash
  curl -X POST http://localhost:3000/api/brief/batch-extract \
    -H "Content-Type: application/json" \
    -d '{"description":"iPad stand for retail with rotation"}'
  ```
- Verify all 6 fields returned
- Check gaps detected
- Verify Gemini 2.5 Pro used (check logs)

---

## Phase 5: Split Layout & Loading

**Goal:** Create split-screen layout with loading overlay

**Time:** 2 hours

### Task 5.1: Create SplitLayout Component
**File:** `app/brief-helper/components/SplitLayout.tsx`
**Content:**
```typescript
'use client';

import { ReactNode } from 'react';
import styles from './SplitLayout.module.css';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

export default function SplitLayout({ leftPanel, rightPanel }: SplitLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>{leftPanel}</div>
      <div className={styles.rightPanel}>{rightPanel}</div>
    </div>
  );
}
```

**File:** `app/brief-helper/components/SplitLayout.module.css`
```css
.container {
  display: grid;
  grid-template-columns: var(--brief-split-ratio) var(--brief-split-ratio);
  gap: var(--brief-panel-gap);
  min-height: 100vh;
  padding: var(--brief-panel-padding);
}

.leftPanel,
.rightPanel {
  overflow-y: auto;
  max-height: calc(100vh - var(--brief-panel-padding) * 2);
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
  }
}
```

### Task 5.2: Create LoadingOverlay Component
**File:** `app/brief-helper/components/LoadingOverlay.tsx`
**Content:**
```typescript
'use client';

import { BriefField } from '@/agent/agents/brief/types';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps {
  isVisible: boolean;
  processingFields: BriefField[];
  completedFields: BriefField[];
}

const FIELD_LABELS: Record<BriefField, string> = {
  what: 'Extracting product details',
  who: 'Identifying users',
  where: 'Determining environment',
  moq: 'Analyzing quantities',
  mustHaves: 'Finding critical features',
  niceToHaves: 'Identifying optional features',
};

export default function LoadingOverlay({
  isVisible,
  processingFields,
  completedFields,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const allFields: BriefField[] = [
    'what',
    'who',
    'where',
    'moq',
    'mustHaves',
    'niceToHaves',
  ];

  const getFieldStatus = (field: BriefField) => {
    if (completedFields.includes(field)) return 'done';
    if (processingFields.includes(field)) return 'processing';
    return 'pending';
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.spinner} />
        <h2 className={styles.title}>Analyzing your description...</h2>
        <ul className={styles.checklist}>
          {allFields.map((field) => {
            const status = getFieldStatus(field);
            return (
              <li key={field} className={`${styles.item} ${styles[status]}`}>
                {status === 'done' && <span className={styles.icon}>✓</span>}
                {status === 'processing' && <span className={styles.icon}>⏳</span>}
                {status === 'pending' && <span className={styles.icon}>⌛</span>}
                {FIELD_LABELS[field]}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
```

### Task 5.3: Update Main Page Layout
**File:** `app/brief-helper/page.tsx`
**Changes:**
1. Import SplitLayout and LoadingOverlay
2. Check sessionStorage for `brief-helper-description` on mount
3. If description exists, trigger batch extraction
4. Show LoadingOverlay while extracting
5. Populate fields progressively
6. Use SplitLayout to wrap LeftPanel and RightPanel (create in Phase 6-7)

**Skeleton:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useBrief } from './lib/brief-context';
import SplitLayout from './components/SplitLayout';
import LoadingOverlay from './components/LoadingOverlay';
// Import LeftPanel, RightPanel in Phase 6-7

export default function BriefHelperPage() {
  const { state, dispatch } = useBrief();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const description = sessionStorage.getItem('brief-helper-description');
    if (description && !state.initialDescription) {
      handleBatchExtraction(description);
    }
  }, []);

  const handleBatchExtraction = async (description: string) => {
    setIsLoading(true);
    dispatch({ type: 'SET_INITIAL_DESCRIPTION', payload: description });
    dispatch({
      type: 'BATCH_EXTRACTION_START',
      fields: ['what', 'who', 'where', 'moq', 'mustHaves', 'niceToHaves'],
    });

    try {
      const response = await fetch('/api/brief/batch-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      // Populate fields progressively (simulate for UX)
      for (const [fieldId, fieldData] of Object.entries(data.fields)) {
        dispatch({
          type: 'SET_FIELD_EXTRACTION',
          fieldId: fieldId as any,
          bullets: fieldData.bullets,
          gaps: data.gaps[fieldId] || [],
        });
        await new Promise((r) => setTimeout(r, 300)); // Stagger for UX
      }

      dispatch({ type: 'BATCH_EXTRACTION_COMPLETE' });
    } catch (error) {
      console.error('Batch extraction failed:', error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
      sessionStorage.removeItem('brief-helper-description');
    }
  };

  return (
    <>
      <LoadingOverlay
        isVisible={isLoading}
        processingFields={state.processingFields}
        completedFields={Object.keys(state.fields).filter(
          (f) => state.fields[f as any].bulletPoints.length > 0
        ) as any[]}
      />

      <SplitLayout
        leftPanel={<div>Left Panel (TODO in Phase 6)</div>}
        rightPanel={<div>Right Panel (TODO in Phase 7)</div>}
      />
    </>
  );
}
```

### Task 5.4: Add Split Layout Tokens
**File:** `styles/tokens/brief-helper.css`
**Add:**
```css
/* Split Layout */
--brief-split-ratio: 50%;
--brief-panel-gap: 32px;
--brief-panel-padding: 24px;

/* Loading Overlay */
--brief-overlay-bg: rgba(0, 0, 0, 0.5);
--brief-overlay-content-bg: var(--brief-color-surface);
--brief-overlay-padding: 32px;
```

**Validation:**
- Start page → enter description → Continue
- Verify loading overlay appears
- Verify checklist items update (✓, ⏳, ⌛)
- Verify split layout appears after loading
- Test responsive: resize to mobile, verify single column

---

## Phase 6: Left Panel Components

**Goal:** Create input fields panel with collapse/expand

**Time:** 3 hours

### Task 6.1: Create LeftPanel Component
**File:** `app/brief-helper/components/LeftPanel.tsx`
**Content:** (See design doc - ~80 lines)

Key features:
- Back button (if came from start)
- ProgressIndicator
- Map through 6 fields
- Conditional render: expanded BriefField or CollapsedField
- Auto-scroll to active field

### Task 6.2: Create ProgressIndicator Component
**File:** `app/brief-helper/components/ProgressIndicator.tsx`
**Content:**
```typescript
'use client';

import { useBrief } from '../lib/brief-context';
import { getCompletionProgress } from '../lib/brief-state';
import styles from './ProgressIndicator.module.css';

export default function ProgressIndicator() {
  const { state } = useBrief();
  const { completedCount, totalCount, percentage } = getCompletionProgress(state.fields);

  return (
    <div className={styles.container}>
      <p className={styles.text}>
        {completedCount} of {totalCount} fields complete
      </p>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
```

### Task 6.3: Create CollapsedField Component
**File:** `app/brief-helper/components/CollapsedField.tsx`
**Content:** (See design doc - ~70 lines)

Key features:
- Green checkmark + field name
- First 2-3 bullets (truncated)
- Gap badge if gaps exist
- "Edit" button
- Click anywhere to expand

### Task 6.4: Update BriefField Component
**File:** `app/brief-helper/components/BriefField.tsx`
**Changes:**
1. Add props: `isCollapsed`, `onMarkDone`, `onExpand`
2. Conditional render:
   ```typescript
   if (isCollapsed) {
     return <CollapsedField {...props} />;
   }
   // Existing full field UI
   ```
3. Add "Done" button at bottom of expanded view
4. Wire up `onMarkDone` callback

### Task 6.5: Update GapSuggestion Component
**File:** `app/brief-helper/components/GapSuggestion.tsx`
**Changes:**
1. Add props: `isHidden`, `onHide`
2. Add "Hide" button next to "Dismiss"
3. Apply reduced opacity if `isHidden`
4. Show "Hidden" badge when hidden

### Task 6.6: Add Collapse Animations
**File:** `app/brief-helper/components/BriefField.module.css`
**Add:**
```css
.fieldContainer {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.collapsed {
  max-height: var(--brief-collapsed-height);
}

.expanded {
  max-height: 2000px; /* Arbitrary large value */
}
```

### Task 6.7: Implement Auto-Focus Next Field
**File:** `app/brief-helper/components/LeftPanel.tsx`
**Logic:**
```typescript
const handleFieldDone = (fieldId: BriefField) => {
  dispatch({ type: 'MARK_COMPLETE', fieldId });
  dispatch({ type: 'TOGGLE_FIELD_COLLAPSE', fieldId });

  // Find next incomplete field
  const fieldOrder: BriefField[] = ['what', 'who', 'where', 'moq', 'mustHaves', 'niceToHaves'];
  const currentIndex = fieldOrder.indexOf(fieldId);
  const nextField = fieldOrder.slice(currentIndex + 1).find(
    (f) => !state.fields[f].isComplete
  );

  if (nextField) {
    dispatch({ type: 'SET_ACTIVE_FIELD', fieldId: nextField });
    // Scroll to field
    document.getElementById(`field-${nextField}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
};
```

**Validation:**
- Mark field "Done", verify collapse animation smooth
- Verify next field auto-focuses
- Verify "Edit" expands field
- Verify "Hide" button on gaps works
- Verify gap badge shows correct count
- Test keyboard navigation (Tab through fields)

---

## Phase 7: Right Panel - Toggle & Views

**Goal:** Create suggestions/preview toggle and content

**Time:** 3 hours

### Task 7.1: Create RightPanel Container
**File:** `app/brief-helper/components/RightPanel.tsx`
**Content:** (See design doc - ~60 lines)

Key features:
- Sticky header with toggle
- Conditional render based on `previewMode`
- Fade transition between views

### Task 7.2: Create RightPanelToggle Component
**File:** `app/brief-helper/components/RightPanelToggle.tsx`
**Content:**
```typescript
'use client';

import styles from './RightPanelToggle.module.css';

interface RightPanelToggleProps {
  mode: 'suggestions' | 'document';
  onToggle: () => void;
}

export default function RightPanelToggle({ mode, onToggle }: RightPanelToggleProps) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${mode === 'suggestions' ? styles.active : ''}`}
        onClick={() => onToggle()}
        aria-pressed={mode === 'suggestions'}
      >
        💡 AI Suggestions
      </button>
      <button
        className={`${styles.button} ${mode === 'document' ? styles.active : ''}`}
        onClick={() => onToggle()}
        aria-pressed={mode === 'document'}
      >
        📄 Document Preview
      </button>
    </div>
  );
}
```

### Task 7.3: Create SuggestionsView Component
**File:** `app/brief-helper/components/SuggestionsView.tsx`
**Content:** (See design doc - ~120 lines)

Key features:
- Top section: Active field suggestions
- Bottom section: Other fields summary
- Clickable links to jump to field

### Task 7.4: Create DocumentPreview Component
**File:** `app/brief-helper/components/DocumentPreview.tsx`
**Content:**
```typescript
'use client';

import { BriefField, FieldState } from '@/agent/agents/brief/types';
import { FIELD_DEFINITIONS } from '../lib/field-definitions';
import styles from './DocumentPreview.module.css';

interface DocumentPreviewProps {
  fields: Record<BriefField, FieldState>;
}

export default function DocumentPreview({ fields }: DocumentPreviewProps) {
  const fieldOrder: BriefField[] = [
    'what',
    'who',
    'where',
    'moq',
    'mustHaves',
    'niceToHaves',
  ];

  return (
    <div className={styles.document}>
      <h1 className={styles.title}>Product Brief</h1>

      {fieldOrder.map((fieldId) => {
        const field = fields[fieldId];
        const definition = FIELD_DEFINITIONS[fieldId];
        const hasContent = field.bulletPoints.length > 0;

        return (
          <section key={fieldId} className={styles.section}>
            <h2 className={styles.sectionTitle}>{definition.label}</h2>
            {hasContent ? (
              <ul className={styles.bulletList}>
                {field.bulletPoints.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>—</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
```

### Task 7.5: Wire Up Active Field Sync
**File:** `app/brief-helper/components/BriefField.tsx`
**Add:**
```typescript
const handleFocus = () => {
  dispatch({ type: 'SET_ACTIVE_FIELD', fieldId });
};

// On textarea focus event
<textarea onFocus={handleFocus} ... />
```

### Task 7.6: Add Fade Transitions
**File:** `app/brief-helper/components/RightPanel.module.css`
**Add:**
```css
.content {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### Task 7.7: Implement Jump to Field
**File:** `app/brief-helper/components/SuggestionsView.tsx`
**Add:**
```typescript
const handleJumpToField = (fieldId: BriefField) => {
  dispatch({ type: 'SET_ACTIVE_FIELD', fieldId });
  document.getElementById(`field-${fieldId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
  // Focus textarea
  const textarea = document.querySelector(`#field-${fieldId} textarea`);
  if (textarea) (textarea as HTMLTextAreaElement).focus();
};
```

**Validation:**
- Toggle between Suggestions/Preview, verify smooth transition
- Focus different fields, verify Suggestions update
- Click "jump to field" links, verify scroll and focus
- Verify Preview shows only completed fields
- Test with all fields empty, partial, and complete

---

## Phase 8: Integration & Polish

**Goal:** Connect all pieces, add error handling, polish UX

**Time:** 2 hours

### Task 8.1: Connect All Components
**File:** `app/brief-helper/page.tsx`
**Update:** Import and render LeftPanel, RightPanel with full props

### Task 8.2: Test Full Flow
**Manual Test:**
1. Start at `/brief-helper/start`
2. Enter 150+ char description
3. Click Continue
4. Verify loading overlay with progress
5. Verify all 6 fields populate
6. Verify gaps appear
7. Mark 2 fields "Done"
8. Verify collapse animations
9. Toggle to Preview
10. Verify only completed fields shown
11. Toggle back to Suggestions
12. Expand collapsed field
13. Edit text, verify re-extraction
14. Click "← Edit Description"
15. Verify returns to start with description
16. Modify description, re-continue
17. Verify fields re-populate

### Task 8.3: Add Error Boundaries
**File:** `app/brief-helper/error.tsx`
**Content:**
```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Task 8.4: Polish Animations
**Files:** Various `.module.css` files
**Actions:**
- Verify all transitions smooth (60fps)
- Add `prefers-reduced-motion` support
- Adjust timing curves for natural feel

### Task 8.5: Accessibility Audit
**Checklist:**
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces state changes
- [ ] Focus indicators visible
- [ ] ARIA labels present on all controls
- [ ] Color contrast meets WCAG AA
- [ ] Forms have proper labels

### Task 8.6: Mobile Responsive Test
**Actions:**
- Test on mobile viewport (< 768px)
- Verify single column layout
- Verify touch targets ≥ 44px
- Test on actual device if possible

**Validation:**
- Complete full flow with no errors
- Test edge cases (empty fields, very long text, network errors)
- Verify no console errors or warnings

---

## Phase 9: Testing & Documentation

**Goal:** Comprehensive test coverage and updated docs

**Time:** 2 hours

### Task 9.1: Write Component Tests
**Files:**
- `__tests__/app/brief-helper/components/ProgressGrading.test.tsx`
- `__tests__/app/brief-helper/components/CollapsedField.test.tsx`
- `__tests__/app/brief-helper/components/SuggestionsView.test.tsx`
- `__tests__/app/brief-helper/components/DocumentPreview.test.tsx`

**Coverage Target:** > 80% for new components

### Task 9.2: Write Integration Tests
**File:** `__tests__/app/brief-helper/integration/full-flow.test.tsx`
**Tests:**
- Start page → batch extract → main page
- Collapse → expand → edit flow
- Toggle suggestions ↔ preview
- Back to start page preserves state

### Task 9.3: Create Completion Document
**File:** `docs/plans/2026-02-12-brief-helper-v2-completion.md`
**Content:**
- Summary of implementation
- Key changes made
- Files added/modified
- Testing results
- Known issues/limitations
- Next steps (Phase 10+ or separate features)

### Task 9.4: Update CLAUDE.md
**File:** `CLAUDE.md`
**Section:** Brief Helper (feature/brief-helper - Active Development)
**Update:**
- Mark Phase 1 Tasks 1-7 complete
- Add Phase 2 (V2 Enhancements) status
- Update component list
- Update file locations

### Task 9.5: Run Full Test Suite
**Actions:**
```bash
npm test
npm run test:coverage
npm run build
npm run lint  # If ESLint configured
```

**Target:**
- All tests passing
- Coverage > 50% overall
- Build succeeds with no errors
- No linting errors

**Validation:**
- All tests passing (`npm test`)
- Coverage report shows > 50%
- Build succeeds (`npm run build`)
- Documentation updated
- Ready for code review

---

## Summary

**Total Tasks:** 62 across 9 phases
**Estimated Time:** 17 hours
**Files Added:** ~30 new files
**Files Modified:** ~15 existing files
**Lines of Code:** ~2,500 new lines

**Key Deliverables:**
1. Start page with description input and grading
2. Batch extraction agent (all 6 fields in one call)
3. Split-screen layout (input + suggestions/preview)
4. Collapsible field sections with "Done" button
5. Toggle between AI suggestions and document preview
6. Model optimization (Gemini 2.5 Pro, remove Claude)
7. Comprehensive tests and documentation

**Next Steps After V2:**
- Brief generation (Tasks 8-9): Create final document export
- Storage integration (Tasks 10-13): Redis, SQLite, Google Drive
- Upload document and analyze link features
- Knowledge learning from completed briefs

**Ready to implement!** 🚀
