# Feature Auto-Fill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Auto-fill Features" button to one-pager-beta that uses AI to read the product description and pre-populate must-have/nice-to-have feature chips from the YAML list.

**Architecture:** New API endpoint `POST /api/one-pager-beta/suggest-features` calls the Gemini provider with the description and full feature list, returns classified labels, dispatched into state via new `SET_FEATURES` action.

**Tech Stack:** Next.js App Router, TypeScript, Gemini via existing provider chain, React state via reducer dispatch.

---

## Chunk 1: State + API

### Task 1: Add SET_FEATURES reducer action

**Files:**
- Modify: `app/one-pager-beta/lib/one-pager-state.ts`

- [ ] Open `app/one-pager-beta/lib/one-pager-state.ts`
- [ ] Add to the `OnePagerAction` union type:
```typescript
| { type: 'SET_FEATURES'; payload: { mustHave: string[]; niceToHave: string[] } }
```
- [ ] Add case to reducer:
```typescript
case 'SET_FEATURES':
  return {
    ...state,
    features: {
      mustHave: action.payload.mustHave,
      niceToHave: action.payload.niceToHave,
    },
  };
```
- [ ] Verify TypeScript compiles: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/one-pager-beta/lib/one-pager-state.ts
git commit -m "feat(beta): add SET_FEATURES reducer action"
```

---

### Task 2: Create suggest-features API endpoint

**Files:**
- Create: `app/api/one-pager-beta/suggest-features/route.ts`

- [ ] Create directory: `app/api/one-pager-beta/suggest-features/`
- [ ] Create `route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createExecutionContext } from '@/agent/core/execution-context';

interface FeatureCategory {
  category: string;
  features: string[];
}

interface SuggestFeaturesRequest {
  description: string;
  goal?: string;
  useCases?: string;
  availableFeatures: FeatureCategory[];
}

const SYSTEM_PROMPT = `You are a product requirements analyst. Given a product description and a list of available feature chips, classify which features are Must Have (core to the product's function) and which are Nice to Have (beneficial but not essential).

Rules:
- Only return features from the provided list — exact label matches only
- If uncertain whether a feature applies, omit it entirely
- Must Have = the product cannot function properly without it
- Nice to Have = improves the product but is not essential
- Return strict JSON only, no explanation outside the JSON

JSON shape:
{
  "mustHave": ["exact label 1", "exact label 2"],
  "niceToHave": ["exact label 3"],
  "reasoning": "one sentence"
}`;

function buildUserPrompt(req: SuggestFeaturesRequest): string {
  const lines: string[] = [];
  lines.push(`Product Description: ${req.description}`);
  if (req.goal) lines.push(`Goal: ${req.goal}`);
  if (req.useCases) lines.push(`Use Cases: ${req.useCases}`);
  lines.push('');
  lines.push('Available features (grouped by category):');
  for (const cat of req.availableFeatures) {
    lines.push(`${cat.category}: ${cat.features.join(', ')}`);
  }
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  let body: SuggestFeaturesRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.description || body.description.length < 20) {
    return NextResponse.json({ error: 'description must be at least 20 characters' }, { status: 400 });
  }

  if (!body.availableFeatures?.length) {
    return NextResponse.json({ error: 'availableFeatures is required' }, { status: 400 });
  }

  const context = createExecutionContext({ requestId: `suggest-features-${Date.now()}` });
  const provider = context.getProvider();

  let raw: string;
  try {
    const result = await provider.generateText(buildUserPrompt(body), SYSTEM_PROMPT);
    raw = result.text;
  } catch (err) {
    return NextResponse.json({ error: 'AI provider failed' }, { status: 500 });
  }

  // Strip markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: { mustHave?: unknown; niceToHave?: unknown };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }

  // Collect all valid labels
  const allLabels = new Set(body.availableFeatures.flatMap((c) => c.features));
  const filterValid = (arr: unknown): string[] =>
    Array.isArray(arr) ? (arr as unknown[]).filter((x): x is string => typeof x === 'string' && allLabels.has(x)) : [];

  return NextResponse.json({
    mustHave: filterValid(parsed.mustHave),
    niceToHave: filterValid(parsed.niceToHave),
  });
}
```
- [ ] Verify build: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/api/one-pager-beta/suggest-features/
git commit -m "feat(beta): add suggest-features API endpoint"
```

