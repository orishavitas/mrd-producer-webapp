# Brief Helper V2 - Manual Testing Report

**Date:** February 15, 2026
**Tester:** [Your Name]
**Environment:** Development (localhost:3005)
**Branch:** feature/brief-helper
**Version:** V2 (Phases 1-14 Complete)

---

## Test Environment Setup

- [ ] Dev server running: http://localhost:3005
- [ ] Browser: _________________ (Chrome/Firefox/Safari/Edge)
- [ ] Screen size: _________________ (Desktop/Tablet/Mobile)
- [ ] API Key configured: [ ] Yes [ ] No

---

## Phase 1: Start Page (`/brief-helper/start`)

**URL:** http://localhost:3005/brief-helper/start

### Test 1.1: Page Loads
- [ ] Page loads without errors
- [ ] Title visible: "Brief Helper - Get Started"
- [ ] Large textarea visible
- [ ] Character counter shows "0 characters"
- [ ] Continue button visible (disabled)
- [ ] Future options visible (3 disabled buttons)

### Test 1.2: Character Grading (0-49 chars)
**Action:** Type 30 characters of text

- [ ] Character counter updates to "30 characters"
- [ ] Progress bar shows amber/warning color
- [ ] Message: "Too short - Add more details for better results"
- [ ] Continue button still disabled (< 20 chars minimum)

**Notes:**
```
[Write any observations here]
```

### Test 1.3: Character Grading (50-99 chars)
**Action:** Type to reach 70 characters total

- [ ] Character counter updates to "70 characters"
- [ ] Progress bar shows blue/info color
- [ ] Message: "Good start ✓ - A bit more detail would help"
- [ ] Continue button enabled (≥ 20 chars)

**Notes:**
```
[Write any observations here]
```

### Test 1.4: Character Grading (100-149 chars)
**Action:** Type to reach 120 characters total

- [ ] Character counter updates to "120 characters"
- [ ] Progress bar shows green/success color
- [ ] Message: "Great! ✓✓ - This should give us good insights"
- [ ] Continue button enabled

**Notes:**
```
[Write any observations here]
```

### Test 1.5: Character Grading (150+ chars)
**Action:** Type to reach 180 characters total

- [ ] Character counter updates to "180 characters"
- [ ] Progress bar shows bright green/excellent color
- [ ] Message: "Excellent! ✓✓✓ - Comprehensive description"
- [ ] Continue button enabled

**Notes:**
```
[Write any observations here]
```

### Test 1.6: Continue Button
**Action:** Click "Continue" button

- [ ] Button responds to click
- [ ] Navigation to `/brief-helper` occurs
- [ ] Description persists via sessionStorage

**Action:** Test Ctrl+Enter keyboard shortcut

- [ ] Ctrl+Enter also triggers navigation
- [ ] Works from any cursor position in textarea

**Notes:**
```
[Write any observations here]
```

### Test 1.7: Future Options
- [ ] "Upload PDF" button visible but disabled
- [ ] "Paste Link" button visible but disabled
- [ ] "Import from..." button visible but disabled
- [ ] Disabled cursor shown on hover
- [ ] Gray styling applied

**Notes:**
```
[Write any observations here]
```

---

## Phase 2: Batch Extraction (`/brief-helper`)

**URL:** http://localhost:3005/brief-helper (navigated from start page)

### Test 2.1: Loading Overlay Appears
**Condition:** Description exists from start page

- [ ] Overlay appears immediately on page load
- [ ] Backdrop blur visible
- [ ] Center modal visible
- [ ] Title: "Analyzing your description..."
- [ ] Progress checklist shows 6 fields
- [ ] Overlay prevents clicking through to background

**Notes:**
```
[Write any observations here]
```

### Test 2.2: Progress Checklist
**Observe the 6 fields:**

