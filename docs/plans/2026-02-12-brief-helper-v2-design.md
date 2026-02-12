# Brief Helper V2 - Enhanced UX Design

**Date:** 2026-02-12
**Status:** Approved for Implementation
**Version:** 2.0
**Previous Version:** Phase 1 (Tasks 1-7) - Basic 6-field capture

---

## Executive Summary

This design enhances the Brief Helper feature with a split-screen interface, initial description seeding, and improved user freedom. Users start with a natural language description that AI breaks down into 6 structured fields, then refine each field with collapsible sections and live document preview.

**Key Enhancements:**
1. **Initial Description Page** - Single input seeds all 6 fields via batch AI extraction
2. **Split-Screen Layout** - Input fields (left) + AI Suggestions/Preview (right)
3. **Collapsible Fields** - "Done" button compresses completed sections
4. **Live Preview Toggle** - Switch between AI suggestions and formatted document
5. **Model Optimization** - Gemini 2.5 Pro primary, GPT-4o-mini fallback (remove Claude)
6. **User Freedom** - Guide, don't constrain; gaps are suggestions, not blockers

---

## User Journey

### Flow Overview

```
Start Page (/brief-helper/start)
    ↓
Enter description (50-150+ chars with grading)
    ↓
Click "Continue" → Batch AI Extraction (loading overlay)
    ↓
Main Page (/brief-helper) - Split Screen
    ↓
Left: Edit 6 pre-filled fields
Right: AI Suggestions or Document Preview (toggle)
    ↓
Mark fields "Done" → Fields collapse
    ↓
Toggle to Preview → See formatted brief
    ↓
Export (Future: Task 8-9)
```

### Detailed User Flow

**Step 1: Start Page**
- User lands on `/brief-helper/start`
- Sees large textarea: "Describe Your Product"
- Types product description (free-form, natural language)
- Real-time character counter shows grading:
  - 0-49 chars: "Add more details" (amber)
  - 50-99 chars: "Good start ✓" (blue)
  - 100-149 chars: "Great detail ✓✓" (green)
  - 150+ chars: "Excellent! ✓✓✓" (bright green)
- Sees disabled "Upload Document" and "Analyze Link" buttons (future)
- Clicks "Continue" (disabled if < 20 chars)

**Step 2: Batch Extraction**
- Navigates to `/brief-helper` with loading overlay
- Overlay shows: "Analyzing your description..."
- Progress checklist updates as fields complete:
  - ✓ Extracting product details
  - ✓ Identifying users
  - ⏳ Determining environment...
  - (continues for all 6 fields)
- Each field populates with bullet points as ready
- Gap detection runs automatically per field
- Overlay fades when complete

**Step 3: Main Page - Initial State**
- Split screen appears (50/50 on desktop)
- Left panel shows:
  - "← Edit Description" back button
  - Progress: "0 of 6 fields complete"
  - 6 expanded fields with pre-filled bullets
  - Gap warnings (amber panels) where applicable
- Right panel shows:
  - Toggle: "AI Suggestions" (active) | "Document Preview"
  - AI suggestions for first field (auto-focused)
  - Summary of other fields needing attention

**Step 4: Editing Fields**
- User clicks/focuses any field
- Right panel (Suggestions mode) updates to that field's context
- User can:
  - Edit raw text (triggers re-extraction after 2.5s pause)
  - Click "AI Expand" for conversational help
  - Dismiss or hide gap warnings
  - Mark field "Done" when satisfied

**Step 5: Collapsing Fields**
- User clicks "Done" on a field
- Field collapses to summary card (80px height):
  - Green checkmark + field name
  - First 2-3 bullets (preview)
  - Gap badge if gaps exist: "⚠ 1 gap"
  - "Edit" button to re-expand
- Next incomplete field auto-focuses
- Right panel switches to next field's suggestions
- Progress updates: "1 of 6 fields complete"

**Step 6: Preview Toggle**
- User clicks "Document Preview" toggle
- Right panel switches to formatted brief view
- Shows completed fields as clean sections
- Incomplete fields show "—" (em dash)
- User can toggle back to Suggestions anytime

**Step 7: Refinement**
- User expands collapsed field via "Edit"
- Field expands, shows all content
- User continues editing
- Can re-mark "Done" to collapse again

