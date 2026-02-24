'use client';

import { OnePagerProvider, useOnePager } from './lib/one-pager-context';
import SplitLayout from './components/SplitLayout';
import TextFieldWithExpand from './components/TextFieldWithExpand';
import CheckboxGroup from './components/CheckboxGroup';
import DynamicRoleSelector from './components/DynamicRoleSelector';
import CompetitorInput from './components/CompetitorInput';
import DocumentPreview from './components/DocumentPreview';
import { PhotoPicker } from './components/PhotoPicker';
import { FeatureSelector } from './components/FeatureSelector';
import type { FeatureCategory } from './components/FeatureSelector';
import { useCallback, useEffect, useState } from 'react';
import './one-pager-tokens.css';
import styles from './page.module.css';

interface ConfigData {
  environments: { id: string; label: string }[];
  industries: { id: string; label: string }[];
  standardFeatures: FeatureCategory[];
}

function OnePagerContent() {
  const { state, dispatch } = useOnePager();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/one-pager/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const handleExport = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
    setIsExporting(format);
    try {
      const response = await fetch(`/api/one-pager/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (format === 'pdf') {
        const data = await response.json();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `one-pager-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
    }
  }, [state]);

  const leftPanel = (
    <div className={styles.inputSections}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>Product One-Pager</h2>
        <div className={styles.exportButtons}>
          <button
            className={styles.exportButton}
            onClick={() => handleExport('docx')}
            disabled={isExporting !== null}
          >
            {isExporting === 'docx' ? 'Exporting...' : 'Download DOCX'}
          </button>
          <button
            className={styles.exportButtonGhost}
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
          >
            {isExporting === 'pdf' ? 'Preparing...' : 'Print / PDF'}
          </button>
        </div>
      </div>

      {/* Document Metadata */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Document Info</label>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Product Name</label>
            <input
              type="text"
              value={state.productName}
              onChange={(e) => dispatch({ type: 'SET_PRODUCT_NAME', payload: e.target.value })}
              placeholder="e.g., Compulocks iPad Enclosure"
              className={styles.textInput}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Prepared By</label>
            <input
              type="text"
              value={state.preparedBy}
              onChange={(e) => dispatch({ type: 'SET_PREPARED_BY', payload: e.target.value })}
              placeholder="Your name"
              className={styles.textInput}
            />
          </div>
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Email</label>
          <input
            type="email"
            value={state.userEmail}
            onChange={(e) => dispatch({ type: 'SET_USER_EMAIL', payload: e.target.value })}
            placeholder="your@email.com"
            className={styles.textInput}
          />
        </div>
      </div>

      {/* Section 1: Description */}
      <TextFieldWithExpand
        label="1. Product Description"
        value={state.description}
        onChange={(v) => dispatch({ type: 'SET_DESCRIPTION', payload: v })}
        placeholder="Describe your product concept..."
        field="description"
      />

      {/* Section 2: Goal */}
      <TextFieldWithExpand
        label="2. Goal"
        value={state.goal}
        onChange={(v) => dispatch({ type: 'SET_GOAL', payload: v })}
        placeholder="What is the goal of this product?"
        field="goal"
      />

      {/* Section 3: Where */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>3. Where (Environment & Industry)</label>
        {config ? (
          <>
            <CheckboxGroup
              label="Environment"
              options={config.environments}
              selected={state.context.environments}
              onToggle={(id) => dispatch({ type: 'TOGGLE_ENVIRONMENT', payload: id })}
            />
            <CheckboxGroup
              label="Industry"
              options={config.industries}
              selected={state.context.industries}
              onToggle={(id) => dispatch({ type: 'TOGGLE_INDUSTRY', payload: id })}
            />
          </>
        ) : (
          <p className={styles.loading}>Loading options...</p>
        )}
      </div>

      {/* Section 4: Who */}
      <DynamicRoleSelector
        selectedIndustries={state.context.industries}
        selectedRoles={state.audience.predefined}
        customRoles={state.audience.custom}
        onToggleRole={(role) => dispatch({ type: 'TOGGLE_ROLE', payload: role })}
        onAddCustom={(role) => dispatch({ type: 'ADD_CUSTOM_ROLE', payload: role })}
        onRemoveCustom={(role) => dispatch({ type: 'REMOVE_CUSTOM_ROLE', payload: role })}
      />

      {/* Use Cases */}
      <TextFieldWithExpand
        label="Use Cases"
        value={state.useCases}
        onChange={(v) => dispatch({ type: 'SET_USE_CASES', payload: v })}
        placeholder="Describe how the device will be used in practice..."
        field="useCases"
      />

      {/* Section 5: Features */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>5. Features</label>
        <FeatureSelector
          categories={config?.standardFeatures ?? []}
          mustHave={state.features.mustHave}
          niceToHave={state.features.niceToHave}
          onToggle={(label, category) =>
            dispatch({ type: 'ADD_FEATURE', payload: { category, feature: label } })
          }
          onRemove={(label, category) =>
            dispatch({ type: 'REMOVE_FEATURE', payload: { category, feature: label } })
          }
        />
      </div>

      {/* Section 6: Commercials */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>6. Commercials</label>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>MOQ</label>
            <input
              type="text"
              value={state.commercials.moq}
              onChange={(e) => dispatch({ type: 'SET_MOQ', payload: e.target.value })}
              placeholder="e.g., 1000 units"
              className={styles.textInput}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Target Price</label>
            <input
              type="text"
              value={state.commercials.targetPrice}
              onChange={(e) => dispatch({ type: 'SET_TARGET_PRICE', payload: e.target.value })}
              placeholder="e.g., $50-100"
              className={styles.textInput}
            />
          </div>
        </div>
      </div>

      {/* Section 7: Competitors */}
      <CompetitorInput
        competitors={state.competitors}
        onAdd={(url) => dispatch({ type: 'ADD_COMPETITOR', payload: { url } })}
        onUpdate={(url, data) => dispatch({ type: 'UPDATE_COMPETITOR', payload: { url, data } })}
        onRemove={(url) => dispatch({ type: 'REMOVE_COMPETITOR', payload: url })}
        onCandidates={(url, candidates) =>
          dispatch({ type: 'SET_COMPETITOR_CANDIDATES', payload: { url, candidatePhotos: candidates } })
        }
        onSelectPhoto={(url, photoUrl) =>
          dispatch({ type: 'SET_COMPETITOR_PHOTO', payload: { url, photoUrl } })
        }
        renderPhotoPicker={(comp) =>
          comp.status === 'done' ? (
            <PhotoPicker
              candidates={comp.candidatePhotos ?? []}
              selected={comp.photoUrl}
              onSelect={(photoUrl) =>
                dispatch({ type: 'SET_COMPETITOR_PHOTO', payload: { url: comp.url, photoUrl } })
              }
            />
          ) : null
        }
      />
    </div>
  );

  const rightPanel = <DocumentPreview state={state} />;

  return <SplitLayout leftPanel={leftPanel} rightPanel={rightPanel} />;
}

export default function OnePagerPage() {
  return (
    <OnePagerProvider>
      <OnePagerContent />
    </OnePagerProvider>
  );
}