- [ ] Field 1 (What): ⌛ Pending → ⏳ Processing → ✓ Done
- [ ] Field 2 (Who): ⌛ Pending → ⏳ Processing → ✓ Done
- [ ] Field 3 (Where): ⌛ Pending → ⏳ Processing → ✓ Done
- [ ] Field 4 (MOQ): ⌛ Pending → ⏳ Processing → ✓ Done
- [ ] Field 5 (Must-Haves): ⌛ Pending → ⏳ Processing → ✓ Done
- [ ] Field 6 (Nice-to-Haves): ⌛ Pending → ⏳ Processing → ✓ Done

**Timing:**
- Extraction start time: __________
- Extraction end time: __________
- Total duration: __________ seconds

**Notes:**
```
[Write any observations here]
```

### Test 2.3: Overlay Fade Out
- [ ] Overlay fades out smoothly (300ms)
- [ ] Main page content becomes visible
- [ ] No visual glitches during transition

**Notes:**
```
[Write any observations here]
```

### Test 2.4: Fields Populated
**Check all 6 fields for content:**

- [ ] "What" field has bullet points: ____ bullets
- [ ] "Who" field has bullet points: ____ bullets
- [ ] "Where" field has bullet points: ____ bullets
- [ ] "MOQ" field has bullet points: ____ bullets
- [ ] "Must-Have Features" field has bullet points: ____ bullets
- [ ] "Nice-to-Have Features" field has bullet points: ____ bullets

**Quality Check:**
- [ ] Bullets are relevant to description
- [ ] Bullets are properly formatted
- [ ] No duplicate bullets
- [ ] Field-specific extraction (right content in right field)

**Notes:**
```
[Write any observations here]
```

### Test 2.5: Gap Detection
- [ ] Amber warning panels visible on fields with gaps
- [ ] Gap messages describe missing information
- [ ] Gap count badges visible
- [ ] Gaps are contextually relevant

**Fields with gaps detected:** _________________

**Notes:**
```
[Write any observations here]
```

---

## Phase 3: Split-Screen Layout

### Test 3.1: Desktop Layout (≥1024px)
**Action:** Ensure browser width ≥ 1024px

- [ ] 50/50 split visible (left panel + right panel)
- [ ] Gap between panels: ~32px
- [ ] Left panel: Shows all 6 BriefField components
- [ ] Right panel: Shows toggle + content
- [ ] Independent scroll areas
- [ ] No horizontal overflow

**Notes:**
```
[Write any observations here]
```

### Test 3.2: Tablet Layout (768-1023px)
**Action:** Resize browser to 900px width

- [ ] Layout remains functional
- [ ] Panels adjust appropriately
- [ ] Content readable
- [ ] No broken layouts

**Notes:**
```
[Write any observations here]
```

### Test 3.3: Mobile Layout (<768px)
**Action:** Resize browser to 375px width

- [ ] Single column stack layout
- [ ] Left panel content first
- [ ] Right panel content below
- [ ] No horizontal scroll
- [ ] Touch targets large enough (≥44px)
- [ ] Font sizes readable

**Notes:**
```
[Write any observations here]
```

### Test 3.4: Progress Indicator
- [ ] "X of 6 complete" visible at top of left panel
- [ ] Count accurate (0 complete initially)
- [ ] Updates when fields marked done

**Notes:**
```
[Write any observations here]
```

### Test 3.5: Back Button
- [ ] "← Back to Start" button visible
- [ ] Click navigates to `/brief-helper/start`
- [ ] Description persists in textarea
- [ ] Can navigate back to `/brief-helper`

**Notes:**
```
[Write any observations here]
```

---

## Phase 4: Right Panel Toggle

### Test 4.1: Toggle Control
- [ ] Two buttons visible: "AI Suggestions" | "Document Preview"
- [ ] Icons visible: 💡 (suggestions) | 📄 (preview)
- [ ] "AI Suggestions" active by default (blue background)
- [ ] "Document Preview" inactive (gray background)
- [ ] Clear visual distinction between active/inactive