**Step 8: Back to Start (Optional)**
- User clicks "← Edit Description"
- Returns to start page with preserved description
- Warning: "This will replace your current fields"
- Can modify description and re-run extraction

---

## Architecture

### Model Configuration

**Primary Provider:** Gemini 2.5 Pro
- All agents use this model
- Better quality than Flash, still free tier
- Handles complex extraction and expansion

**Fallback Provider:** GPT-4o-mini (OpenAI)
- Activates if Gemini fails
- Cost-effective fallback
- Maintains service reliability

**Removed:** Anthropic/Claude
- Delete `lib/providers/anthropic-provider.ts`
- Remove from `provider-chain.ts`
- Update `config/agents/default.yaml`

### Route Structure

```
/brief-helper/start    → New: Initial description page
/brief-helper          → Updated: Split-screen main page
/brief-helper/test     → Existing: Component test page (keep)
```

### State Management Updates

**New State Fields:**
```typescript
interface BriefState {
  // Existing
  fields: Record<BriefField, FieldState>;

  // New
  initialDescription: string;           // From start page
  activeFieldId: BriefField | null;     // Currently focused field
  previewMode: 'suggestions' | 'document'; // Right panel toggle
  processingFields: BriefField[];       // Fields being extracted
  collapsedFields: BriefField[];        // Fields marked "Done"
}

interface FieldState {
  rawText: string;
  bulletPoints: string[];
  gaps: Gap[];
  hiddenGaps: string[];                 // NEW: Gap IDs visually hidden
  isComplete: boolean;
  aiProcessing: boolean;
}
```

**New Actions:**
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

**SessionStorage:**
- Existing key: `brief-helper-state` (all state)
- Separate key: `brief-helper-description` (start page only)
- Auto-save debounced 500ms

---

## API Endpoints

### New Endpoint: Batch Extraction

**`POST /api/brief/batch-extract`**

**Purpose:** Extract all 6 fields from initial description in one AI call

**Input:**
```json
{
  "description": "iPad Pro stand for retail stores with rotation..."
}
```

**Output:**
```json
{
  "fields": {
    "what": {
      "bullets": ["iPad Pro stand for retail", "360° rotation capability"],
      "confidence": 0.85
    },
    "who": {
      "bullets": ["Retail store operators", "Customer-facing environments"],
      "confidence": 0.78
    },
    "where": { "bullets": [...], "confidence": 0.82 },
    "moq": { "bullets": [...], "confidence": 0.65 },
    "mustHaves": { "bullets": [...], "confidence": 0.88 },
    "niceToHaves": { "bullets": [...], "confidence": 0.70 }
  },
  "gaps": {
    "what": [],
    "who": [{ "id": "gap-1", "message": "Target user role unclear", ... }],
    "where": [],
    ...
  }
}
```

**Agent:** `BatchExtractionAgent` (new)

**Flow:**
1. Sanitize input (max 2000 chars)
2. Create execution context with Gemini 2.5 Pro
3. Call `BatchExtractionAgent.execute()`
4. Agent makes single structured AI call for all 6 fields
5. Run `GapDetectionAgent` on each extracted field
6. Return all fields + gaps

**Error Handling:**
- 400: Missing or invalid description
- 500: Agent execution failure (after fallback attempts)

### Updated Endpoints

**`POST /api/brief/extract`** (Existing - keep for manual edits)
- Update model to Gemini 2.5 Pro
- Keep single-field extraction logic
- Used when user manually edits a field

**`POST /api/brief/gaps`** (Existing - no changes)
- Pattern-based, no AI calls
- Already works correctly

**`POST /api/brief/expand`** (Existing - update model)
- Update to Gemini 2.5 Pro
- Add `initialDescription` to conversation context (optional)
- Helps AI understand original intent

---

## Agents

### New Agent: BatchExtractionAgent

**File:** `agent/agents/brief/batch-extraction-agent.ts`

**Purpose:** Extract all 6 fields from initial description in one call

**Input:**
```typescript
interface BatchExtractionInput {
  description: string;
}
```

**Output:**
```typescript
interface BatchExtractionOutput {
  fields: {
    what: { bullets: string[], confidence: number },
    who: { bullets: string[], confidence: number },
    where: { bullets: string[], confidence: number },
    moq: { bullets: string[], confidence: number },
    mustHaves: { bullets: string[], confidence: number },
    niceToHaves: { bullets: string[], confidence: number }
  }
}
```

