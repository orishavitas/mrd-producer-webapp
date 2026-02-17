# Product Brief Helper V2 - Phases 7-10 Implementation Plan

**Date:** 2026-02-17
**Status:** Ready for Implementation
**Previous Work:** Tasks 1-10 Complete (Foundation, Agents, APIs, Basic UI)

---

## Overview

This plan covers the remaining implementation phases for Product Brief Helper V2:
- **Phase 7:** Editor Components - Section Fields & Collapsible Cards
- **Phase 8:** Document Preview with Markdown
- **Phase 9:** Main Page Integration & Orchestration
- **Phase 10:** DOCX Export

**Total Tasks:** 8 (Tasks 11-18)
**Estimated Time:** 3-4 hours
**Lines of Code:** ~2,000 production code

---

## Phase 7: Editor Components - Section Fields

### Task 11: Create Field Editor Component

**Files:**
- Create: `app/product-brief/components/FieldEditor.tsx`
- Create: `app/product-brief/components/FieldEditor.module.css`

**Purpose:** Main editable field component with textarea, gap display, and Done button

**Step 1: Write FieldEditor component**

```typescript
// app/product-brief/components/FieldEditor.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './FieldEditor.module.css';
import { FieldId, Gap } from '../lib/brief-state';
import GapChip from './GapChip';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity (Optional)',
  risk_assessment: 'Risk Assessment (Optional)',
  competition: 'Competition (Optional)',
};

const FIELD_PLACEHOLDERS: Record<FieldId, string> = {
  product_description: 'Describe what the product is and what problem it solves...',
  target_industry: '• Hospitality\n• Healthcare\n• Retail',
  where_used: '• Countertops\n• Floor-mounted\n• Wall-mounted',
  who_uses: '• Installers\n• Technicians\n• End customers',
  must_have: '• Critical feature 1\n• Critical feature 2',
  nice_to_have: '• Optional feature 1\n• Optional feature 2',
  moq: '100 units per order',
  risk_assessment: 'Potential risks or concerns...',
  competition: '• Competitor 1\n• Competitor 2',
};

interface FieldEditorProps {
  fieldId: FieldId;
  content: string;
  gaps: Gap[];
  hiddenGaps: string[];
  isComplete: boolean;
  onContentChange: (content: string) => void;
  onAddGap: (gapText: string) => void;
  onDismissGap: (gapId: string) => void;
  onMarkComplete: (isComplete: boolean) => void;
}

export default function FieldEditor({
  fieldId,
  content,
  gaps,
  hiddenGaps,
  isComplete,
  onContentChange,
  onAddGap,
  onDismissGap,
  onMarkComplete,
}: FieldEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local content with props
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    // Debounce: Update parent after 500ms
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onContentChange(newContent);
    }, 500);
  };

  const visibleGaps = gaps.filter((g) => !hiddenGaps.includes(g.id));
  const isRequired = !['moq', 'risk_assessment', 'competition'].includes(fieldId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {FIELD_LABELS[fieldId]}
          {isRequired && <span className={styles.required}>*</span>}
        </h3>
        {isComplete && <span className={styles.completeBadge}>✓ Complete</span>}
      </div>

      <textarea
        className={styles.textarea}
        value={localContent}
        onChange={handleChange}
        placeholder={FIELD_PLACEHOLDERS[fieldId]}
        rows={8}
      />

      {visibleGaps.length > 0 && (
        <div className={styles.gapsSection}>
          <h4 className={styles.gapsTitle}>💡 Suggestions</h4>
          {visibleGaps.map((gap) => (
            <GapChip
              key={gap.id}
              gap={gap}
              onAdd={() => onAddGap(gap.suggestion)}
              onDismiss={() => onDismissGap(gap.id)}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <button
          className={styles.doneButton}
          onClick={() => onMarkComplete(!isComplete)}
        >
          {isComplete ? 'Edit' : 'Mark as Done'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Write CSS module**

```css
/* app/product-brief/components/FieldEditor.module.css */

.container {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s;
}

.container:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.required {
  color: #ef4444;
  margin-left: 0.25rem;
}

.completeBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #d1fae5;
  color: #065f46;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 12px;
}

.textarea {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  line-height: 1.6;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  min-height: 120px;
}

.textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.gapsSection {
  margin-top: 1rem;
  padding: 1rem;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 8px;
}

.gapsTitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.75rem 0;
}

.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.doneButton {
  padding: 0.5rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
  background: #10b981;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.doneButton:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
```

**Step 3: Commit**

```bash
git add app/product-brief/components/FieldEditor.tsx app/product-brief/components/FieldEditor.module.css
git commit -m "feat: add field editor component with gap display"
```

---

### Task 12: Create Collapsed Field Card Component

**Files:**
- Create: `app/product-brief/components/CollapsedFieldCard.tsx`
- Create: `app/product-brief/components/CollapsedFieldCard.module.css`

**Purpose:** Compact card showing completed field summary

**Step 1: Write CollapsedFieldCard component**

```typescript
// app/product-brief/components/CollapsedFieldCard.tsx

'use client';

import React from 'react';
import styles from './CollapsedFieldCard.module.css';
import { FieldId } from '../lib/brief-state';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'MOQ',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

interface CollapsedFieldCardProps {
  fieldId: FieldId;
  content: string;
  gapCount: number;
  onExpand: () => void;
}

export default function CollapsedFieldCard({
  fieldId,
  content,
  gapCount,
  onExpand,
}: CollapsedFieldCardProps) {
  // Extract first 2-3 bullets for preview
  const lines = content.split('\n').filter((line) => line.trim().startsWith('•'));
  const preview = lines.slice(0, 3).join('\n');

  return (
    <div className={styles.card} onClick={onExpand}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <span className={styles.checkmark}>✓</span>
          <h4 className={styles.title}>{FIELD_LABELS[fieldId]}</h4>
        </div>
        {gapCount > 0 && (
          <span className={styles.gapBadge}>
            ⚠️ {gapCount} gap{gapCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className={styles.preview}>{preview || content.substring(0, 100)}</div>

      <button className={styles.editButton} onClick={onExpand}>
        Edit
      </button>
    </div>
  );
}
```

**Step 2: Write CSS module**

```css
/* app/product-brief/components/CollapsedFieldCard.module.css */

.card {
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.card:hover {
  border-color: #4ade80;
  box-shadow: 0 4px 12px rgba(134, 239, 172, 0.3);
  transform: translateY(-2px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.titleSection {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkmark {
  font-size: 1.25rem;
  color: #16a34a;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: #166534;
  margin: 0;
}

.gapBadge {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-weight: 600;
}

.preview {
  font-size: 0.9rem;
  color: #166534;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  white-space: pre-line;
  opacity: 0.8;
}

.editButton {
  padding: 0.25rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #166534;
  background: white;
  border: 1px solid #86efac;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.editButton:hover {
  background: #dcfce7;
  border-color: #4ade80;
}
```

**Step 3: Commit**

```bash
git add app/product-brief/components/CollapsedFieldCard.tsx app/product-brief/components/CollapsedFieldCard.module.css
git commit -m "feat: add collapsed field card component"
```

---

## Phase 8: Document Preview

### Task 13: Create Document Preview Component

**Files:**
- Create: `app/product-brief/components/DocumentPreview.tsx`
- Create: `app/product-brief/components/DocumentPreview.module.css`

**Purpose:** Right-panel preview showing formatted document with markdown

**Step 1: Install react-markdown**

```bash
npm install react-markdown remark-gfm
```

**Step 2: Write DocumentPreview component**

```typescript
// app/product-brief/components/DocumentPreview.tsx

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './DocumentPreview.module.css';
import { ProductBriefState, FieldId } from '../lib/brief-state';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

interface DocumentPreviewProps {
  state: ProductBriefState;
}

export default function DocumentPreview({ state }: DocumentPreviewProps) {
  const generateMarkdown = (): string => {
    let md = '# Product Brief\n\n';
    md += `**Generated:** ${new Date(state.lastModified).toLocaleDateString()}\n\n`;
    md += '---\n\n';

    // Only include completed or non-empty fields
    const fieldsToShow: FieldId[] = [
      'product_description',
      'target_industry',
      'where_used',
      'who_uses',
      'must_have',
      'nice_to_have',
      'moq',
      'risk_assessment',
      'competition',
    ];

    for (const fieldId of fieldsToShow) {
      const field = state.fields[fieldId];
      if (!field.content.trim()) continue;

      md += `## ${FIELD_LABELS[fieldId]}\n\n`;
      md += `${field.content}\n\n`;
    }

    return md;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📄 Document Preview</h3>
        <span className={styles.status}>
          {state.completionStatus.required}/6 required complete
        </span>
      </div>

      <div className={styles.content}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {generateMarkdown()}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

**Step 3: Write CSS module**

```css
/* app/product-brief/components/DocumentPreview.module.css */

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 2px solid #e5e7eb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.status {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 600;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.content h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1rem 0;
  border-bottom: 3px solid #667eea;
  padding-bottom: 0.5rem;
}

.content h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #374151;
  margin: 2rem 0 0.75rem 0;
}

.content p {
  color: #4b5563;
  line-height: 1.7;
  margin: 0.5rem 0;
}

.content ul {
  list-style: none;
  padding-left: 0;
}

.content li {
  padding-left: 1.5rem;
  position: relative;
  color: #4b5563;
  line-height: 1.7;
  margin: 0.25rem 0;
}

.content li::before {
  content: '•';
  position: absolute;
  left: 0.5rem;
  color: #667eea;
  font-weight: bold;
}

.content hr {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1.5rem 0;
}
```

**Step 4: Commit**

```bash
git add app/product-brief/components/DocumentPreview.tsx app/product-brief/components/DocumentPreview.module.css package.json package-lock.json
git commit -m "feat: add document preview component with markdown rendering"
```

---

### Task 14: Create Suggestions Panel Component

**Files:**
- Create: `app/product-brief/components/SuggestionsPanel.tsx`
- Create: `app/product-brief/components/SuggestionsPanel.module.css`

**Purpose:** Right-panel view showing AI suggestions for active field

**Step 1: Write SuggestionsPanel component**

```typescript
// app/product-brief/components/SuggestionsPanel.tsx

'use client';

import React from 'react';
import styles from './SuggestionsPanel.module.css';
import { FieldId, Gap } from '../lib/brief-state';
import GapChip from './GapChip';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

interface SuggestionsPanelProps {
  activeFieldId: FieldId | null;
  gaps: Gap[];
  hiddenGaps: string[];
  onAddGap: (gapText: string) => void;
  onDismissGap: (gapId: string) => void;
}

export default function SuggestionsPanel({
  activeFieldId,
  gaps,
  hiddenGaps,
  onAddGap,
  onDismissGap,
}: SuggestionsPanelProps) {
  const visibleGaps = gaps.filter((g) => !hiddenGaps.includes(g.id));

  if (!activeFieldId) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💡</span>
          <p className={styles.emptyText}>Select a field to see AI suggestions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>💡 AI Suggestions</h3>
        <span className={styles.fieldName}>{FIELD_LABELS[activeFieldId]}</span>
      </div>

      <div className={styles.content}>
        {visibleGaps.length === 0 ? (
          <div className={styles.noGaps}>
            <span className={styles.checkmark}>✓</span>
            <p>No suggestions - field looks complete!</p>
          </div>
        ) : (
          <div className={styles.gapsList}>
            {visibleGaps.map((gap) => (
              <GapChip
                key={gap.id}
                gap={gap}
                onAdd={() => onAddGap(gap.suggestion)}
                onDismiss={() => onDismissGap(gap.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Write CSS module**

```css
/* app/product-brief/components/SuggestionsPanel.module.css */

.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 2px solid #e5e7eb;
}

.header {
  padding: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.fieldName {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.emptyIcon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.emptyText {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.noGaps {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.checkmark {
  font-size: 3rem;
  color: #10b981;
  margin-bottom: 1rem;
}

.noGaps p {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.gapsList {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

**Step 3: Commit**

```bash
git add app/product-brief/components/SuggestionsPanel.tsx app/product-brief/components/SuggestionsPanel.module.css
git commit -m "feat: add suggestions panel component for right sidebar"
```

---

## Phase 9: Main Page Integration

### Task 15: Create Main Product Brief Page

**Files:**
- Create: `app/product-brief/page.tsx`

**Purpose:** Main page orchestrating all components with split-screen layout

**Step 1: Write main page component**

```typescript
// app/product-brief/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BriefProvider, useBrief } from './lib/brief-context';
import { FieldId, FIELD_IDS } from './lib/brief-state';
import StartPage from './components/StartPage';
import LoadingOverlay from './components/LoadingOverlay';
import FieldEditor from './components/FieldEditor';
import CollapsedFieldCard from './components/CollapsedFieldCard';
import DocumentPreview from './components/DocumentPreview';
import SuggestionsPanel from './components/SuggestionsPanel';
import styles from './page.module.css';

function ProductBriefContent() {
  const { state, dispatch } = useBrief();
  const [view, setView] = useState<'start' | 'loading' | 'editor'>('start');
  const [rightPanel, setRightPanel] = useState<'suggestions' | 'preview'>('suggestions');

  const handleGenerate = async (concept: string) => {
    setView('loading');

    try {
      const response = await fetch('/api/product-brief/batch-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productConcept: concept }),
      });

      const data = await response.json();

      if (data.success) {
        dispatch({
          type: 'BATCH_EXTRACT',
          payload: { fields: data.fields },
        });

        // Trigger gap detection for all fields
        await detectGapsForAllFields(data.fields);

        setTimeout(() => {
          setView('editor');
        }, 1500);
      } else {
        alert('Failed to extract fields: ' + data.error);
        setView('start');
      }
    } catch (error) {
      console.error('Batch extract error:', error);
      alert('Failed to extract fields. Please try again.');
      setView('start');
    }
  };

  const detectGapsForAllFields = async (fields: any) => {
    for (const fieldId of FIELD_IDS) {
      const content = fields[fieldId];
      if (!content) continue;

      const fieldType = Array.isArray(content) ? 'list' : 'text';
      const fieldContent = Array.isArray(content)
        ? content.map((item) => `• ${item}`).join('\n')
        : content;

      try {
        const response = await fetch('/api/product-brief/detect-gaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldId,
            fieldContent,
            fieldType,
          }),
        });

        const data = await response.json();
        if (data.success) {
          dispatch({
            type: 'SET_GAPS',
            payload: { fieldId, gaps: data.gaps },
          });
        }
      } catch (error) {
        console.error(`Gap detection failed for ${fieldId}:`, error);
      }
    }
  };

  const handleFieldChange = (fieldId: FieldId, content: string) => {
    dispatch({
      type: 'SET_FIELD_CONTENT',
      payload: { fieldId, content },
    });
  };

  const handleAddGap = (fieldId: FieldId, gapText: string) => {
    dispatch({
      type: 'ADD_GAP_TO_FIELD',
      payload: { fieldId, gapText },
    });
  };

  const handleDismissGap = (fieldId: FieldId, gapId: string) => {
    dispatch({
      type: 'HIDE_GAP',
      payload: { fieldId, gapId },
    });
  };

  const handleMarkComplete = (fieldId: FieldId, isComplete: boolean) => {
    dispatch({
      type: 'MARK_COMPLETE',
      payload: { fieldId, isComplete },
    });

    if (isComplete) {
      dispatch({
        type: 'COLLAPSE_FIELD',
        payload: { fieldId },
      });
    }
  };

  const handleExpand = (fieldId: FieldId) => {
    dispatch({
      type: 'EXPAND_FIELD',
      payload: { fieldId },
    });
    dispatch({
      type: 'SET_ACTIVE_FIELD',
      payload: { fieldId },
    });
  };

  if (view === 'start') {
    return <StartPage onGenerate={handleGenerate} />;
  }

  if (view === 'loading') {
    return <LoadingOverlay />;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.leftPanel}>
        <div className={styles.toolbar}>
          <button
            className={styles.backButton}
            onClick={() => setView('start')}
          >
            ← Edit Description
          </button>
          <div className={styles.progress}>
            {state.completionStatus.required}/6 required complete
          </div>
        </div>

        <div className={styles.fieldsContainer}>
          {FIELD_IDS.map((fieldId) => {
            const field = state.fields[fieldId];
            if (field.isCollapsed) {
              return (
                <CollapsedFieldCard
                  key={fieldId}
                  fieldId={fieldId}
                  content={field.content}
                  gapCount={field.gaps.length - field.hiddenGaps.length}
                  onExpand={() => handleExpand(fieldId)}
                />
              );
            }

            return (
              <FieldEditor
                key={fieldId}
                fieldId={fieldId}
                content={field.content}
                gaps={field.gaps}
                hiddenGaps={field.hiddenGaps}
                isComplete={field.isComplete}
                onContentChange={(content) => handleFieldChange(fieldId, content)}
                onAddGap={(gapText) => handleAddGap(fieldId, gapText)}
                onDismissGap={(gapId) => handleDismissGap(fieldId, gapId)}
                onMarkComplete={(isComplete) => handleMarkComplete(fieldId, isComplete)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.panelToggle}>
          <button
            className={rightPanel === 'suggestions' ? styles.activeTab : styles.tab}
            onClick={() => setRightPanel('suggestions')}
          >
            AI Suggestions
          </button>
          <button
            className={rightPanel === 'preview' ? styles.activeTab : styles.tab}
            onClick={() => setRightPanel('preview')}
          >
            Document Preview
          </button>
        </div>

        {rightPanel === 'suggestions' ? (
          <SuggestionsPanel
            activeFieldId={state.activeField}
            gaps={state.activeField ? state.fields[state.activeField].gaps : []}
            hiddenGaps={state.activeField ? state.fields[state.activeField].hiddenGaps : []}
            onAddGap={(gapText) =>
              state.activeField && handleAddGap(state.activeField, gapText)
            }
            onDismissGap={(gapId) =>
              state.activeField && handleDismissGap(state.activeField, gapId)
            }
          />
        ) : (
          <DocumentPreview state={state} />
        )}
      </div>
    </div>
  );
}

export default function ProductBriefPage() {
  return (
    <BriefProvider>
      <ProductBriefContent />
    </BriefProvider>
  );
}
```

**Step 2: Write CSS module**

```css
/* app/product-brief/page.module.css */

.editorContainer {
  display: flex;
  height: 100vh;
  background: #f3f4f6;
}

.leftPanel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 2px solid #e5e7eb;
}

.backButton {
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #667eea;
  background: white;
  border: 2px solid #667eea;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.backButton:hover {
  background: #667eea;
  color: white;
}

.progress {
  font-size: 0.95rem;
  font-weight: 600;
  color: #6b7280;
}

.fieldsContainer {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.rightPanel {
  width: 45%;
  display: flex;
  flex-direction: column;
  background: white;
}

.panelToggle {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
}

.tab,
.activeTab {
  flex: 1;
  padding: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.activeTab {
  background: white;
  color: #667eea;
  border-bottom: 3px solid #667eea;
}

.tab:hover {
  background: #f3f4f6;
}

@media (max-width: 1024px) {
  .editorContainer {
    flex-direction: column;
  }

  .rightPanel {
    width: 100%;
    height: 50%;
  }
}
```

**Step 3: Commit**

```bash
git add app/product-brief/page.tsx app/product-brief/page.module.css
git commit -m "feat: add main product brief page with split-screen layout"
```

---

## Phase 10: DOCX Export

### Task 16: Create Export Utility

**Files:**
- Create: `app/product-brief/lib/export-docx.ts`

**Purpose:** Generate DOCX from product brief state

**Step 1: Install docx library**

```bash
npm install docx
```

**Step 2: Write export utility**

```typescript
// app/product-brief/lib/export-docx.ts

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ProductBriefState, FieldId } from './brief-state';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

export function generateDocxFromState(state: ProductBriefState): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'Product Brief',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date(state.lastModified).toLocaleDateString()}`,
          italics: true,
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Separator
  sections.push(
    new Paragraph({
      text: '_______________________________________________________________',
      spacing: { after: 400 },
    })
  );

  // Add each field
  const fieldsToExport: FieldId[] = [
    'product_description',
    'target_industry',
    'where_used',
    'who_uses',
    'must_have',
    'nice_to_have',
    'moq',
    'risk_assessment',
    'competition',
  ];

  for (const fieldId of fieldsToExport) {
    const field = state.fields[fieldId];
    if (!field.content.trim()) continue;

    // Section heading
    sections.push(
      new Paragraph({
        text: FIELD_LABELS[fieldId],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Content
    const lines = field.content.split('\n').filter((line) => line.trim());
    lines.forEach((line) => {
      sections.push(
        new Paragraph({
          text: line,
          spacing: { after: 100 },
        })
      );
    });

    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  return new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
}
```

**Step 3: Commit**

```bash
git add app/product-brief/lib/export-docx.ts package.json package-lock.json
git commit -m "feat: add DOCX export utility"
```

---

### Task 17: Create Export API Endpoint

**Files:**
- Create: `app/api/product-brief/export/route.ts`

**Purpose:** API endpoint to generate and download DOCX

**Step 1: Write export API**

```typescript
// app/api/product-brief/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { generateDocxFromState } from '@/app/product-brief/lib/export-docx';
import { ProductBriefState } from '@/app/product-brief/lib/brief-state';

export async function POST(request: NextRequest) {
  try {
    const state: ProductBriefState = await request.json();

    if (!state || !state.fields) {
      return NextResponse.json(
        { success: false, error: 'Invalid state provided' },
        { status: 400 }
      );
    }

    // Generate DOCX
    const doc = generateDocxFromState(state);
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="product-brief-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    console.error('[API] Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/product-brief/export/route.ts
git commit -m "feat: add export API endpoint for DOCX generation"
```

---

### Task 18: Add Export Button to Main Page

**Files:**
- Modify: `app/product-brief/page.tsx`

**Purpose:** Add export button and download functionality

**Step 1: Add export handler and button to page.tsx**

Find the toolbar section and add export button:

```typescript
// In ProductBriefContent component, add export handler:

const handleExport = async () => {
  try {
    const response = await fetch('/api/product-brief/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-brief-${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to export document');
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export document');
  }
};

// Update toolbar JSX to include export button:
<div className={styles.toolbar}>
  <button className={styles.backButton} onClick={() => setView('start')}>
    ← Edit Description
  </button>
  <div className={styles.progress}>
    {state.completionStatus.required}/6 required complete
  </div>
  <button
    className={styles.exportButton}
    onClick={handleExport}
    disabled={state.completionStatus.required < 6}
  >
    📥 Export DOCX
  </button>
</div>
```

**Step 2: Add CSS for export button in page.module.css**

```css
/* Add to app/product-brief/page.module.css */

.exportButton {
  padding: 0.5rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
  background: #10b981;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.exportButton:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.exportButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #9ca3af;
}
```

**Step 3: Commit**

```bash
git add app/product-brief/page.tsx app/product-brief/page.module.css
git commit -m "feat: add export button with DOCX download"
```

---

## Summary

**Phases 7-10 Complete Implementation Plan:**

### Task Breakdown
- ✅ Task 11: Field Editor Component
- ✅ Task 12: Collapsed Field Card Component
- ✅ Task 13: Document Preview Component (with react-markdown)
- ✅ Task 14: Suggestions Panel Component
- ✅ Task 15: Main Product Brief Page (orchestration)
- ✅ Task 16: Export DOCX Utility
- ✅ Task 17: Export API Endpoint
- ✅ Task 18: Export Button Integration

### Dependencies Added
- react-markdown + remark-gfm (Task 13)
- docx (Task 16)

### Total Estimated Output
- **Files:** 16 new files
- **Lines of Code:** ~2,000
- **Commits:** 8

### Ready for Execution
This plan is complete and ready for autonomous execution. Each task has:
1. Clear file paths
2. Complete code implementations
3. Commit commands
4. Sequential dependencies handled

---

**End of Phases 7-10 Implementation Plan**