**Notes:**
```
[Write any observations here]
```

### Test 4.2: Switch to Document Preview
**Action:** Click "Document Preview" button

- [ ] Button becomes active (blue background)
- [ ] "AI Suggestions" becomes inactive (gray)
- [ ] Content fades out (300ms)
- [ ] Document preview fades in (300ms)
- [ ] Smooth transition, no flash

**Notes:**
```
[Write any observations here]
```

### Test 4.3: Switch Back to Suggestions
**Action:** Click "AI Suggestions" button

- [ ] Button becomes active (blue background)
- [ ] "Document Preview" becomes inactive (gray)
- [ ] Content transitions smoothly
- [ ] Suggestions view visible

**Notes:**
```
[Write any observations here]
```

### Test 4.4: Keyboard Navigation
**Action:** Focus toggle with Tab, use arrow keys

- [ ] Tab focuses toggle
- [ ] Right arrow switches to next button
- [ ] Left arrow switches to previous button
- [ ] Enter/Space activates button
- [ ] Focus indicator visible

**Notes:**
```
[Write any observations here]
```

---

## Phase 5: AI Suggestions View

### Test 5.1: Active Field Suggestions
**Action:** Click into "What" field in left panel

- [ ] Right panel updates to show "What" suggestions
- [ ] Top section (60%) shows contextual tips
- [ ] Examples visible for product description
- [ ] Best practices listed
- [ ] Content relevant to field type

**Notes:**
```
[Write any observations here]
```

### Test 5.2: Other Fields Needing Attention
- [ ] Bottom section (40%) shows field list
- [ ] Fields with gaps shown first
- [ ] Gap count badges visible
- [ ] Clickable field items

**Action:** Click a field in the list

- [ ] Left panel scrolls to that field
- [ ] Field becomes active/focused
- [ ] Top section updates with new suggestions

**Notes:**
```
[Write any observations here]
```

### Test 5.3: Empty State
**Condition:** No active field, no gaps

- [ ] Message: "Looking good! ✓"
- [ ] Encouraging message visible
- [ ] No error state shown

**Notes:**
```
[Write any observations here]
```

---

## Phase 6: Document Preview

**Action:** Switch to "Document Preview" mode

### Test 6.1: Completed Fields
- [ ] Section headers visible for all 6 fields
- [ ] "What" section shows bullets (if populated)
- [ ] "Who" section shows bullets (if populated)
- [ ] "Where" section shows bullets (if populated)
- [ ] "MOQ" section shows bullets (if populated)
- [ ] "Must-Have Features" section shows bullets (if populated)
- [ ] "Nice-to-Have Features" section shows bullets (if populated)

**Notes:**
```
[Write any observations here]
```

### Test 6.2: Incomplete Fields
**Condition:** Some fields not yet completed

- [ ] Incomplete field sections show "—" (em dash)
- [ ] Placeholder styled appropriately (gray, italic)
- [ ] Section structure maintained

**Notes:**
```
[Write any observations here]
```

### Test 6.3: Professional Formatting
- [ ] Max-width: 800px (centered)
- [ ] Section headers larger/bold
- [ ] Bullets properly formatted as lists
- [ ] Appropriate spacing between sections
- [ ] Professional typography
- [ ] Print-ready appearance

**Notes:**
```
[Write any observations here]
```

### Test 6.4: Auto-Scroll
**Action:** Focus different field in left panel

- [ ] Preview scrolls to corresponding section
- [ ] Active section highlighted or indicated
- [ ] Smooth scroll behavior

**Notes:**
```
[Write any observations here]
```

---

## Phase 7: Collapsible Fields

### Test 7.1: Mark as Done Button
**Action:** Find "Mark as Done" button below a field

- [ ] Button visible below textarea
- [ ] Green styling
- [ ] Hover effect works
- [ ] Click triggers collapse

**Notes:**
```
[Write any observations here]
```