**System Prompt:**
```
You are extracting structured product information from a natural language description.

Extract 6 categories:
1. WHAT - Product type, form factor, key features, specifications
2. WHO - Target users, customer types, personas, roles
3. WHERE - Use environment, installation context, locations
4. MOQ - Minimum order quantity, volume requirements, batch sizes
5. MUST_HAVES - Non-negotiable features, critical requirements
6. NICE_TO_HAVES - Optional enhancements, desired features

For each category, extract:
- "bullets": Array of concise statements (1-2 sentences each)
- "entities": Key entities mentioned (products, places, quantities, features)

Respond with valid JSON in this exact format:
{
  "what": {
    "bullets": ["statement 1", "statement 2"],
    "entities": [{"type": "product_type", "value": "...", "confidence": 0.9}]
  },
  ...
}
```

**Key Logic:**
- Single AI call with structured output (`responseFormat: 'json'`)
- Temperature: 0.3 (consistent extraction)
- Reuses JSON cleaning logic from `TextExtractionAgent`
- Strips markdown code blocks (```json ... ```)
- Validates all 6 fields present
- Calculates confidence per field

### Updated Agents

**TextExtractionAgent:**
- Change model to Gemini 2.5 Pro
- Keep existing markdown JSON cleaning logic (already fixed)
- No other changes

**ExpansionAgent:**
- Change model to Gemini 2.5 Pro
- Add optional `initialDescription` to context
- Helps AI provide more relevant suggestions

**GapDetectionAgent:**
- No changes (pattern-based, no AI)

---

## UI Components

### Design Tokens

**New Tokens** (add to `styles/tokens/brief-helper.css`):

```css
:root {
  /* Split Layout */
  --brief-split-ratio: 50%;
  --brief-panel-gap: 32px;
  --brief-panel-padding: 24px;
  --brief-mobile-breakpoint: 768px;
  --brief-tablet-breakpoint: 1024px;

  /* Progress Bar */
  --brief-progress-height: 8px;
  --brief-progress-radius: 4px;
  --brief-progress-warning: var(--brief-color-warning);
  --brief-progress-info: var(--brief-color-info);
  --brief-progress-success: var(--brief-color-success);
  --brief-progress-excellent: #00d68f;

  /* Collapsed Field */
  --brief-collapsed-height: 80px;
  --brief-collapsed-bg: var(--brief-color-surface);
  --brief-collapsed-border: var(--brief-color-border);
  --brief-collapsed-padding: 16px;

  /* Right Panel Toggle */
  --brief-toggle-bg: var(--brief-color-surface);
  --brief-toggle-active-bg: var(--brief-color-primary);
  --brief-toggle-active-text: white;
  --brief-toggle-height: 40px;

  /* Loading Overlay */
  --brief-overlay-bg: rgba(0, 0, 0, 0.5);
  --brief-overlay-content-bg: var(--brief-color-surface);
  --brief-overlay-padding: 32px;

  /* Spacing */
  --brief-field-gap: 24px;
  --brief-section-gap: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brief-progress-excellent: #00ff9d;
    --brief-overlay-bg: rgba(0, 0, 0, 0.7);
  }
}
```

### Component Structure

**Start Page Components:**
```
app/brief-helper/start/
├── page.tsx                      # Main route
├── components/
│   ├── DescriptionInput.tsx      # Textarea + counter
│   ├── ProgressGrading.tsx       # Color-coded progress bar
│   └── FutureOptions.tsx         # Disabled upload/link buttons
└── start.module.css              # Page styles
```

**Main Page New Components:**
```
app/brief-helper/components/
├── SplitLayout.tsx               # 50/50 grid container
├── LeftPanel.tsx                 # Input fields panel
├── RightPanel.tsx                # Suggestions/Preview panel
├── ProgressIndicator.tsx         # "3 of 6 complete"
├── CollapsedField.tsx            # Summary card
├── RightPanelToggle.tsx          # Segmented control toggle
├── SuggestionsView.tsx           # AI suggestions content
├── DocumentPreview.tsx           # Formatted brief view
└── LoadingOverlay.tsx            # Batch extraction loading
```

