# Product Brief Helper V2 - Design Document

**Date:** February 17, 2026
**Status:** Approved
**Purpose:** Simplified product requirements capture tool for creating structured product briefs

---

## Executive Summary

Product Brief Helper V2 is a streamlined intake tool that captures essential product information through 9 fields (6 required, 3 optional), generates AI-powered suggestions for missing information, and exports a clean, template-compliant DOCX document. This tool is designed for internal stakeholders and sales teams who need to quickly document product requirements without deep market research.

**Key Difference from MRD Generator:** This is NOT a Market Requirements Document with 12 sections and deep competitive research. This is a simple product brief that focuses on what we're building, who it's for, and what it needs to do.

---

## 1. Architecture Overview

### High-Level Flow

```
START PAGE (Character-graded input)
    ↓
BATCH EXTRACTION (AI populates all 9 fields)
    ↓
SPLIT SCREEN EDITOR
├─ LEFT: Editable fields (accordion)
├─ RIGHT: Live document preview
└─ Gap suggestions with "+" quick-add
    ↓
OPTIONAL: Competitive Research (Field 9 only)
    ↓
EXPORT DOCX (Template-compliant)
```

### File Structure

```
app/product-brief/
├── page.tsx                       # Main integration
├── components/
│   ├── StartPage.tsx             # Character-graded input
│   ├── SectionEditor.tsx         # Accordion of 9 fields
│   ├── SectionField.tsx          # Individual field editor
│   ├── GapChips.tsx              # Gap suggestions with "+" buttons
│   ├── DocumentPreview.tsx       # Live markdown preview
│   └── CompetitionResearch.tsx   # Optional research trigger
├── lib/
│   ├── brief-state.ts            # State management (9 fields)
│   └── brief-context.tsx         # React Context + sessionStorage

agent/agents/product-brief/
├── batch-extract-agent.ts        # Extract all 9 fields (temp 0.3)
├── gap-detection-agent.ts        # Detect missing info per field (temp 0.2)
└── competitor-agent.ts           # Optional: fetch competitors (reuse from Phase 4)

app/api/product-brief/
├── batch-extract/route.ts        # POST: extract all fields
├── detect-gaps/route.ts          # POST: find gaps for field
├── research/route.ts             # POST: trigger competitive research
├── analyze-link/route.ts         # POST: analyze competitor URL
└── export/route.ts               # POST: generate DOCX

lib/product-brief-generator.ts    # DOCX generation with docx library
config/product-brief-gaps.yaml    # Gap detection rules per field
```

---

## 2. Field Structure

### 9 Fields (6 Required + 3 Optional)

| # | Field | Type | Required | Description |
|---|-------|------|----------|-------------|
| 1 | **Product Description** | Text (paragraph) | ✅ | What is it? High-level overview |
| 2 | **Target Industry** | List (bullets) | ✅ | Hospitality, Healthcare, Manufacturing, Retail, etc. |
| 3 | **Where Used** | List (bullets) | ✅ | Countertops, Floor, Wall-mounted, Indoor/Outdoor, etc. |
| 4 | **Who Uses It** | List (bullets) | ✅ | Professionals, Technicians, Installers, Customers, Trained personnel |
| 5 | **Must-Have Features** | List (bullets) | ✅ | Critical requirements |
| 6 | **Nice-to-Have Features** | List (bullets) | ✅ | Optional enhancements |
| 7 | **MOQ** | Text (short) | ⭕ | Minimum Order Quantity |
| 8 | **Risk Assessment** | Text (paragraph) | ⭕ | What could go wrong? Concerns? |
| 9 | **Competition** | Mixed (structured + text) | ⭕ | AI-suggested + user-added competitors |

### Field Display Logic

**When Expanded (editing):**
```
┌─────────────────────────────────────┐
│ ## 1. Product Description           │
│                                     │
│ [Editable text area with content]  │
│                                     │
│ 💡 Missing: Product name [+]       │
│ 💡 Missing: Key features [+]       │
│                                     │
│ [Mark as Done]                      │
└─────────────────────────────────────┘
```

**When Collapsed (done):**
```
┌─────────────────────────────────────┐
│ ✓ 1. Product Description       [Edit]│
│ The purpose of this product is to... │
└─────────────────────────────────────┘
```