### Test 7.2: Field Collapse
**Action:** Click "Mark as Done" on "What" field

- [ ] Field collapses to 80px height (desktop)
- [ ] Smooth animation (300ms)
- [ ] Collapsed card shows:
  - [ ] Green checkmark icon
  - [ ] Field name ("What")
  - [ ] First 2-3 bullets (truncated)
  - [ ] "..." if more bullets exist
  - [ ] Gap badge (if gaps exist)
  - [ ] "Edit" button

**Notes:**
```
[Write any observations here]
```

### Test 7.3: Progress Update
- [ ] Progress indicator updates: "1 of 6 complete"
- [ ] Count increments correctly
- [ ] Percentage accurate

**Notes:**
```
[Write any observations here]
```

### Test 7.4: Auto-Focus Next Field
**Action:** After marking "What" as done

- [ ] Next incomplete field auto-focuses
- [ ] Cursor in textarea of next field
- [ ] Smooth scroll to next field
- [ ] Right panel updates to next field suggestions

**Notes:**
```
[Write any observations here]
```

### Test 7.5: Expand Collapsed Field
**Action:** Click on collapsed "What" card

- [ ] Field expands to full height
- [ ] Smooth animation (300ms)
- [ ] All bullets visible
- [ ] Textarea becomes editable
- [ ] "Mark as Done" button visible again

**Action:** Click "Edit" button on collapsed card

- [ ] Same expansion behavior
- [ ] Field becomes active/focused

**Notes:**
```
[Write any observations here]
```

### Test 7.6: Mobile Collapsed Height
**Action:** Resize to mobile (<768px), collapse a field

- [ ] Collapsed height: 60px (not 80px)
- [ ] Content fits properly
- [ ] Readable on mobile

**Notes:**
```
[Write any observations here]
```

---

## Phase 8: Gap Detection & Hiding

### Test 8.1: Gap Panel Visible
**Condition:** Field has detected gaps

- [ ] Amber warning panel visible
- [ ] Gap icon/indicator present
- [ ] Gap message describes missing info
- [ ] Two buttons: "Hide" and "Dismiss"
- [ ] Priority badge (if applicable)

**Notes:**
```
[Write any observations here]
```

### Test 8.2: Hide Gap
**Action:** Click "Hide" button on a gap

- [ ] Gap opacity reduces to 50%
- [ ] "Hidden" badge appears
- [ ] Gap still counted in total
- [ ] "Hide" button changes to "Show" (or disabled)
- [ ] Gap still visible but faded

**Notes:**
```
[Write any observations here]
```

### Test 8.3: Dismiss Gap
**Action:** Click "Dismiss" button on a different gap

- [ ] Gap removed completely
- [ ] Gap count decreases
- [ ] Smooth removal animation
- [ ] No layout shift

**Notes:**
```
[Write any observations here]
```

### Test 8.4: Hidden Gap Count
- [ ] Gap count includes hidden gaps
- [ ] Visible distinction between hidden and active gaps
- [ ] Re-expanding field shows hidden gaps

**Notes:**
```
[Write any observations here]
```

---

## Phase 9: AI Expansion (Phase 1 Feature)

### Test 9.1: AI Expand Button
**Action:** Find "AI Expand" button on a field

- [ ] Button visible
- [ ] Icon present (optional)
- [ ] Click opens chat panel
- [ ] Panel overlays right side

**Notes:**
```
[Write any observations here]
```

### Test 9.2: Chat Interface
- [ ] Chat panel visible
- [ ] Input field at bottom
- [ ] "Close" button visible
- [ ] Initial AI greeting (optional)
- [ ] Clean chat UI

**Notes:**
```
[Write any observations here]
```

### Test 9.3: Conversational Refinement
**Action:** Type "What else should I include?"

- [ ] Message sends on Enter
- [ ] User message shows in chat
- [ ] AI response appears (may take 3-5 seconds)
- [ ] Response relevant to field
- [ ] Suggestions formatted clearly