**Updated Components:**
- `BriefField.tsx` - Add collapse logic, conditional render
- `GapSuggestion.tsx` - Add "Hide" button alongside "Dismiss"

### Component Specifications

**SplitLayout.tsx:**
- CSS Grid: 50% / 50% (desktop ≥1024px)
- Single column stacked (mobile <768px)
- Independent scroll areas
- Gap: 32px

**LeftPanel.tsx:**
- Back button (conditional, if came from start)
- Progress indicator
- 6 BriefField components (expanded or collapsed)
- Auto-scroll to active field on focus

**CollapsedField.tsx:**
- Max height: 80px
- Green checkmark icon + field name
- First 2-3 bullets (truncated with "...")
- Gap badge if gaps exist: "⚠ 1 gap" (amber)
- "Edit" button
- Click anywhere to expand
- Smooth expand animation (300ms ease)

**RightPanel.tsx:**
- Sticky header with toggle button
- Conditional render: SuggestionsView or DocumentPreview
- Fade transition between modes (200ms)

**RightPanelToggle.tsx:**
- Segmented control style
- Two buttons: "AI Suggestions" | "Document Preview"
- Active state: primary color background, white text
- Icon + label for each mode

**SuggestionsView.tsx:**
- Top section (60% height):
  - Title: "Suggestions for [Field Name]"
  - Contextual tips for active field
  - Examples and common patterns
  - Empty state: "Looking good! ✓"
- Divider
- Bottom section (40% height):
  - "Other fields needing attention"
  - Clickable list of incomplete fields
  - Shows gap count per field
  - "All complete! 🎉" when done

**DocumentPreview.tsx:**
- Clean formatted document
- Section headers for each field
- Bullets as clean lists
- Incomplete fields: "—" (em dash)
- Professional typography
- Matches export format

**LoadingOverlay.tsx:**
- Full-screen overlay with backdrop blur
- Center modal (max-width: 500px)
- Title: "Analyzing your description..."
- Progress checklist (6 items):
  - ✓ Done (green)
  - ⏳ Processing (blue, animated)
  - ⌛ Pending (gray)
- Spinner animation
- Fade out on complete (300ms)

**DescriptionInput.tsx:**
- Auto-expanding textarea (min 200px)
- Placeholder with example
- Real-time character count (debounced 300ms)
- Accessible (aria-label, aria-describedby)

**ProgressGrading.tsx:**
- Horizontal progress bar
- 4 color zones (0-49, 50-99, 100-149, 150+)
- Label text changes with zones
- Character count display
- Smooth color transitions
- Accessible (role="progressbar", aria-valuenow)

---

## Interaction Patterns

### Field Focus & Right Panel Sync

1. User clicks/focuses any field
2. `dispatch({ type: 'SET_ACTIVE_FIELD', fieldId: 'what' })`
3. Right panel (if in Suggestions mode) re-renders with that field's context
4. Smooth transition (no jarring content shift)

### Mark Field "Done"

1. User clicks "Done" button
2. `dispatch({ type: 'MARK_COMPLETE', fieldId: 'what' })`
3. `dispatch({ type: 'TOGGLE_FIELD_COLLAPSE', fieldId: 'what' })`
4. Field collapses with animation (300ms)
5. Next incomplete field auto-focuses
6. Right panel switches to next field (if Suggestions mode)
7. Progress indicator updates

### Collapse/Expand

**Collapse:**
- Click "Done" → Add to `collapsedFields` array
- BriefField renders `<CollapsedField>` instead of full UI
- Height animates from full → 80px

**Expand:**
- Click "Edit" or click anywhere on collapsed card
- Remove from `collapsedFields` array
- Height animates from 80px → full
- Auto-scroll field into view
- Focus textarea

### Right Panel Toggle

1. Click toggle button
2. `dispatch({ type: 'SET_PREVIEW_MODE', mode: 'document' })`
3. Right panel fades out current view (100ms)
4. Switch content
5. Fade in new view (100ms)
6. State persists in sessionStorage

### Gap Panel Hide

1. Click "Hide" button on `GapSuggestion`
2. `dispatch({ type: 'HIDE_GAP', fieldId: 'what', gapId: 'gap-1' })`
3. Gap visual changes: reduced opacity, "Hidden" badge
4. Gap still counted in summary (not dismissed)
5. Can be un-hidden by re-expanding field

