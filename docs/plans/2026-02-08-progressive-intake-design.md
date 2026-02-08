# Progressive Intake Journey - Design Document

**Date:** February 8, 2026
**Status:** Approved for implementation
**Version:** 1.0

---

## What Are We Building?

Today, the MRD Producer has a single page with 3 text fields: product concept, target market, and additional details. The user fills them in, hits generate, and hopes for the best. This puts all the burden on the user to know what to include, and leaves massive room for error, misinformation, and missing context.

We're replacing this with a **guided intake journey** - an AI-driven interview that walks the user through structured questions, collects the right information topic by topic, and only generates the MRD when it has a solid research foundation.

Think of it as the difference between handing someone a blank form vs. sitting down with a product consultant who asks the right questions.

---

## Core Principles

1. **The AI drives the conversation** - It decides what to ask next based on what it already knows
2. **Structured inputs + freetext** - Every topic has solid choice options AND room for the user to explain in their own words
3. **Progressive disclosure** - Don't overwhelm. One topic at a time, with clear progress
4. **Transparency** - The user always sees what's been covered, what's missing, and what the impact is
5. **Respect the user's time** - Power users can dump everything upfront or skip ahead. The flow adapts.

---

## The User Journey

### Phase 0: Kickstart

Before any topic cards appear, the user chooses how to begin:

| Option | What It Does |
|--------|-------------|
| **Describe your product** | Large text area. User writes everything they know. AI parses it, pre-fills topic cards, and skips what's already covered. Can jump from 0% to 40-60% readiness instantly. |
| **Upload a document** | Upload a brief, spec, pitch deck (PDF, DOCX, TXT). **Dead for now** - UI exists, shows "Coming soon". |
| **Import from link** | Paste a Google Drive / Notion / URL. **Dead for now** - input field exists, shows "Coming soon". |
| **Start from scratch** | Skip kickstart entirely, go straight to the first topic card. |

If the user writes a description, the AI parses it in one call, maps content to topics, pre-fills structured fields where possible, and starts the user on whichever topic has the lowest completeness.

---

### Phase 1: Guided Topic Cards

The AI presents one topic at a time. There are **6 topics**, mapped to the 12 MRD sections:

#### Topic 1: Problem & Vision
> MRD Sections: 1. Purpose & Vision, 2. Problem Statement

What problem exists in the market? Why does it matter? What's the product vision?

- **Structured inputs:** Problem category chips (efficiency, cost, safety, experience, compliance), product type selector, industry vertical multi-select
- **Open questions:** "What problem are you trying to solve?" / "What's your vision for this product?"
- **Freetext:** "Anything else about the problem or vision?"

#### Topic 2: Market & Users
> MRD Sections: 3. Target Market & Use Cases, 4. Target Users

Who buys this? Who uses it? Where? What verticals?

- **Structured inputs:** Market segment chips (B2B, B2C, B2B2C), company size selector, geography multi-select, user role tags
- **Open questions:** "Describe your ideal customer" / "What are the main use cases?"
- **Freetext:** "Anything else about your market or users?"

#### Topic 3: Product Definition
> MRD Sections: 5. Product Description, 6. Key Requirements

What is the product? What does it do? Key specs and features?

- **Structured inputs:** Product category, form factor, key feature tags, platform/compatibility checkboxes
- **Open questions:** "Describe the product in your own words" / "What are the must-have features?"
- **Freetext:** "Any technical requirements or constraints?"

#### Topic 4: Design & Experience
> MRD Sections: 7. Design & Aesthetics

Look, feel, form factor, design references.

- **Structured inputs:** Design style chips (minimal, industrial, premium, rugged), material preferences, color scheme
- **Open questions:** "Any design references or inspirations?"
- **Freetext:** "Anything else about design?"

#### Topic 5: Business & Pricing
> MRD Sections: 8. Target Price, 9. Risks & Thoughts, 11. Additional Considerations