**Key Principles:**
- **No AI showoff** - Don't display "AI Extracted Points" or "Original Text" separately
- **Single text field** - One editable field per section, content is content (AI-generated or user-typed, doesn't matter)
- **Gap chips with "+"** - Clicking "+" inserts gap suggestion into the field as a bullet point
- **Collapsed preview** - Shows first ~100 characters of field content

---

## 3. Competition Field (Field 9) - Special Behavior

### Three Sources of Competition Data

```
┌─────────────────────────────────────────────────────┐
│ ## 9. Competition (Optional)                        │
│                                                     │
│ [🔍 Research Competitors] button                   │
│                                                     │
│ ─── AI Research Results ───                        │
│ • Company A - Product X - $299            [x]      │
│ • Company B - Product Y - $450            [x]      │
│ • Company C - Product Z - $350            [x]      │
│                                                     │
│ ─── Add Competitor Links ───                       │
│ [URL input] [Analyze] button                       │
│                                                     │
│ • Company D - Product W - $199            [x]      │
│   (from user-provided link)                        │
│                                                     │
│ ─── Manual Entries ───                             │
│ [Free text area]                                   │
│ User can type anything here...                     │
│                                                     │
│ [Mark as Done]                                     │
└─────────────────────────────────────────────────────┘
```

### Competition State

```typescript
interface CompetitionFieldState {
  aiCompetitors: Array<{
    id: string;
    company: string;
    product: string;
    price?: string;
    source: 'auto-research' | 'user-link';
    url?: string;
    removed: boolean;
  }>;

  manualText: string;  // Free-form user text

  researchStatus: 'idle' | 'researching' | 'complete' | 'error';
  linkAnalysisStatus: 'idle' | 'analyzing' | 'complete' | 'error';
}
```

### Competition APIs

```typescript
// POST /api/product-brief/research-competitors
{
  productDescription: string;
  targetIndustry: string;
  whereUsed: string;
  whoUsesIt: string;
}
→ Returns: CompetitorInfo[] (3-5 competitors)

// POST /api/product-brief/analyze-link
{
  url: string;
}
→ Returns: CompetitorInfo (scraped from URL)
```

---

## 4. Batch Extraction

### Start Page

```
┌─────────────────────────────────────────────────────┐
│         Product Brief Generator                     │
│                                                     │
│  Describe your product concept:                    │
│  ┌───────────────────────────────────────────────┐ │
│  │ [Large text area]                             │ │
│  │                                                │ │
│  │ Include: what it is, who it's for, where      │ │
│  │ it's used, key features...                     │ │
│  │                                                │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Character count: 0 / 200+ recommended             │
│  ⚠️ More detail = better extraction                │
│                                                     │
│  [Generate Brief] (disabled until 50+ chars)       │
└─────────────────────────────────────────────────────┘
```

### Extraction Agent with Structured Output

```typescript
// agent/agents/product-brief/batch-extract-agent.ts

import { z } from 'zod';

const ProductBriefSchema = z.object({
  product_description: z.string().describe('2-3 sentence overview'),
  target_industry: z.array(z.string()).describe('List of target industries'),
  where_used: z.array(z.string()).describe('List of use locations/environments'),
  who_uses: z.array(z.string()).describe('List of user types'),
  must_have: z.array(z.string()).describe('Critical required features'),
  nice_to_have: z.array(z.string()).describe('Optional/desired features'),
  moq: z.string().optional().describe('Minimum order quantity if mentioned'),
  risk_assessment: z.string().optional().describe('Potential risks if mentioned'),
  competition: z.array(z.string()).optional().describe('Competitor names if mentioned'),
});

// AI Settings
temperature: 0.3  // Low temp for deterministic extraction
```

**Benefits:**
- Type-safe with Zod validation
- No JSON parsing errors
- Arrays handled correctly
- Optional fields clean

### Loading State

```
┌─────────────────────────────────────────────────────┐
│  Analyzing your product concept...                  │
│                                                     │
│  ✓ Product Description                             │
│  ✓ Target Industry                                 │
│  ✓ Where Used                                      │
│  ⏳ Who Uses It                                     │
│  ⏳ Must-Have Features                              │
│  ⏳ Nice-to-Have Features                           │
│  ⏳ MOQ                                             │
│  ⏳ Risk Assessment                                 │
│  ⏳ Competition                                     │
│                                                     │
│  This may take 10-15 seconds...                    │
└─────────────────────────────────────────────────────┘
```

---

## 5. Gap Detection

### Gap Detection Strategy

Gap detection runs **per-field** after batch extraction using:
1. **Basic validation** (length, item count)
2. **AI semantic checks** (uses LLM at temp 0.2)

### Gap Rules Configuration

```yaml
# config/product-brief-gaps.yaml

fields:
  product_description:
    min_length: 100
    checks:
      - category: "Product Identity"
        check: "mentions product name or model"
        priority: "medium"
        suggestion: "Add a specific product name or model number"
      - category: "Key Features"
        check: "describes at least 2 key features"
        priority: "high"
        suggestion: "Describe the main features that differentiate this product"

  target_industry:
    min_items: 1
    checks:
      - category: "Industry Specificity"
        check: "lists at least one specific industry"
        priority: "high"
        suggestion: "Add target industry (e.g., Hospitality, Healthcare, Retail)"

  # ... (rules for all 9 fields)
```

### Gap Display

```tsx
// Gap chip with "+" button
<div className={styles.gapChip}>
  <span className={styles.gapIcon}>💡</span>
  <span className={styles.gapText}>Add target industry</span>
  <button onClick={() => addGapToField(fieldId, gap.suggestion)}>+</button>
  <button onClick={() => dismissGap(fieldId, gap.id)}>×</button>
</div>
```

**When to Run:**
1. After batch extraction (all 9 fields in parallel)
2. After user edits (debounced 2 seconds)
3. Manual trigger ("Check Completeness" button)

---

## 6. State Management

### State Shape

```typescript
interface ProductBriefState {
  sessionId: string;
  createdAt: string;
  lastModified: string;

  fields: {
    product_description: FieldState;
    target_industry: FieldState;
    where_used: FieldState;
    who_uses: FieldState;
    must_have: FieldState;
    nice_to_have: FieldState;
    moq: FieldState;
    risk_assessment: FieldState;
    competition: CompetitionFieldState;
  };

  activeField: string | null;
  completionStatus: {
    required: number;  // 0-6
    optional: number;  // 0-3
  };
}

interface FieldState {
  content: string;
  isComplete: boolean;
  isCollapsed: boolean;
  gaps: Gap[];
  hiddenGaps: string[];
}
```

### Key Actions

```typescript
type Action =
  | { type: 'SET_FIELD_CONTENT'; payload: { fieldId: string; content: string } }
  | { type: 'MARK_COMPLETE'; payload: { fieldId: string } }
  | { type: 'COLLAPSE_FIELD'; payload: { fieldId: string } }
  | { type: 'ADD_GAP_TO_FIELD'; payload: { fieldId: string; gapText: string } }
  | { type: 'HIDE_GAP'; payload: { fieldId: string; gapId: string } }
  | { type: 'TRIGGER_AI_RESEARCH'; payload: { fieldId: 'competition' } }
  | { type: 'BATCH_EXTRACT'; payload: { productConcept: string } }
```

### Persistence

- **sessionStorage** for in-progress work
- Auto-save every 30 seconds
- Restore on page reload

---

## 7. Document Preview

### Split Screen Layout (Desktop)

```
┌─────────────────────────┬─────────────────────────┐
│  FIELDS (LEFT 50%)      │  PREVIEW (RIGHT 50%)    │
│  Scrollable             │  Scrollable             │
├─────────────────────────┼─────────────────────────┤
│ [Accordion of 9 fields] │ Product Brief           │
│                         │ Generated: Feb 17, 2026 │
│ Field 1 (expanded)      │                         │
│ Field 2 (collapsed)     │ ─────────────────────── │
│ Field 3 (expanded)      │                         │
│ ...                     │ ## Product Description  │
│                         │ [Live content]          │
│                         │                         │
│                         │ ## Target Industry      │
│                         │ • Hospitality          │
│                         │ • Healthcare            │
│                         │                         │
│                         │ [Export DOCX] button    │
└─────────────────────────┴─────────────────────────┘
```

### Preview Features

- **Real-time sync** - Updates as user types (debounced 300ms)
- **Markdown rendering** - ReactMarkdown with custom components
- **Section visibility** - Empty optional fields hidden
- **Export button** - Always visible at bottom

### Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (1200px+) | 50/50 split |
| Tablet (768px-1199px) | 60/40 split |
| Mobile (<768px) | Tab interface (Edit / Preview) |

---

## 8. DOCX Export

### Template Specifications

**Page Setup:**
- Size: US Letter (8.5" × 11")
- Margins: 1" all sides
- Font: Arial

**Typography:**
- Title: 20pt bold
- Section Headings: 16pt bold
- Body Text: 11pt normal
- Bullets: 11pt normal

**Spacing:**
- After title: 12pt
- After section heading: 6pt
- After paragraph: 6pt
- Between bullets: line breaks

### Export Validation

Before export:
- ✅ All 6 required fields have content
- ⭕ Optional fields (MOQ, Risk, Competition) can be empty
- ❌ Show error toast if validation fails

### DOCX Structure

```
Product Brief
Generated on [Date]
─────────────────

## Product Description
[Paragraph text]
─────────────────

## Target Industry
• Industry 1
• Industry 2
─────────────────

## Where Used
• Location 1
• Location 2
─────────────────

## Who Uses It
• User type 1
• User type 2
─────────────────

## Must-Have Features
• Feature 1
• Feature 2
─────────────────

## Nice-to-Have Features
• Feature 1
• Feature 2
─────────────────

[Optional sections only if content exists]

## Minimum Order Quantity
[Text]
─────────────────

## Risk Assessment
[Text]
─────────────────

## Competition
• AI-found competitor 1 - $299
• AI-found competitor 2 - $450
[Manual text entries]
─────────────────
```

### Export API

```typescript
// POST /api/product-brief/export
{
  fields: ProductBriefState['fields']
}

Response: DOCX file download
Filename: product-brief-YYYY-MM-DD.docx
```

---

## 9. Key Design Decisions

### 1. No AI Showoff
**Decision:** Don't separate "AI extracted" vs "user typed" content.
**Rationale:** Simpler UX, content is content regardless of source.

### 2. Single Text Field Per Section
**Decision:** One editable field, not multiple views of same data.
**Rationale:** Reduces cognitive load, clearer editing experience.

### 3. Gap Chips with "+" Quick-Add
**Decision:** Clicking "+" inserts gap suggestion directly into field.
**Rationale:** Fastest way to fill gaps, minimal friction.

### 4. Optional Competition Research
**Decision:** Competition field has AI research + link analysis + manual text.
**Rationale:** Flexibility for users who want research vs those who don't.

### 5. Simple Product Brief (Not Full MRD)
**Decision:** Export 9-section brief, not 12-section MRD.
**Rationale:** V2 scope is simplified capture. "Generate Full MRD" is future enhancement.

### 6. Structured Extraction with Zod
**Decision:** Use Zod schemas + AI structured output instead of raw JSON parsing.
**Rationale:** Type-safe, reliable, handles arrays cleanly.

### 7. Low Temperature (0.3) for Extraction
**Decision:** Use temp 0.3 for batch extraction, 0.2 for gap detection.
**Rationale:** This is data extraction, not creative writing. Consistency matters.

---

## 10. Future Enhancements (Not in V2)

### Phase 3: Full MRD Generation
- "Generate Full MRD" button after brief is complete
- Takes 9 brief fields → expands to 12 MRD sections
- Uses existing MRD template from `config/mrd-doc-params.yaml`

### Phase 4: Batch Operations
- Import multiple product concepts from CSV
- Generate briefs in bulk
- Export as ZIP of DOCX files

### Phase 5: Templates & Presets
- Industry-specific templates (Hospitality, Healthcare, etc.)
- Pre-filled field suggestions based on industry
- Custom gap rules per template

---

## 11. Success Criteria

### User Experience
- ✅ User can create complete brief in under 5 minutes
- ✅ Batch extraction populates meaningful content 80%+ of time
- ✅ Gap suggestions are actionable and relevant
- ✅ Export produces template-compliant DOCX

### Technical
- ✅ Batch extraction completes in under 15 seconds
- ✅ Gap detection runs without blocking UI
- ✅ State persists across page reloads
- ✅ Mobile-responsive (works on tablets)

### Quality
- ✅ All 6 required fields have validation
- ✅ Optional fields cleanly handle empty state
- ✅ Competition research finds 3-5 relevant competitors
- ✅ DOCX export matches template specifications exactly

---

## 12. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Should we show AI-extracted points separately? | ❌ No, single text field |
| How to handle competition field? | 3 sources: AI research, link analysis, manual |
| What output format? | Simple 9-section brief (Full MRD in future) |
| How to display gaps? | Chips with "+" button for quick-add |
| What temperature for extraction? | 0.3 (deterministic) |
| Use structured output? | ✅ Yes, Zod + AI structured output |

---

## 13. Next Steps

1. ✅ Design approved
2. ⏳ Write implementation plan (next step)
3. ⏳ Build Phase 1: State + Batch Extraction
4. ⏳ Build Phase 2: UI Components + Gap Detection
5. ⏳ Build Phase 3: Competition Research
6. ⏳ Build Phase 4: Export + Polish

---

**End of Design Document**