### Back to Start Page

1. Click "← Edit Description"
2. Show confirmation: "This will replace your current fields. Continue?"
3. If confirmed: Navigate to `/brief-helper/start`
4. Pre-fill description from `state.initialDescription`
5. "Continue" button warns: "This will overwrite your fields"
6. User can modify and re-run extraction

---

## Responsive Design

**Desktop (≥1024px):**
- 50% / 50% split
- Both panels visible
- Toggle between Suggestions/Preview

**Tablet (768px - 1023px):**
- 60% left / 40% right (more input space)
- Both panels visible
- Smaller font sizes

**Mobile (<768px):**
- Single column layout
- Left panel (fields) shown first
- Right panel below (full width)
- Toggle becomes tab navigation
- Collapsed fields more compact (60px)

---

## Accessibility

**Keyboard Navigation:**
- Tab through all interactive elements
- Enter to activate buttons/toggles
- Escape to close expanded fields
- Arrow keys in toggle control

**Screen Readers:**
- ARIA labels on all controls
- Live regions for state changes
- Progress announcements
- Field completion announcements

**Visual:**
- High contrast mode support
- Focus indicators (2px outline)
- Reduced motion support (prefers-reduced-motion)
- Color not sole indicator (icons + text)

---

## Performance Considerations

**Batch Extraction:**
- Target: < 10 seconds for all 6 fields
- Progressive population (fields appear as ready)
- User sees progress, doesn't wait idle

**Field Switching:**
- Target: < 100ms perceived latency
- Debounced state updates
- Optimistic UI updates

**Animations:**
- Target: 60fps smooth
- CSS transitions (GPU accelerated)
- Reduced motion media query support

**SessionStorage:**
- Debounced writes (500ms)
- Non-blocking async operations
- Max size check (5MB limit)

---

## Future Enhancements (Not in V2)

**Upload Document** (Option 2 on start page):
- Accept .doc, .docx, .pdf
- Extract text via backend service
- Use as description input

**Analyze Link** (Option 3 on start page):
- User pastes URL
- AI fetches page content
- Suggests description from analysis
- User reviews before proceeding

**Brief Generation** (Tasks 8-9):
- "Generate Brief" button
- Creates formatted document
- Export to DOCX, PDF, HTML

**Storage Integration** (Tasks 10-13):
- Redis: Hot cache for active sessions
- SQLite: Knowledge base (learns patterns)
- Google Drive: Completed briefs (OAuth)

**Knowledge Learning:**
- `KnowledgeBaseAgent` learns from completions
- Improves suggestions over time
- Pattern recognition for common products

---

## Migration Notes

**Backward Compatibility:**
- Existing `/brief-helper` route still works (no start page)
- User can skip description and fill manually
- All Phase 1 features preserved (extraction, gaps, expansion)
- sessionStorage schema backwards compatible (new fields optional)

**Breaking Changes:**
- None. Pure additive design.
- Old links work, new flow is optional

**Data Migration:**
- No migration needed
- sessionStorage adds new fields with defaults
- Existing sessions continue working

---

## Success Metrics

**User Experience:**
- Time to first field population: < 10 seconds
- Fields marked "Done" in first session: ≥ 4 out of 6
- Users who toggle to Preview: ≥ 60%
- Users who return via Back button: < 10% (indicates description was good)

**Technical:**
- Batch extraction success rate: > 95%
- Fallback to GPT-4o-mini: < 5%
- API response time (p95): < 8 seconds
- Client-side render time: < 100ms

**Quality:**
- Gap detection accuracy: > 80% (validated gaps)
- User dismisses gaps: < 30% (indicates relevance)
- Field completion rate: > 90%

---

## Conclusion

This design transforms Brief Helper from a manual 6-field form into an intelligent, guided experience. Users start with natural language, get AI-powered structure, and refine with freedom. The split-screen layout balances input focus with awareness (suggestions, preview). Collapsible fields reduce cognitive load while maintaining visibility.

**Key Principles:**
- **Guide, don't constrain** - Suggestions, not mandates
- **Progressive disclosure** - Start simple, reveal complexity as needed
- **User freedom** - Can skip, edit, or override any AI output
- **Transparent AI** - Show what AI is doing, let user control it

**Ready for Implementation:** 17 hours estimated across 9 phases.