---

## Chunk 2: UI

### Task 3: Add Auto-fill button to FeatureSelector

**Files:**
- Modify: `app/one-pager-beta/components/FeatureSelector.tsx`
- Modify: `app/one-pager-beta/components/FeatureSelector.module.css`

- [ ] Open `app/one-pager-beta/components/FeatureSelector.tsx`
- [ ] Add props to interface:
```typescript
interface FeatureSelectorProps {
  // ... existing props ...
  onAutoFill?: () => void;
  isAutoFilling?: boolean;
}
```
- [ ] Add the button in the section header (next to the label):
```tsx
{onAutoFill && (
  <button
    className={styles.autoFillButton}
    onClick={onAutoFill}
    disabled={isAutoFilling}
  >
    {isAutoFilling ? 'Filling...' : 'Auto-fill Features'}
  </button>
)}
```
- [ ] Add CSS to `FeatureSelector.module.css`:
```css
.autoFillButton {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1.5px solid var(--op-primary, #1D1F4A);
  background: transparent;
  color: var(--op-primary, #1D1F4A);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  margin-left: 0.75rem;
}
.autoFillButton:hover:not(:disabled) {
  background: var(--op-primary, #1D1F4A);
  color: #fff;
}
.autoFillButton:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```
- [ ] Verify build: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/one-pager-beta/components/FeatureSelector.tsx app/one-pager-beta/components/FeatureSelector.module.css
git commit -m "feat(beta): add Auto-fill Features button to FeatureSelector"
```

---

### Task 4: Wire auto-fill in page.tsx

**Files:**
- Modify: `app/one-pager-beta/page.tsx`

- [ ] Open `app/one-pager-beta/page.tsx`
- [ ] Add state: `const [isAutoFilling, setIsAutoFilling] = useState(false);`
- [ ] Add handler after `handleExport`:
```typescript
const handleAutoFill = useCallback(async () => {
  if (!config) return;
  setIsAutoFilling(true);
  try {
    const availableFeatures = config.standardFeatures.map((cat) => ({
      category: cat.label,
      features: cat.features.map((f: { label: string }) => f.label),
    }));
    const response = await fetch('/api/one-pager-beta/suggest-features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: state.description || state.expandedDescription,
        goal: state.goal || state.expandedGoal,
        useCases: state.useCases || state.expandedUseCases,
        availableFeatures,
      }),
    });
    const data = await response.json();
    if (data.mustHave || data.niceToHave) {
      dispatch({
        type: 'SET_FEATURES',
        payload: {
          mustHave: data.mustHave ?? [],
          niceToHave: data.niceToHave ?? [],
        },
      });
    }
  } catch (err) {
    console.error('Auto-fill failed:', err);
  } finally {
    setIsAutoFilling(false);
  }
}, [config, state, dispatch]);
```
- [ ] Pass props to `<FeatureSelector>`:
```tsx
onAutoFill={state.description.length >= 20 || state.expandedDescription.length >= 20 ? handleAutoFill : undefined}
isAutoFilling={isAutoFilling}
```
- [ ] Verify build: `npm run build 2>&1 | grep -E "error|Error"`
- [ ] Commit:
```bash
git add app/one-pager-beta/page.tsx
git commit -m "feat(beta): wire auto-fill handler in one-pager-beta page"
```

---

### Task 5: Deploy and verify

- [ ] Run: `vercel --prod`
- [ ] Open `https://mrd-producer-webapp.vercel.app/one-pager-beta`
- [ ] Fill description with 20+ chars
- [ ] Verify "Auto-fill Features" button appears and is enabled
- [ ] Click button — verify chips populate in must-have/nice-to-have
- [ ] Verify button is disabled when description is empty
- [ ] Commit any fixes, redeploy