Price positioning, business model, risks, go-to-market concerns.

- **Structured inputs:** Price range selector, business model chips (one-time, subscription, freemium), margin expectations
- **Open questions:** "What are your biggest concerns or risks?" / "Any go-to-market considerations?"
- **Freetext:** "Anything else about the business side?"

#### Topic 6: Competitive Landscape
> MRD Sections: 10. Competition to Review, 12. Success Criteria

Known competitors, differentiation, success metrics.

- **Structured inputs:** Competitor name/URL inputs (add multiple), differentiation tags
- **Open questions:** "How will you measure success for this product?"
- **Freetext:** "Anything else about competition or success criteria?"

---

### How Topic Cards Work

**Each card contains:**
- 2-4 structured input fields (chips, dropdowns, multi-select)
- 1-2 open-ended text questions
- An "Anything else?" freetext area at the bottom
- A "Next" button to submit and move on

**Card states:**
- **Active** - Currently being filled. Only one at a time.
- **Completed** - Collapsed above the active card, showing a summary snippet. Click to expand and revise.
- **Upcoming** - Shown in the progress sidebar as greyed-out labels.

**AI behavior between cards:**
When the user clicks "Next", one AI call (~300-500 tokens) does three things:
1. Scores completeness for the submitted topic
2. Decides which topic to present next (usually sequential, but can skip or reorder based on what's already known)
3. Pre-populates smart defaults on the next card from context already provided

---

### Phase 2: Research Brief Review

When readiness is high enough (or the user clicks "Review"), the AI generates a structured summary of everything collected, organized by MRD section.

**The summary is NOT directly editable.** Instead, there's a text input below it where the user can request changes in natural language:
- "Change the target market to include healthcare"
- "Remove the subscription pricing model"
- "Add security compliance as a key requirement"

The AI processes the request and updates the summary. This keeps the interaction conversational and avoids building a complex editable form.

**Token cost:** ~1,500 input / ~1,000 output for initial summary. ~800 input / ~600 output per revision.

---

### Phase 2b: Gap Analysis

Before generation begins, the **agent system analyzes gaps:**

1. **Gap Analyzer Agent** examines collected inputs against all 12 MRD section requirements
2. **Specialist agents** are consulted for their domains:
   - Research Orchestrator: "Can I fill this gap with web research, or does only the user know this?"
   - Parser Agent: "Is the product description specific enough?"
   - Pricing Researcher: "Can I estimate pricing from competitors?"
3. **MRD Orchestrator** (top-level) aggregates feedback into a unified gap report

**The user sees a gap notification panel with severity levels:**

| Severity | Meaning | User Action |
|----------|---------|-------------|
| **Red** | Only the user can provide this. AI cannot reliably fill it. | Strong recommendation to go back and fill in. Link to specific topic card. |
| **Yellow** | AI can fill it with research, but confidence will be lower. | User chooses: "Fill this in" or "Let AI estimate". |
| **Green** | AI has high confidence it can research this. Not shown to user. | No action needed. |

Each gap includes a **plain-language explanation** of what happens to the MRD quality if it stays empty. No jargon.

**"Fill this in" takes the user directly to that topic card**, not back to the start. They fill the gap, return to the gap panel, and continue.

**Example gap panel:**

```
Research Brief: 62% Ready

3 gaps that may affect quality:

  [RED] Target Users - Not specified
  "Who exactly will use this? Without this, user personas
   will be AI-generated guesses."
  → [Fill this in]

  [YELLOW] Pricing - No target price
  "We can estimate from competitors, but your pricing
   strategy may differ."
  → [Fill this in]  [Let AI estimate]

  [YELLOW] Design - No design preferences
  "We'll use industry standard references.
   Results will be generic."
  → [Fill this in]  [OK, that's fine]

  [Go back and fill gaps]  [Generate anyway]
```

---

### Phase 3: Generation & Results

Once the user confirms, the existing MRD generation pipeline runs (multi-agent system with research, section generation, and quality review). Results are displayed with the existing download options (Word, PDF, HTML).

---

## Progress & Readiness UI

### Sidebar (Desktop)

A persistent left sidebar shows:
- **Topic list** with completion indicators (empty circle / half-filled / full circle)
- **Overall readiness bar** with percentage
- **"Generate" button** appears when readiness exceeds 50%

### Mobile

Sidebar collapses into a **horizontal progress bar** at the top with topic dots and the readiness percentage.

### Completeness Scoring

- Each topic has a **weight** reflecting its importance to MRD quality:
  - Problem & Vision: 20%
  - Market & Users: 20%
  - Product Definition: 20%
  - Design & Experience: 10%
  - Business & Pricing: 15%
  - Competitive Landscape: 15%
- Within each topic, structured input scores higher confidence than freetext-only
- **Minimum to generate:** 50%
- **Recommended:** 75%+

---

## Design System & Tokens

### Purpose

A design token system serves as the single source of truth for all visual decisions. Tokens are exportable for reuse in future projects.

### File Structure

```
styles/
  tokens/
    tokens.json       ← Canonical definitions (exportable, tool-agnostic)
    tokens.css         ← CSS custom properties
    typography.css     ← Font scales, weights, line heights
    components.css     ← Component-level tokens (card, button, input, chip, progress)
```

### Token Categories

| Category | Examples |
|----------|---------|
| **Color** | Primitives (slate-50 to slate-900, brand palette) + semantic aliases (--color-surface, --color-text-primary, --color-accent, --color-success, --color-warning) |
| **Typography** | Font families, size scale (xs through 2xl), weight, line-height, letter-spacing |
| **Spacing** | 4px base unit (--space-1 through --space-16) |
| **Radii** | sm, md, lg, full |
| **Shadows** | sm, md, lg for card elevation |
| **Transitions** | Duration and easing tokens |
| **Breakpoints** | sm, md, lg, xl |

Dark mode is handled via semantic tokens that swap under `[data-theme="dark"]`.

The JSON file follows the **Design Tokens Community Group** spec for compatibility with Figma, Style Dictionary, and other tools.

---

## Page & Route Structure

| Route | Purpose |
|-------|---------|
| `/` | Landing page - brief explanation + "Start new MRD" button |
| `/intake` | Full guided intake flow (all phases live here as state transitions) |
| `/intake/results` | MRD results + download UI |

The intake page is a **single page with internal state**, not separate routes per step. This avoids losing state on browser navigation.

---

## Token Cost Estimates

| AI Call | When | Input Tokens | Output Tokens |
|---------|------|-------------|---------------|
| Kickstart parsing | User submits product description | ~500-1,000 | ~500 |
| Topic evaluation | After each "Next" click (up to 6x) | ~200-400 | ~300 |
| Summary generation | User clicks "Review" | ~1,500 | ~1,000 |
| Summary revision | User requests changes (0-3x) | ~800 | ~600 |
| Gap analysis | Before generation | ~1,000 | ~500 |

**Estimated total for a full intake: 3,000-6,000 tokens** (~1-2 cents with Gemini Flash).

This is in addition to the MRD generation itself, which is the expensive part and remains unchanged.

---

## What's Out of Scope (For Now)

- **Document upload** - UI placeholder only, no backend processing
- **Link import** - UI placeholder only, no integration
- **Saving/resuming intake sessions** - No persistence between browser sessions
- **Multi-user collaboration** - Single user flow only
- **MRD versioning** - No diff/history between generations

---

## Implementation Notes

- The intake flow should work with the **existing multi-agent backend** - the output of the intake is a richer version of the same `{ productConcept, targetMarket, additionalDetails }` payload, with structured metadata attached
- The current `/api/generate` endpoint can be extended to accept the richer payload without breaking the legacy format
- The design token system should be built **first** so all new UI components use it from day one
- Existing `page.tsx` styling should be migrated to use tokens as part of this work
