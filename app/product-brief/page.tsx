// app/product-brief/page.tsx

'use client';

import React, { useState } from 'react';
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
  const [isResearching, setIsResearching] = useState(false);

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

  const handleResearchCompetitors = async () => {
    setIsResearching(true);

    try {
      const response = await fetch('/api/product-brief/research-competition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: state.fields.product_description.content,
          targetIndustry: state.fields.target_industry.content,
          whereUsed: state.fields.where_used.content,
          whoUses: state.fields.who_uses.content,
        }),
      });

      const data = await response.json();

      if (data.competitors && data.competitors.length > 0) {
        // Format competitors as bullet points
        const competitorBullets = data.competitors
          .map((c: any) => {
            const features = c.keyFeatures.slice(0, 3).join(', ');
            const price = c.pricePoint ? ` (${c.pricePoint})` : '';
            return `• ${c.company} - ${c.productName}${price}: ${features}`;
          })
          .join('\n');

        // Update competition field
        dispatch({
          type: 'SET_FIELD_CONTENT',
          payload: { fieldId: 'competition', content: competitorBullets },
        });

        // Show sources in console for user
        if (data.sources && data.sources.length > 0) {
          console.log('Competitor research sources:', data.sources);
        }
      } else {
        alert('No competitors found. Try adding more detail to your product fields.');
      }
    } catch (error) {
      console.error('Competition research error:', error);
      alert('Failed to research competitors. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

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
          <button
            className={styles.exportButton}
            onClick={handleExport}
            disabled={state.completionStatus.required < 6}
          >
            📥 Export DOCX
          </button>
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
            onResearchCompetitors={handleResearchCompetitors}
            isResearching={isResearching}
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