**Notes:**
```
[Write any observations here]
```

### Test 9.4: Accept Changes
**Action:** Click "Accept Changes" button

- [ ] Suggestions merge into field bullets
- [ ] No duplicate bullets
- [ ] Bullets append to existing
- [ ] Chat panel closes (or stays open)
- [ ] Field updates visible

**Notes:**
```
[Write any observations here]
```

### Test 9.5: Context Awareness (V2)
**Condition:** initialDescription passed from start page

- [ ] AI responses reference original description
- [ ] Suggestions contextually relevant
- [ ] AI understands product concept

**Notes:**
```
[Write any observations here]
```

---

## Phase 10: Accessibility Testing

### Test 10.1: Keyboard Navigation
**Action:** Use only keyboard (Tab, Enter, Space, Escape, Arrows)

- [ ] Tab through all fields in order
- [ ] Tab through toggle buttons
- [ ] Tab through action buttons
- [ ] Enter/Space activates buttons
- [ ] Escape closes panels
- [ ] Arrow keys work in toggle
- [ ] No keyboard traps
- [ ] Focus indicators always visible

**Notes:**
```
[Write any observations here]
```

### Test 10.2: ARIA Labels
**Action:** Inspect elements (F12) or use screen reader

- [ ] All buttons have ARIA labels
- [ ] Form fields have proper labels
- [ ] Progress bars have ARIA attributes
- [ ] Live regions for dynamic content
- [ ] Accessible names on interactive elements

**Notes:**
```
[Write any observations here]
```

### Test 10.3: Screen Reader (if available)
**Tool:** NVDA, JAWS, VoiceOver, or Narrator

- [ ] Start page announced correctly
- [ ] Field labels announced
- [ ] Button purposes clear
- [ ] Progress announcements during loading
- [ ] Live region updates announced
- [ ] Navigation logical

**Notes:**
```
[Write any observations here]
```

### Test 10.4: Reduced Motion
**Action:** Enable "Reduce motion" in OS settings

**Windows:** Settings → Accessibility → Visual effects → Animation effects: Off
**Mac:** System Preferences → Accessibility → Display → Reduce motion

- [ ] Animations disabled
- [ ] Instant transitions instead of fades
- [ ] No jarring movements
- [ ] Functionality preserved
- [ ] Overlay appears/disappears instantly

**Notes:**
```
[Write any observations here]
```

### Test 10.5: Touch Targets
**Action:** Test on touch device or simulate with dev tools

- [ ] All buttons ≥44px x 44px
- [ ] Toggle buttons touchable
- [ ] Collapsed cards clickable
- [ ] Gap buttons easy to tap
- [ ] No accidental adjacent taps

**Notes:**
```
[Write any observations here]
```

---

## Phase 11: Error Handling & Edge Cases

### Test 11.1: No API Key
**Condition:** Remove GOOGLE_API_KEY from .env.local

- [ ] Error message shown
- [ ] User-friendly error text
- [ ] No console errors exposed to user
- [ ] Fallback provider attempted (OpenAI)

**Notes:**
```
[Write any observations here]
```

### Test 11.2: Network Error
**Action:** Simulate offline mode (browser dev tools)

- [ ] Loading overlay handles timeout
- [ ] Error message shown
- [ ] Retry option available
- [ ] No infinite loading

**Notes:**
```
[Write any observations here]
```

### Test 11.3: Empty Extraction Result
**Condition:** AI returns empty fields

- [ ] Fields show as incomplete
- [ ] No crash or error
- [ ] User can manually add content
- [ ] Gaps detected appropriately

**Notes:**
```
[Write any observations here]
```

### Test 11.4: sessionStorage Disabled
**Action:** Disable cookies/storage in browser

- [ ] Graceful degradation
- [ ] Warning message (optional)
- [ ] Features still work (no persistence)

**Notes:**
```
[Write any observations here]
```

