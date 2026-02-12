# Implementation Plan - Simplified Brief Helper

> **Branch:** `feature/brief-helper` (off `main`)
> **PRD:** `docs/plans/2026-02-11-simplified-brief-helper-PRD.md`
> **Design System:** `docs/plans/2026-02-11-simplified-brief-helper-design-system.md`
> **Date:** February 11, 2026

---

## Phase 1: Foundation (Tasks 1-6)

Core agents, basic UI, LangExtract integration.

---

### Task 1: Project Setup & Design Tokens

**Goal:** Create branch, route structure, and design token extensions.

**Steps:**
1. Create branch `feature/brief-helper` from `main`
2. Create route: `app/brief-helper/page.tsx` (shell)
3. Create layout: `app/brief-helper/layout.tsx`
4. Create `styles/tokens/brief-helper.css` with all new component tokens from design system doc
5. Import `brief-helper.css` in root layout CSS chain
6. Verify dev server runs clean

**Files created/modified:**
- `app/brief-helper/page.tsx` (new)
- `app/brief-helper/layout.tsx` (new)
- `styles/tokens/brief-helper.css` (new)
- `app/layout.tsx` (add CSS import)

**Acceptance criteria:**
- `/brief-helper` route loads empty page
- New tokens available via `var(--text-box-bg)` etc.
- No lint/build errors

---

### Task 2: Brief Helper State Management

**Goal:** Create reducer + context for the 6-field form state.

**Steps:**
1. Create `app/brief-helper/lib/brief-state.ts` with:
   - `BriefField` type: `'what' | 'who' | 'where' | 'moq' | 'must-have' | 'nice-to-have'`
   - `FieldState`: `{ rawText, bulletPoints, gaps, isAIProcessing, isComplete }`
   - `BriefState`: all 6 fields + session metadata
   - Actions: `SET_RAW_TEXT`, `SET_BULLET_POINTS`, `SET_GAPS`, `SET_AI_PROCESSING`, `MARK_COMPLETE`, `RESET_FIELD`
   - Reducer function
2. Create `app/brief-helper/lib/brief-context.tsx` with:
   - React context + provider
   - sessionStorage persistence (same pattern as intake)
   - Debounce helper for 2-3 second pause detection
3. Create `app/brief-helper/lib/field-definitions.ts` with:
   - Labels, placeholders, help text for each of the 6 fields
   - Field order and metadata

**Files created:**
- `app/brief-helper/lib/brief-state.ts`
- `app/brief-helper/lib/brief-context.tsx`
- `app/brief-helper/lib/field-definitions.ts`

**Acceptance criteria:**
- State updates work for all 6 fields
- sessionStorage persists across page refreshes
- Debounce fires after 2-3 second pause

---

### Task 3: Smart Text Box Component

**Goal:** Build the expandable textarea with AI processing states.

**Steps:**
1. Create `app/brief-helper/components/SmartTextBox.tsx`:
   - Textarea that auto-expands (min 120px, max 400px)
   - Debounced `onPause` callback (2-3 sec after last keystroke)
   - States: idle, typing, ai-processing, complete
   - `data-ai-processing` attribute for CSS pulse animation
   - Character count display (optional, bottom-right)
2. Create `app/brief-helper/components/SmartTextBox.module.css`:
   - Use tokens from `brief-helper.css`
   - Focus ring, AI processing animation, transitions
   - `prefers-reduced-motion` respect
3. Create `app/brief-helper/components/FieldStatusBadge.tsx`:
   - Shows "Field X/6" with complete/incomplete indicator

**Files created:**
- `app/brief-helper/components/SmartTextBox.tsx`
- `app/brief-helper/components/SmartTextBox.module.css`
- `app/brief-helper/components/FieldStatusBadge.tsx`
- `app/brief-helper/components/FieldStatusBadge.module.css`

**Acceptance criteria:**
- Textarea auto-expands on content
- Visual pulse animation during AI processing
- onPause fires correctly after debounce
- Focus ring matches design tokens

---

### Task 4: Brief Field Container & Page Layout

**Goal:** Assemble the 6-field form with progress indicator.

