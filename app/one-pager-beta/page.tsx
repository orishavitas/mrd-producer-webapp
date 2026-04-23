'use client';

import { OnePagerProvider, useOnePager } from './lib/one-pager-context';
import SplitLayout from '../one-pager/components/SplitLayout';
import TextFieldWithExpand from './components/TextFieldWithExpand';
import CheckboxGroup from '../one-pager/components/CheckboxGroup';
import DynamicRoleSelector from '../one-pager/components/DynamicRoleSelector';
import CompetitorInput from './components/CompetitorInput';
import DocumentPreview from './components/DocumentPreview';
import { PhotoPicker } from '../one-pager/components/PhotoPicker';
import { FeatureSelector } from './components/FeatureSelector';
import type { FeatureCategory } from './components/FeatureSelector';
import { useCallback, useEffect, useRef, useState } from 'react';
import './one-pager-tokens.css';
import styles from './page.module.css';
import wizardStyles from './components/Wizard.module.css';

interface ConfigData {
  environments: { id: string; label: string }[];
  industries: { id: string; label: string }[];
  standardFeatures: FeatureCategory[];
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface WizardProps {
  onSubmit: (text: string) => void;
  onSkip: () => void;
  isProcessing: boolean;
}

function Wizard({ onSubmit, onSkip, isProcessing }: WizardProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className={wizardStyles.overlay}>
      <div className={wizardStyles.modal}>
        <div className={wizardStyles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/compulocks-logo.svg" alt="Compulocks" className={wizardStyles.logo}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/compulocks-logo.png'; }} />
          <h2 className={wizardStyles.title}>Marketing Requirement Document Producer</h2>
          <span className={wizardStyles.badge}>Beta</span>
        </div>
        <p className={wizardStyles.subtitle}>
          Describe what you want to build — product idea, target market, key features, environment, price range. The more detail, the better.
        </p>
        <textarea
          ref={textareaRef}
          className={wizardStyles.textarea}
          placeholder={`e.g. "A secure iPad enclosure for retail POS use in hospitality. Needs to work with iPad 10th gen, support charging, tilt adjustment, and cable management. Target price $80–120, MOQ 500 units. Competitors include Heckler Design and Compulocks."`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        <div className={wizardStyles.actions}>
          <button className={wizardStyles.skipBtn} onClick={onSkip} disabled={isProcessing}>
            Fill manually
          </button>
          <button
            className={wizardStyles.submitBtn}
            onClick={() => onSubmit(text)}
            disabled={text.trim().length < 20 || isProcessing}
          >
            {isProcessing ? 'Filling form...' : 'Generate MRD →'}
          </button>
        </div>
        {text.trim().length > 0 && text.trim().length < 20 && (
          <p className={wizardStyles.hint}>Keep going — a bit more detail helps the AI.</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function OnePagerContent() {
  const { state, dispatch } = useOnePager();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [isWizardProcessing, setIsWizardProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/one-pager/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const logDocument = useCallback((format: string) => {
    fetch('/api/one-pager-beta/log-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, exportFormat: format }),
    }).catch(() => {});
  }, [state]);

  const handleExport = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
    logDocument(format);
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
  }, [state, logDocument]);

  const handleAutoFill = useCallback(async () => {
    if (!config) return;
    setIsAutoFilling(true);
    try {
      const availableFeatures = config.standardFeatures.map((cat) => ({
        category: cat.label,
        features: cat.features.map((f: { label: string }) => f.label),
      }));
      const response = await fetch('/api/one-pager-beta/suggest-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: state.description || state.expandedDescription,
          goal: state.goal || state.expandedGoal,
          useCases: state.useCases || state.expandedUseCases,
          availableFeatures,
        }),
      });
      const data = await response.json();
      if (data.mustHave || data.niceToHave) {
        dispatch({ type: 'SET_FEATURES', payload: { mustHave: data.mustHave ?? [], niceToHave: data.niceToHave ?? [] } });
      }
    } catch (err) {
      console.error('Auto-fill failed:', err);
    } finally {
      setIsAutoFilling(false);
    }
  }, [config, state, dispatch]);

  const handleWizardSubmit = useCallback(async (text: string) => {
    setIsWizardProcessing(true);
    try {
      const response = await fetch('/api/one-pager-beta/wizard-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (data.fields) {
        const f = data.fields;
        if (f.description) dispatch({ type: 'SET_DESCRIPTION', payload: f.description });
        if (f.goal) dispatch({ type: 'SET_GOAL', payload: f.goal });
        if (f.useCases) dispatch({ type: 'SET_USE_CASES', payload: f.useCases });
        if (f.productName) dispatch({ type: 'SET_PRODUCT_NAME', payload: f.productName });
        if (f.moq) dispatch({ type: 'SET_MOQ', payload: f.moq });
        if (f.targetPrice) dispatch({ type: 'SET_TARGET_PRICE', payload: f.targetPrice });
        if (f.environments?.length) f.environments.forEach((e: string) => dispatch({ type: 'TOGGLE_ENVIRONMENT', payload: e }));
        if (f.industries?.length) f.industries.forEach((i: string) => dispatch({ type: 'TOGGLE_INDUSTRY', payload: i }));
        if (f.roles?.length) f.roles.forEach((r: string) => dispatch({ type: 'TOGGLE_ROLE', payload: r }));
      }
    } catch (err) {
      console.error('Wizard fill failed:', err);
    } finally {
      setIsWizardProcessing(false);
      setShowWizard(false);
    }
  }, [dispatch]);

  const isWorking = isExporting !== null;

  const leftPanel = (
    <div className={styles.inputSections}>
      <div className={styles.toolbar}>
        <h2 className={styles.pageTitle}>
          Marketing Requirement Document Producer
          <span style={{
            marginLeft: '0.5rem',
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            verticalAlign: 'middle',
            position: 'relative',
            top: '-1px',
          }}>Beta</span>
        </h2>
      </div>

      {/* Document Metadata */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Document Info</label>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Product Name</label>
            <input type="text" value={state.productName}
              onChange={(e) => dispatch({ type: 'SET_PRODUCT_NAME', payload: e.target.value })}
              placeholder="e.g., Compulocks iPad Enclosure" className={styles.textInput} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Prepared By</label>
            <input type="text" value={state.preparedBy}
              onChange={(e) => dispatch({ type: 'SET_PREPARED_BY', payload: e.target.value })}
              placeholder="Your name" className={styles.textInput} />
          </div>
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Email</label>
          <input type="email" value={state.userEmail}
            onChange={(e) => dispatch({ type: 'SET_USER_EMAIL', payload: e.target.value })}
            placeholder="your@email.com" className={styles.textInput} />
        </div>
      </div>

      <TextFieldWithExpand label="1. Product Description" value={state.description}
        onChange={(v) => dispatch({ type: 'SET_DESCRIPTION', payload: v })}
        placeholder="Describe your product concept..." field="description" />

      <TextFieldWithExpand label="2. Goal" value={state.goal}
        onChange={(v) => dispatch({ type: 'SET_GOAL', payload: v })}
        placeholder="What is the goal of this product?" field="goal" />

      <div className={styles.section}>
        <label className={styles.sectionLabel}>3. Where (Environment &amp; Industry)</label>
        {config ? (
          <>
            <CheckboxGroup label="Environment" options={config.environments}
              selected={state.context.environments}
              onToggle={(id) => dispatch({ type: 'TOGGLE_ENVIRONMENT', payload: id })} />
            <CheckboxGroup label="Industry" options={config.industries}
              selected={state.context.industries}
              onToggle={(id) => dispatch({ type: 'TOGGLE_INDUSTRY', payload: id })} />
          </>
        ) : <p className={styles.loading}>Loading options...</p>}
      </div>

      <DynamicRoleSelector selectedIndustries={state.context.industries}
        selectedRoles={state.audience.predefined} customRoles={state.audience.custom}
        onToggleRole={(role) => dispatch({ type: 'TOGGLE_ROLE', payload: role })}
        onAddCustom={(role) => dispatch({ type: 'ADD_CUSTOM_ROLE', payload: role })}
        onRemoveCustom={(role) => dispatch({ type: 'REMOVE_CUSTOM_ROLE', payload: role })} />

      <TextFieldWithExpand label="Use Cases" value={state.useCases}
        onChange={(v) => dispatch({ type: 'SET_USE_CASES', payload: v })}
        placeholder="Describe how the device will be used in practice..." field="useCases" />

      <div className={styles.section}>
        <label className={styles.sectionLabel}>5. Features</label>
        <FeatureSelector categories={config?.standardFeatures ?? []}
          mustHave={state.features.mustHave} niceToHave={state.features.niceToHave}
          onToggle={(label, category) => dispatch({ type: 'ADD_FEATURE', payload: { category, feature: label } })}
          onRemove={(label, category) => dispatch({ type: 'REMOVE_FEATURE', payload: { category, feature: label } })}
          onAutoFill={state.description.length >= 20 || state.expandedDescription.length >= 20 ? handleAutoFill : undefined}
          isAutoFilling={isAutoFilling} />
      </div>

      <div className={styles.section}>
        <label className={styles.sectionLabel}>6. Commercials</label>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>MOQ</label>
            <input type="text" value={state.commercials.moq}
              onChange={(e) => dispatch({ type: 'SET_MOQ', payload: e.target.value })}
              placeholder="e.g., 1000 units" className={styles.textInput} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Target Price</label>
            <input type="text" value={state.commercials.targetPrice}
              onChange={(e) => dispatch({ type: 'SET_TARGET_PRICE', payload: e.target.value })}
              placeholder="e.g., $50-100" className={styles.textInput} />
          </div>
        </div>
      </div>

      <CompetitorInput competitors={state.competitors}
        onAdd={(url) => dispatch({ type: 'ADD_COMPETITOR', payload: { url } })}
        onUpdate={(url, data) => dispatch({ type: 'UPDATE_COMPETITOR', payload: { url, data } })}
        onRemove={(url) => dispatch({ type: 'REMOVE_COMPETITOR', payload: url })}
        onCandidates={(url, candidates) =>
          dispatch({ type: 'SET_COMPETITOR_CANDIDATES', payload: { url, candidatePhotos: candidates } })}
        renderPhotoPicker={(comp) =>
          comp.status === 'done' ? (
            <PhotoPicker candidates={comp.candidatePhotos ?? []} selected={comp.photoUrls}
              onSelect={(photoUrl) =>
                dispatch({ type: 'TOGGLE_COMPETITOR_PHOTO', payload: { url: comp.url, photoUrl } })} />
          ) : null} />
    </div>
  );

  const leftBar = (
    <>
      <button className={styles.exportButtonGhost} onClick={() => setShowWizard(true)} disabled={isWorking}>
        ✦ Wizard
      </button>
      <button className={styles.exportButton} onClick={() => handleExport('docx')} disabled={isWorking}>
        {isExporting === 'docx' ? 'Exporting...' : 'Download DOCX'}
      </button>
      <button className={styles.exportButtonGhost} onClick={() => handleExport('pdf')} disabled={isWorking}>
        {isExporting === 'pdf' ? 'Preparing...' : 'Print / PDF'}
      </button>
    </>
  );

  const rightPanel = <DocumentPreview state={state} />;

  return (
    <>
      {showWizard && (
        <Wizard
          onSubmit={handleWizardSubmit}
          onSkip={() => setShowWizard(false)}
          isProcessing={isWizardProcessing}
        />
      )}
      <SplitLayout leftPanel={leftPanel} leftBar={leftBar} rightPanel={rightPanel} />
    </>
  );
}

export default function OnePagerPage() {
  return (
    <OnePagerProvider>
      <OnePagerContent />
    </OnePagerProvider>
  );
}