### Test 11.5: Direct URL Access
**Action:** Navigate directly to `/brief-helper` (skip start page)

- [ ] Page loads without error
- [ ] No batch extraction triggered (no description)
- [ ] Fields shown as empty
- [ ] User can manually fill fields
- [ ] Link back to start page available

**Notes:**
```
[Write any observations here]
```

---

## Phase 12: Performance Testing

### Test 12.1: Page Load Times
**Measure with browser dev tools (Network tab)**

- Start page load time: __________ ms
- Main page load time: __________ ms
- Batch extraction time: __________ seconds
- Toggle switch latency: __________ ms
- Field collapse animation: __________ ms

**Notes:**
```
[Write any observations here]
```

### Test 12.2: Large Descriptions
**Action:** Enter 2000 character description

- [ ] Character counter updates correctly
- [ ] Extraction handles large input
- [ ] No performance degradation
- [ ] All fields populate
- [ ] UI remains responsive

**Notes:**
```
[Write any observations here]
```

### Test 12.3: Memory Leaks
**Action:** Use Chrome DevTools Memory profiler

- [ ] Open/close AI chat multiple times
- [ ] Toggle preview multiple times
- [ ] Collapse/expand fields multiple times
- [ ] Check for memory growth
- [ ] No detached DOM nodes

**Notes:**
```
[Write any observations here]
```

---

## Phase 13: Cross-Browser Testing

### Test 13.1: Chrome
**Version:** __________

- [ ] All features work
- [ ] Layouts correct
- [ ] Animations smooth
- [ ] No console errors

**Notes:**
```
[Write any observations here]
```

### Test 13.2: Firefox
**Version:** __________

- [ ] All features work
- [ ] Layouts correct
- [ ] Animations smooth
- [ ] No console errors

**Notes:**
```
[Write any observations here]
```

### Test 13.3: Safari (Mac)
**Version:** __________

- [ ] All features work
- [ ] Layouts correct
- [ ] Animations smooth
- [ ] No console errors

**Notes:**
```
[Write any observations here]
```

### Test 13.4: Edge
**Version:** __________

- [ ] All features work
- [ ] Layouts correct
- [ ] Animations smooth
- [ ] No console errors

**Notes:**
```
[Write any observations here]
```

---

## Console Errors & Warnings

**Record all console errors/warnings seen during testing:**

```
[Paste console output here]
```

---

## Issues Found

| # | Severity | Description | Steps to Reproduce | Expected | Actual |
|---|----------|-------------|-------------------|----------|--------|
| 1 | [ ] Critical [ ] High [ ] Medium [ ] Low | | | | |
| 2 | [ ] Critical [ ] High [ ] Medium [ ] Low | | | | |
| 3 | [ ] Critical [ ] High [ ] Medium [ ] Low | | | | |

---

## Overall Assessment

### Functionality Score: ___/10
**Comments:**
```
[Overall functionality assessment]
```

### User Experience Score: ___/10
**Comments:**
```
[Overall UX assessment]
```

### Performance Score: ___/10
**Comments:**
```
[Overall performance assessment]
```

### Accessibility Score: ___/10
**Comments:**
```
[Overall accessibility assessment]
```

---

## Recommendations

**High Priority:**
1.
2.
3.

**Medium Priority:**
1.
2.
3.

**Low Priority / Nice-to-Have:**
1.
2.
3.

---

## Sign-off

- [ ] All critical features working
- [ ] No blocking issues
- [ ] Ready for user testing
- [ ] Ready for deployment
- [ ] Needs more work

**Tester Signature:** ____________________
**Date:** ____________________

---

## Appendix: Test Data Used

**Description used for testing:**
```
[Paste the product description you used on the start page]
```

**Expected extraction results:**
- What: [Expected bullets]
- Who: [Expected bullets]
- Where: [Expected bullets]
- MOQ: [Expected bullets]
- Must-Haves: [Expected bullets]
- Nice-to-Haves: [Expected bullets]
