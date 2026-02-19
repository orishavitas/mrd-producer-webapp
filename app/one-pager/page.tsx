'use client';

import { OnePagerProvider, useOnePager } from './lib/one-pager-context';
import SplitLayout from './components/SplitLayout';
import TextFieldWithExpand from './components/TextFieldWithExpand';
import CheckboxGroup from './components/CheckboxGroup';
import DynamicRoleSelector from './components/DynamicRoleSelector';
import ChipInput from './components/ChipInput';
import CompetitorInput from './components/CompetitorInput';
import DocumentPreview from './components/DocumentPreview';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

interface ConfigData {
  environments: { id: string; label: string }[];
  industries: { id: string; label: string }[];
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

      {/* Section 5: Features */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>5. Features</label>
        <ChipInput
          label="Must Have"
          chips={state.features.mustHave}
          onAdd={(f) => dispatch({ type: 'ADD_FEATURE', payload: { category: 'mustHave', feature: f } })}
          onRemove={(f) => dispatch({ type: 'REMOVE_FEATURE', payload: { category: 'mustHave', feature: f } })}
          placeholder="Type a feature and press Enter..."
        />
        <ChipInput
          label="Nice to Have"
          chips={state.features.niceToHave}
          onAdd={(f) => dispatch({ type: 'ADD_FEATURE', payload: { category: 'niceToHave', feature: f } })}
          onRemove={(f) => dispatch({ type: 'REMOVE_FEATURE', payload: { category: 'niceToHave', feature: f } })}
          placeholder="Type a feature and press Enter..."
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