**Steps:**
1. Create `app/brief-helper/components/BriefField.tsx`:
   - Wraps SmartTextBox with label, counter, status badge
   - Slot for gap suggestions and AI panel (rendered conditionally later)
2. Create `app/brief-helper/components/BriefField.module.css`
3. Create `app/brief-helper/components/ProgressIndicator.tsx`:
   - Shows "X of 6 fields complete" + progress bar
   - Reuses existing `--progress-*` tokens
4. Create `app/brief-helper/components/ProgressIndicator.module.css`
5. Wire into `app/brief-helper/page.tsx`:
   - Render all 6 BriefField components
   - ProgressIndicator in header
   - BriefProvider wrapping the page
   - Responsive layout (single column, max-width 800px)

**Files created/modified:**
- `app/brief-helper/components/BriefField.tsx` (new)
- `app/brief-helper/components/BriefField.module.css` (new)
- `app/brief-helper/components/ProgressIndicator.tsx` (new)
- `app/brief-helper/components/ProgressIndicator.module.css` (new)
- `app/brief-helper/page.tsx` (wire up)

**Acceptance criteria:**
- 6 fields render with labels from field-definitions.ts
- Progress updates as fields are completed
- Responsive layout works at mobile/tablet/desktop
- Dark mode works

---

### Task 5: Text Extraction Agent (LangExtract)

**Goal:** Create the agent that parses free text into structured bullet points.

