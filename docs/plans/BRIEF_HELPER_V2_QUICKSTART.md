# Brief Helper V2 - Quick Start Guide

**Last Updated:** 2026-02-12
**Status:** Ready for Implementation
**Branch:** `feature/brief-helper`

---

## What's Ready

### ✅ Phase 1 Complete (Tasks 1-7)
- Text extraction agent (AI extracts bullets from free text)
- Gap detection agent (pattern-based gap identification)
- AI expansion agent (conversational refinement)
- SmartTextBox component with 2.5s pause detection
- GapSuggestion UI with dismiss/hide
- AIExpansionPanel chat interface
- **Fixed:** Gemini JSON parsing (markdown wrapper issue)

### 📋 V2 Ready to Implement
- **Start Page** - Character-graded description (50/100/150+ thresholds)
- **Batch Extraction** - Single AI call for all 6 fields
- **Split Screen** - Input (left) + Suggestions/Preview (right)
- **Collapsible Fields** - "Done" button → summary cards
- **Live Preview** - Formatted document toggle
- **Model Switch** - Gemini 2.5 Pro primary, GPT-4o-mini fallback

---

## Key Documents

**Read First:**
1. `2026-02-12-brief-helper-v2-design.md` - Complete design spec (450 lines)
2. `2026-02-12-brief-helper-v2-execution.md` - Bite-sized tasks (62 tasks)

**Reference:**
- `2026-02-12-brief-helper-v2-implementation-plan.md` - Phase overview
- `2026-02-11-simplified-brief-helper-PRD.md` - Original PRD
- `2026-02-11-simplified-brief-helper-design-system.md` - Design tokens

---

## Implementation Plan Overview

**62 Tasks, 17 Hours Estimated**

### Phase 1: Model Updates (30 min)
- Switch Gemini to 2.5 Pro
- Update config (Gemini → OpenAI fallback)
- Remove Anthropic/Claude provider
- Test fallback chain

### Phase 2: State Management (1 hour)
- Add V2 state fields (initialDescription, activeFieldId, previewMode, etc.)
- Add V2 action types (8 new actions)
- Implement reducer cases
- Write unit tests

### Phase 3: Start Page (2 hours)
- Create `/brief-helper/start` route
- DescriptionInput component (auto-expanding textarea)
- ProgressGrading component (color-coded bar)
- FutureOptions placeholder (upload/link - disabled)

### Phase 4: Batch Extraction Agent (2 hours)
- BatchExtractionAgent (extracts all 6 fields)
- `/api/brief/batch-extract` endpoint
- JSON cleaning logic (reuse from text-extraction)
- Unit + integration tests

### Phase 5: Split Layout (2 hours)
- SplitLayout component (50/50 grid)
- LoadingOverlay with progress checklist
- Update main page to use split layout
- Progressive field population

### Phase 6: Left Panel (3 hours)
- LeftPanel container
- ProgressIndicator ("3 of 6 complete")
- CollapsedField component (summary cards)
- Update BriefField for collapse logic
- Update GapSuggestion with "Hide" button

### Phase 7: Right Panel (3 hours)
- RightPanel container
- RightPanelToggle (segmented control)
- SuggestionsView (active field + summary)
- DocumentPreview (formatted output)
- Field sync logic

### Phase 8: Integration (2 hours)
- Connect all components
- Error boundaries
- Polish animations
- Accessibility audit
- Mobile responsive test

### Phase 9: Testing & Docs (2 hours)
- Component unit tests
- Integration tests
- Completion document
- Update CLAUDE.md
- Run full test suite

---

## Quick Test Flow

**After Implementation:**

1. Navigate to `http://localhost:3000/brief-helper/start`
2. Type 150+ char description
3. Verify character grading (colors change at thresholds)
4. Click "Continue"
5. Verify loading overlay with progress
6. Verify all 6 fields populate with bullets
7. Verify gaps appear (amber panels)
8. Mark field "Done" → verify collapse
9. Toggle to "Document Preview" → verify formatted output
10. Click "← Edit Description" → verify returns to start

---

## Execution Options

### Option 1: Subagent-Driven (Recommended) ⚡
- Work in current session
- Fresh subagent per task
- Code review between tasks
- Fast iteration
- **Use:** `superpowers:subagent-driven-development`

### Option 2: Parallel Session 📝
- Open new Claude Code session
- Load execution plan
- Batch execute with checkpoints
- **Use:** `superpowers:executing-plans`

---

## File Structure (V2 Additions)

```
app/brief-helper/
├── start/                          # NEW - Start page
│   ├── page.tsx
│   ├── components/
│   │   ├── DescriptionInput.tsx
│   │   ├── ProgressGrading.tsx
│   │   └── FutureOptions.tsx
│   └── start.module.css
├── components/
│   ├── SplitLayout.tsx             # NEW
│   ├── LeftPanel.tsx               # NEW
│   ├── RightPanel.tsx              # NEW
│   ├── ProgressIndicator.tsx       # NEW
│   ├── CollapsedField.tsx          # NEW
│   ├── RightPanelToggle.tsx        # NEW
│   ├── SuggestionsView.tsx         # NEW
│   ├── DocumentPreview.tsx         # NEW
│   ├── LoadingOverlay.tsx          # NEW
│   ├── BriefField.tsx              # UPDATED
│   └── GapSuggestion.tsx           # UPDATED
└── lib/
    └── brief-state.ts              # UPDATED (new fields/actions)

agent/agents/brief/
└── batch-extraction-agent.ts       # NEW

app/api/brief/
└── batch-extract/
    └── route.ts                    # NEW

styles/tokens/
└── brief-helper.css                # UPDATED (new tokens)

lib/providers/
├── gemini-provider.ts              # UPDATED (model change)
└── anthropic-provider.ts           # DELETED

config/agents/
└── default.yaml                    # UPDATED (remove Claude)
```

---

## Known Issues

### Fixed:
- ✅ Gemini JSON parsing (markdown wrapper) - Fixed in text-extraction-agent.ts

### To Watch:
- Provider quota limits (Gemini 2.5 Pro has high free tier)
- sessionStorage 5MB limit (shouldn't hit with brief data)
- Mobile layout shift on orientation change (test after Phase 5)

---

## Success Criteria

- [ ] All tests passing
- [ ] Build succeeds
- [ ] Start page character grading works (4 thresholds)
- [ ] Batch extraction populates all 6 fields in < 10 sec
- [ ] Split layout responsive (desktop 50/50, mobile single column)
- [ ] Fields collapse/expand smoothly
- [ ] Toggle switches between suggestions/preview
- [ ] Document preview shows only completed fields
- [ ] No TypeScript errors
- [ ] No console errors

---

## Next Steps

1. **Choose execution approach** (subagent-driven or parallel)
2. **Start with Phase 1** (model updates - 5 tasks, 30 min)
3. **Commit frequently** (after each task or small group)
4. **Test incrementally** (validate each phase before next)
5. **Review at milestones** (after Phases 3, 5, 7)

---

**Questions?** Check design doc for detailed specifications.
**Issues?** Refer to execution plan for step-by-step instructions.
**Ready?** Start with Task 1: Update Gemini Provider Model.