**Steps:**
1. Add `langextract` dependency (check npm availability; if not available, create wrapper around Gemini's extraction API)
2. Create `agent/agents/brief/text-extraction-agent.ts`:
   - Extends `BaseAgent<TextExtractionInput, TextExtractionOutput>`
   - Input: `{ fieldType: BriefField, freeText: string }`
   - Output: `{ bulletPoints: string[], entities: ExtractedEntity[], confidence: number }`
   - Uses LangExtract or Gemini structured output to:
     - Parse free text
     - Extract product entities (sizes, specs, materials, standards)
     - Convert to clean bullet points
   - Field-type-aware prompts (e.g., "what" focuses on product attributes, "who" focuses on personas)
3. Create `agent/agents/brief/types.ts`:
   - `TextExtractionInput`, `TextExtractionOutput`
   - `ExtractedEntity` type
   - `BriefFieldType` shared type
4. Create API route `app/api/brief/extract/route.ts`:
   - POST endpoint
   - Accepts `{ fieldType, freeText }`
   - Creates execution context, runs text-extraction-agent
   - Returns bullet points + entities
   - Input sanitization via existing `lib/sanitize.ts`

**Files created:**
- `agent/agents/brief/text-extraction-agent.ts`
- `agent/agents/brief/types.ts`
- `app/api/brief/extract/route.ts`

**Acceptance criteria:**
- Agent extracts entities from "secure tablet stand for retail POS"
- Returns structured bullet points
- API endpoint returns 200 with valid JSON
- Input is sanitized

---

### Task 6: Wire Extraction to UI

**Goal:** Connect the Smart Text Box pause event to the extraction API.

**Steps:**
1. Create `app/brief-helper/lib/use-extraction.ts` custom hook:
   - Calls `/api/brief/extract` on pause
   - Manages loading state
   - Updates brief context with bullet points
   - Handles errors gracefully
2. Update `SmartTextBox` to show bullet points below raw text
3. Update `BriefField` to show extraction results
4. Add loading skeleton while AI processes

**Files created/modified:**
- `app/brief-helper/lib/use-extraction.ts` (new)
- `app/brief-helper/components/SmartTextBox.tsx` (update)
- `app/brief-helper/components/BriefField.tsx` (update)

**Acceptance criteria:**
- Type in "What" field → pause → bullet points appear
- Loading indicator shows during processing
- Errors show user-friendly message
- Works for all 6 field types

---

## Phase 2: Intelligence (Tasks 7-10)

Gap detection, knowledge base, AI expansion.

---

### Task 7: Gap Detection Agent

**Goal:** Create agent that identifies missing information per field.

**Steps:**
1. Create `agent/agents/brief/gap-detection-agent.ts`:
   - Extends `BaseAgent<GapDetectionInput, GapDetectionOutput>`
   - Input: `{ fieldType, extractedData, productType? }`
   - Output: `{ gaps: Gap[], suggestedQuestions: string[], priority: 'high'|'medium'|'low' }`
   - Hardcoded initial patterns (e.g., "tablet stand" → placement, sizes, VESA, mounting, enclosure)
   - Later reads from knowledge base
2. Add types to `agent/agents/brief/types.ts`:
   - `Gap`, `GapDetectionInput`, `GapDetectionOutput`
3. Create API route `app/api/brief/gaps/route.ts`:
   - POST endpoint
   - Runs gap-detection-agent
   - Returns gaps + suggested questions

**Files created/modified:**
- `agent/agents/brief/gap-detection-agent.ts` (new)
- `agent/agents/brief/types.ts` (update)
- `app/api/brief/gaps/route.ts` (new)

**Acceptance criteria:**
- "tablet stand" input produces relevant gaps (placement, sizes, VESA)
- Gaps prioritized (high/medium/low)
- API returns structured gap data

---

### Task 8: Gap Suggestion UI Component

**Goal:** Show gap suggestions inline below each field.

**Steps:**
1. Create `app/brief-helper/components/GapSuggestion.tsx`:
   - Shows warning-colored box with detected gaps
   - Lists suggested questions
   - "Fill Manually" and "AI Expand" action buttons
   - Dismissable (X button)
   - Slide-in animation
2. Create `app/brief-helper/components/GapSuggestion.module.css`
3. Create `app/brief-helper/lib/use-gap-detection.ts` custom hook:
   - Calls `/api/brief/gaps` after extraction completes
   - Manages gap state per field
4. Wire into `BriefField` component

**Files created/modified:**
- `app/brief-helper/components/GapSuggestion.tsx` (new)
- `app/brief-helper/components/GapSuggestion.module.css` (new)
- `app/brief-helper/lib/use-gap-detection.ts` (new)
- `app/brief-helper/components/BriefField.tsx` (update)

**Acceptance criteria:**
- Gaps show after extraction completes
- Warning amber styling from design tokens
- Can dismiss suggestions
- "AI Expand" button triggers expansion (wired in Task 9)

---

### Task 9: Expansion Agent + AI Panel

**Goal:** Create the AI expansion agent and chat-like UI panel.

**Steps:**
1. Create `agent/agents/brief/expansion-agent.ts`:
   - Extends `BaseAgent<ExpansionInput, ExpansionOutput>`
   - Input: `{ fieldType, currentBullets, gaps, userMessage? }`
   - Output: `{ expandedBullets: string[], explanation: string }`
   - Conversational: supports follow-up messages
2. Create API route `app/api/brief/expand/route.ts`:
   - POST endpoint, supports message history
3. Create `app/brief-helper/components/AIExpansionPanel.tsx`:
   - Chat-like UI with AI messages and user messages
   - Input box at bottom
   - "Accept Changes" and "Keep Editing" buttons
   - Auto-scroll to latest message
   - Loading indicator for AI responses
4. Create `app/brief-helper/components/AIExpansionPanel.module.css`
5. Wire "AI Expand" button from GapSuggestion to open panel

**Files created/modified:**
- `agent/agents/brief/expansion-agent.ts` (new)
- `app/api/brief/expand/route.ts` (new)
- `app/brief-helper/components/AIExpansionPanel.tsx` (new)
- `app/brief-helper/components/AIExpansionPanel.module.css` (new)
- `app/brief-helper/components/BriefField.tsx` (update)
- `agent/agents/brief/types.ts` (update)

**Acceptance criteria:**
- AI panel opens on "AI Expand" click
- Chat messages display correctly (AI vs user)
- "Accept Changes" updates the field's bullet points
- Panel closes on "Keep Editing"
- Loading states work

---

### Task 10: Brief Orchestrator Agent

**Goal:** Orchestrator that coordinates extraction → gaps → expansion per field.

**Steps:**
1. Create `agent/orchestrators/brief-orchestrator.ts`:
   - Extends `BaseOrchestratorAgent`
   - Sub-agents: text-extraction, gap-detection, expansion
   - Coordinates sequential flow per field
   - Tracks which fields are complete
   - Triggers brief generation when all 6 complete
2. Create API route `app/api/brief/process-field/route.ts`:
   - Single endpoint that runs extract + gaps in sequence
   - Returns both bullet points and gaps in one response
   - Reduces round-trips vs separate calls
3. Update hooks to use combined endpoint

**Files created/modified:**
- `agent/orchestrators/brief-orchestrator.ts` (new)
- `app/api/brief/process-field/route.ts` (new)
- `app/brief-helper/lib/use-extraction.ts` (update to use combined endpoint)

**Acceptance criteria:**
- Single API call processes extraction + gap detection
- Orchestrator logs each stage transition
- Fallback works if one agent fails

---

## Phase 3: Output & Storage (Tasks 11-14)

Brief generation, storage, OAuth.

---

### Task 11: Brief Generator Agent

**Goal:** Generate the final simplified brief from all 6 fields.

**Steps:**
1. Create `agent/agents/brief/brief-generator-agent.ts`:
   - Extends `BaseAgent<BriefGeneratorInput, BriefGeneratorOutput>`
   - Input: all 6 fields' structured data (bullet points, entities)
   - Output: `{ markdown: string, html: string, metadata: BriefMetadata }`
   - Template: clean Markdown with sections for each field
   - Professional tone, concise bullet points
2. Create brief template in `references/brief-template.md`
3. Create API route `app/api/brief/generate/route.ts`:
   - POST endpoint
   - Accepts all 6 fields
   - Returns generated brief

**Files created:**
- `agent/agents/brief/brief-generator-agent.ts`
- `references/brief-template.md`
- `app/api/brief/generate/route.ts`

**Acceptance criteria:**
- Generates clean Markdown brief
- All 6 sections present
- Professional formatting
- Includes metadata (date, author)

---

### Task 12: Brief Preview & Download UI

**Goal:** Show generated brief and offer download/export options.

**Steps:**
1. Create `app/brief-helper/components/BriefPreview.tsx`:
   - Modal or slide-over panel
   - Renders Markdown as HTML
   - Section headers in accent color
   - Clean, print-ready styling
2. Create `app/brief-helper/components/BriefPreview.module.css`
3. Create "Generate Brief" button component (disabled until all fields complete)
4. Add download options:
   - Copy to clipboard (Markdown)
   - Download as `.md` file
   - (Drive integration in Task 14)
5. Wire into page

**Files created/modified:**
- `app/brief-helper/components/BriefPreview.tsx` (new)
- `app/brief-helper/components/BriefPreview.module.css` (new)
- `app/brief-helper/components/GenerateButton.tsx` (new)
- `app/brief-helper/components/GenerateButton.module.css` (new)
- `app/brief-helper/page.tsx` (update)

**Acceptance criteria:**
- Brief preview shows all 6 sections
- Copy to clipboard works
- Download as .md works
- Button disabled when fields incomplete
- Loading state during generation

---

### Task 13: SQLite Knowledge Base Setup

**Goal:** Set up persistent storage for product patterns.

**Steps:**
1. Add `better-sqlite3` dependency (or `sql.js` for serverless)
2. Create `lib/knowledge-base/db.ts`:
   - Initialize SQLite database
   - Create tables: `product_patterns`, `knowledge_patterns`
   - Create indexes
3. Create `lib/knowledge-base/patterns.ts`:
   - `savePattern(fieldType, input, output)` - store extraction result
   - `getPatterns(productType)` - retrieve known patterns
   - `getGapPatterns(productType)` - retrieve common gaps
   - `incrementUsage(patternId)` - track pattern usage
4. Create `agent/agents/brief/knowledge-base-agent.ts`:
   - Runs after brief generation completes
   - Extracts patterns from the submission
   - Stores in SQLite
   - Background execution (doesn't block user)

**Files created:**
- `lib/knowledge-base/db.ts`
- `lib/knowledge-base/patterns.ts`
- `agent/agents/brief/knowledge-base-agent.ts`

**Acceptance criteria:**
- SQLite database creates on first run
- Patterns stored after brief generation
- Patterns retrievable by product type
- No blocking of user flow

---

### Task 14: Google Drive Integration

**Goal:** Save completed briefs to Google Drive.

**Steps:**
1. Create `lib/google/drive.ts`:
   - Google Drive API client
   - `saveBrief(markdown, metadata)` → creates file in Drive
   - Folder structure: `/CompuLocks-Briefs/completed/{year}/{month}/`
   - Auto-create folders if missing
2. Create `lib/google/auth.ts`:
   - OAuth 2.0 flow helpers
   - Token storage + refresh
   - Scopes: `drive.file` (limited to app-created files)
3. Create API routes:
   - `app/api/auth/google/route.ts` - initiate OAuth
   - `app/api/auth/google/callback/route.ts` - handle callback
   - `app/api/brief/save-drive/route.ts` - save brief to Drive
4. Add "Save to Drive" button in BriefPreview

**Files created/modified:**
- `lib/google/drive.ts` (new)
- `lib/google/auth.ts` (new)
- `app/api/auth/google/route.ts` (new)
- `app/api/auth/google/callback/route.ts` (new)
- `app/api/brief/save-drive/route.ts` (new)
- `app/brief-helper/components/BriefPreview.tsx` (update)

**Acceptance criteria:**
- OAuth flow works end-to-end
- Brief saved to correct Drive folder
- User sees success confirmation
- Handles token refresh gracefully

---

## Phase 4: Polish & Testing (Tasks 15-17)

Redis cache, accessibility, tests.

---

### Task 15: Redis Session Cache

**Goal:** Add Redis caching for active sessions and pattern lookups.

**Steps:**
1. Add `ioredis` dependency
2. Create `lib/cache/redis.ts`:
   - Redis client with connection pooling
   - `cacheFieldState(sessionId, fieldType, data)` - cache extraction results
   - `getCachedFieldState(sessionId, fieldType)` - retrieve cached state
   - `cachePattern(productType, gaps)` - cache common patterns
   - TTL: 1 hour for sessions, 24 hours for patterns
3. Update gap-detection-agent to check Redis before querying
4. Update extraction to cache results
5. Graceful fallback if Redis unavailable

**Files created/modified:**
- `lib/cache/redis.ts` (new)
- `agent/agents/brief/gap-detection-agent.ts` (update)
- `agent/agents/brief/text-extraction-agent.ts` (update)

**Acceptance criteria:**
- Redis caches extraction results
- Gap detection uses cached patterns
- App works without Redis (graceful fallback)
- TTL expires correctly

---

### Task 16: Accessibility & Polish

**Goal:** WCAG 2.1 AA compliance and UX polish.

**Steps:**
1. Add ARIA labels to all interactive elements
2. Add keyboard navigation:
   - Tab/Shift+Tab between fields
   - Ctrl+Enter to trigger AI expansion
   - Esc to close panels
3. Focus trap in AI expansion panel
4. `prefers-reduced-motion` for all animations
5. Screen reader announcements for AI processing states (`aria-live="polite"`)
6. Touch target sizing (44x44px minimum)
7. Color contrast verification (all combinations)

**Files modified:**
- All component files in `app/brief-helper/components/`
- All CSS module files

**Acceptance criteria:**
- Keyboard-only navigation works
- Screen reader announces state changes
- All contrast ratios pass WCAG AA
- Animations respect reduced motion preference

---

### Task 17: Tests

**Goal:** Test coverage for agents, hooks, and critical paths.

**Steps:**
1. Create `__tests__/agent/agents/brief/text-extraction-agent.test.ts`
2. Create `__tests__/agent/agents/brief/gap-detection-agent.test.ts`
3. Create `__tests__/agent/agents/brief/expansion-agent.test.ts`
4. Create `__tests__/agent/agents/brief/brief-generator-agent.test.ts`
5. Create `__tests__/lib/knowledge-base/patterns.test.ts`
6. Create `__tests__/app/brief-helper/lib/brief-state.test.ts` (reducer tests)
7. Mock AI providers (existing pattern from `__tests__/agent/`)

**Files created:**
- `__tests__/agent/agents/brief/text-extraction-agent.test.ts`
- `__tests__/agent/agents/brief/gap-detection-agent.test.ts`
- `__tests__/agent/agents/brief/expansion-agent.test.ts`
- `__tests__/agent/agents/brief/brief-generator-agent.test.ts`
- `__tests__/lib/knowledge-base/patterns.test.ts`
- `__tests__/app/brief-helper/lib/brief-state.test.ts`

**Acceptance criteria:**
- All tests pass
- Agent tests cover happy path + error cases
- Reducer tests cover all actions
- Mocked providers (no real AI calls in tests)

---

## Task Dependencies

```
Task 1 (setup)
  └→ Task 2 (state management)
       └→ Task 3 (SmartTextBox)
            └→ Task 4 (page layout)
                 └→ Task 5 (extraction agent)
                      └→ Task 6 (wire extraction)
                           ├→ Task 7 (gap detection agent)
                           │    └→ Task 8 (gap suggestion UI)
                           │         └→ Task 9 (expansion agent + AI panel)
                           │              └→ Task 10 (orchestrator)
                           │                   └→ Task 11 (brief generator)
                           │                        └→ Task 12 (preview + download)
                           │                             ├→ Task 13 (SQLite KB)
                           │                             └→ Task 14 (Google Drive)
                           └→ Task 15 (Redis cache) — can start after Task 6
Task 16 (accessibility) — can start after Task 12
Task 17 (tests) — can start after Task 11, run last
```

**Parallelizable pairs:**
- Task 13 + Task 14 (storage backends are independent)
- Task 15 can run alongside Tasks 7-10
- Task 16 + Task 17 can run in parallel

---

## New Dependencies to Install

| Package | Purpose | Required By |
|---------|---------|-------------|
| `langextract` | Gemini-powered extraction (or Gemini structured output if unavailable on npm) | Task 5 |
| `better-sqlite3` or `sql.js` | SQLite for knowledge base | Task 13 |
| `ioredis` | Redis client | Task 15 |
| `googleapis` | Google Drive API + OAuth | Task 14 |

---

## File Tree Summary

```
app/
├── brief-helper/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── components/
│   │   ├── SmartTextBox.tsx + .module.css
│   │   ├── BriefField.tsx + .module.css
│   │   ├── FieldStatusBadge.tsx + .module.css
│   │   ├── GapSuggestion.tsx + .module.css
│   │   ├── AIExpansionPanel.tsx + .module.css
│   │   ├── ProgressIndicator.tsx + .module.css
│   │   ├── GenerateButton.tsx + .module.css
│   │   └── BriefPreview.tsx + .module.css
│   └── lib/
│       ├── brief-state.ts
│       ├── brief-context.tsx
│       ├── field-definitions.ts
│       ├── use-extraction.ts
│       └── use-gap-detection.ts
├── api/
│   ├── brief/
│   │   ├── extract/route.ts
│   │   ├── gaps/route.ts
│   │   ├── expand/route.ts
│   │   ├── process-field/route.ts
│   │   ├── generate/route.ts
│   │   └── save-drive/route.ts
│   └── auth/
│       └── google/
│           ├── route.ts
│           └── callback/route.ts

agent/
├── agents/
│   └── brief/
│       ├── types.ts
│       ├── text-extraction-agent.ts
│       ├── gap-detection-agent.ts
│       ├── expansion-agent.ts
│       ├── brief-generator-agent.ts
│       └── knowledge-base-agent.ts
└── orchestrators/
    └── brief-orchestrator.ts

lib/
├── knowledge-base/
│   ├── db.ts
│   └── patterns.ts
├── cache/
│   └── redis.ts
└── google/
    ├── auth.ts
    └── drive.ts

styles/tokens/
└── brief-helper.css

references/
└── brief-template.md

__tests__/
├── agent/agents/brief/
│   ├── text-extraction-agent.test.ts
│   ├── gap-detection-agent.test.ts
│   ├── expansion-agent.test.ts
│   └── brief-generator-agent.test.ts
├── lib/knowledge-base/
│   └── patterns.test.ts
└── app/brief-helper/lib/
    └── brief-state.test.ts
```

---

## Commit Strategy

One commit per task. Message format:
```
Brief Helper Task N: [short description]

[Details of what was implemented]
```

Example:
```
Brief Helper Task 1: Project setup and design token extensions

- Create /brief-helper route shell
- Add brief-helper.css with component tokens
- Import tokens in root layout
```
