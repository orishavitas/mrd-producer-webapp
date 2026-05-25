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
import PublishGateModal from './components/PublishGateModal';
import DraftWarningBanner from './components/DraftWarningBanner';
import type { FeatureCategory } from './components/FeatureSelector';
import ProductInfoCustomization from './components/ProductInfoCustomization';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import ReferencePhotosSection from './components/ReferencePhotosSection';
import SectionNavMenu from './components/SectionNavMenu';
import MissingInfoWidget from './components/MissingInfoWidget';
import { useCallback, useEffect, useState } from 'react';
import { getCompletionSections, bumpMinorVersion, OnePagerState, ReferencePhotoEntry } from './lib/one-pager-state';
import Link from 'next/link';
import './one-pager-tokens.css';
import styles from './page.module.css';

interface ConfigData {
  environments: { id: string; label: string }[];
  industries: { id: string; label: string }[];
  standardFeatures: FeatureCategory[];
}

function OnePagerContent({ isAdmin }: { isAdmin: boolean }) {
  const { state, dispatch, reset } = useOnePager();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishGatePending, setPublishGatePending] = useState<'docx' | 'html' | 'pdf' | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [featureLayout, setFeatureLayout] = useState<'sideBySide' | 'stacked'>('sideBySide');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const completionSections = getCompletionSections(state);
  const completionDone = completionSections.filter(s => s.done).length;
  const completionTotal = completionSections.length;
  const completionPct = Math.round(completionDone / completionTotal * 100);

  useEffect(() => {
    if (validationErrors && validationErrors.length > 0) {
      const stillMissing = getCompletionSections(state).filter(s => !s.done).map(s => s.label);
      if (stillMissing.length === 0) setValidationErrors(null);
      else setValidationErrors(stillMissing);
    }
  }, [state, validationErrors]);

  useEffect(() => {
    fetch('/api/one-pager/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const runExport = useCallback(async (format: 'docx' | 'html' | 'pdf') => {
    setIsExporting(format);
    try {
      const response = await fetch(`/api/one-pager/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, featureLayout }),
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

  const handleExport = useCallback((format: 'docx' | 'html' | 'pdf') => {
    const missing = getCompletionSections(state).filter(s => !s.done).map(s => s.label);
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors(null);
    if (!state.isPublished) {
      setPublishGatePending(format);
      return;
    }
    runExport(format);
  }, [state, runExport]);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    const nextVersion = bumpMinorVersion(state.version);
    try {
      const title = state.productName || 'Untitled One-Pager';
      if (!state.documentId) {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, tool_type: 'one-pager', content_json: { ...state, version: nextVersion } }),
        });
        const data = await res.json();
        if (data.id) {
          dispatch({ type: 'SET_DOCUMENT_ID', payload: data.id });
          dispatch({ type: 'SET_VERSION', payload: nextVersion });
        }
      } else {
        const res = await fetch(`/api/documents/${state.documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentJson: { ...state, version: nextVersion }, version: nextVersion }),
        });
        const data = await res.json();
        if (data.ok) {
          dispatch({ type: 'SET_VERSION', payload: nextVersion });
        }
      }
    } catch (error) {
      console.error('Save draft failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [state, dispatch]);

  const handlePublish = useCallback(async () => {
    const missing = getCompletionSections(state).filter(s => !s.done).map(s => s.label);
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }
    setValidationErrors(null);
    setIsPublishing(true);
    try {
      let docId = state.documentId;
      if (!docId) {
        const title = state.productName || 'Untitled One-Pager';
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, tool_type: 'one-pager', content_json: state }),
        });
        const data = await res.json();
        if (data.id) {
          dispatch({ type: 'SET_DOCUMENT_ID', payload: data.id });
          docId = data.id;
        }
      }

      if (!docId) return;

      const res = await fetch(`/api/documents/${docId}/publish`, { method: 'POST' });
      const data = await res.json();
      dispatch({ type: 'SET_PUBLISHED', payload: true });
      if (data.version) dispatch({ type: 'SET_VERSION', payload: data.version });
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [state, dispatch]);

  const handleAutoFill = useCallback(async () => {
    if (!config) return;
    setIsAutoFilling(true);
    try {
      const availableFeatures = config.standardFeatures.map((cat) => ({
        category: cat.label,
        features: cat.features.map((f: { label: string }) => f.label),
      }));
      const response = await fetch('/api/one-pager/suggest-features', {
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
        dispatch({
          type: 'SET_FEATURES',
          payload: {
            mustHave: data.mustHave ?? [],
            niceToHave: data.niceToHave ?? [],
          },
        });
      }
    } catch (err) {
      console.error('Auto-fill failed:', err);
    } finally {
      setIsAutoFilling(false);
    }
  }, [config, state, dispatch]);

  const handleGatePublish = useCallback(async () => {
    const pending = publishGatePending;
    setPublishGatePending(null);
    await handlePublish();
    if (pending) {
      runExport(pending);
    }
  }, [publishGatePending, handlePublish, runExport]);

  const handleRollback = useCallback((snapshot: OnePagerState) => {
    dispatch({ type: 'RESTORE_VERSION', payload: snapshot });
  }, [dispatch]);

  const isWorking = isExporting !== null || isSaving || isPublishing;

  const skippedSections = state.skippedSections ?? {};

  const leftPanel = (
    <div className={styles.inputSections}>
      {/* Sticky section nav */}
      <SectionNavMenu skippedSections={skippedSections} />

      {/* Draft warning banner */}
      {!state.isPublished && state.documentId !== null && !bannerDismissed && (
        <DraftWarningBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {validationErrors && validationErrors.length > 0 && (
        <div className={styles.validationBanner}>
          <strong>Please complete before publishing:</strong>
          <ul>{validationErrors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {/* Document Info */}
      <div id="section-documentInfo" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <h3 className={styles.sectionTitle}>Document Info</h3>
          </div>
          <div className={styles.sectionRule} />
        </div>
        <div className={styles.card}>
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
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Email</label>
            <input
              type="email"
              value={state.userEmail}
              onChange={(e) => dispatch({ type: 'SET_USER_EMAIL', payload: e.target.value })}
              placeholder="your@email.com"
              className={styles.textInput}
            />
          </div>

          {/* Compatible Devices */}
          <div className={styles.fieldHeaderRow}>
            <label className={styles.fieldLabel}>Compatible Device(s)</label>
            <button
              type="button"
              className={state.compatibleDevicesSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_COMPATIBLE_DEVICES_SKIPPED', payload: !state.compatibleDevicesSkipped })}
            >
              {state.compatibleDevicesSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          {!state.compatibleDevicesSkipped && (
            <input
              type="text"
              value={state.compatibleDevices ?? ''}
              onChange={(e) => dispatch({ type: 'SET_COMPATIBLE_DEVICES', payload: e.target.value })}
              placeholder='e.g., iPad 10th gen, iPad Pro 12.9"'
              className={styles.textInput}
            />
          )}

          {/* Customer Name */}
          <div className={styles.fieldHeaderRow}>
            <label className={styles.fieldLabel}>Customer Name</label>
            <button
              type="button"
              className={state.customerNameSkipped ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'SET_CUSTOMER_NAME_SKIPPED', payload: !state.customerNameSkipped })}
            >
              {state.customerNameSkipped ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          {!state.customerNameSkipped && (
            <input
              type="text"
              value={state.customerName ?? ''}
              onChange={(e) => dispatch({ type: 'SET_CUSTOMER_NAME', payload: e.target.value })}
              placeholder="e.g., Acme Corporation"
              className={styles.textInput}
            />
          )}
        </div>
      </div>

      {/* Section 01: Product Information */}
      <div id="section-productDescription" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>01</span>
            <h3 className={styles.sectionTitle}>Product Information</h3>
          </div>
          <div className={styles.sectionRule} />
        </div>
        <div className={styles.card}>
          <div className={styles.subhead}>Product Description</div>
          <TextFieldWithExpand
            label=""
            value={state.description}
            onChange={(v) => dispatch({ type: 'SET_DESCRIPTION', payload: v })}
            placeholder="Describe your product concept..."
            field="description"
          />
          <ProductInfoCustomization
            customization={state.customization}
            dispatch={dispatch}
          />
        </div>
      </div>

      {/* Section 02: Goal */}
      <div id="section-goal" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>02</span>
            <h3 className={styles.sectionTitle}>Goal</h3>
            <button
              type="button"
              className={skippedSections['goal'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'goal' })}
            >
              {skippedSections['goal'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['goal'] && (
          <div className={styles.card}>
            <TextFieldWithExpand
              label=""
              value={state.goal}
              onChange={(v) => dispatch({ type: 'SET_GOAL', payload: v })}
              placeholder="What is the goal of this product?"
              field="goal"
            />
          </div>
        )}
      </div>

      {/* Section 03: Where */}
      <div id="section-where" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>03</span>
            <h3 className={styles.sectionTitle}>Where</h3>
            <button
              type="button"
              className={skippedSections['where'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'where' })}
            >
              {skippedSections['where'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['where'] && (
          <div className={styles.card}>
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
              <p className={styles.loading}>Loading options…</p>
            )}
          </div>
        )}
      </div>

      {/* Section 04: Who */}
      <div id="section-who" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>04</span>
            <h3 className={styles.sectionTitle}>Who</h3>
            <button
              type="button"
              className={skippedSections['who'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'who' })}
            >
              {skippedSections['who'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['who'] && (
          <div className={styles.sectionCard}>
            <DynamicRoleSelector
              selectedIndustries={state.context.industries}
              selectedRoles={state.audience.predefined}
              customRoles={state.audience.custom}
              onToggleRole={(role) => dispatch({ type: 'TOGGLE_ROLE', payload: role })}
              onAddCustom={(role) => dispatch({ type: 'ADD_CUSTOM_ROLE', payload: role })}
              onRemoveCustom={(role) => dispatch({ type: 'REMOVE_CUSTOM_ROLE', payload: role })}
            />
          </div>
        )}
      </div>

      {/* Use Cases */}
      <div id="section-useCases" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <h3 className={styles.sectionTitle}>Use Cases</h3>
            <button
              type="button"
              className={skippedSections['useCases'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'useCases' })}
            >
              {skippedSections['useCases'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['useCases'] && (
          <div className={styles.card}>
            <TextFieldWithExpand
              label=""
              value={state.useCases}
              onChange={(v) => dispatch({ type: 'SET_USE_CASES', payload: v })}
              placeholder="Describe how the device will be used in practice…"
              field="useCases"
            />
          </div>
        )}
      </div>

      {/* Section 05: Features */}
      <div id="section-features" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>05</span>
            <h3 className={styles.sectionTitle}>Features</h3>
            <button
              type="button"
              className={skippedSections['features'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'features' })}
            >
              {skippedSections['features'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['features'] && (
          <div className={styles.card}>
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
              onAutoFill={state.description.length >= 20 || state.expandedDescription.length >= 20 ? handleAutoFill : undefined}
              isAutoFilling={isAutoFilling}
              layout={featureLayout}
              onLayoutChange={setFeatureLayout}
            />
          </div>
        )}
      </div>

      {/* Section 06: Commercials */}
      <div id="section-commercials" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>06</span>
            <h3 className={styles.sectionTitle}>Commercials</h3>
          </div>
          <div className={styles.sectionRule} />
        </div>
        <div className={styles.card}>
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
                placeholder="e.g., $50–100"
                className={styles.textInput}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Number of Samples</label>
            <input
              type="text"
              value={state.numberOfSamples ?? ''}
              onChange={(e) => dispatch({ type: 'SET_NUMBER_OF_SAMPLES', payload: e.target.value })}
              placeholder="e.g., 5"
              className={styles.textInput}
            />
          </div>
        </div>
      </div>

      {/* Section 07: Competitors */}
      <div id="section-competitors" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>07</span>
            <h3 className={styles.sectionTitle}>Competitors</h3>
            <button
              type="button"
              className={skippedSections['competitors'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'competitors' })}
            >
              {skippedSections['competitors'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['competitors'] && (
          <div className={styles.sectionCard}>
            <CompetitorInput
              competitors={state.competitors}
              onAdd={(url) => dispatch({ type: 'ADD_COMPETITOR', payload: { url } })}
              onUpdate={(url, data) => dispatch({ type: 'UPDATE_COMPETITOR', payload: { url, data } })}
              onRemove={(url) => dispatch({ type: 'REMOVE_COMPETITOR', payload: url })}
              onCandidates={(url, candidates) =>
                dispatch({ type: 'SET_COMPETITOR_CANDIDATES', payload: { url, candidatePhotos: candidates } })
              }
              renderPhotoPicker={(comp) =>
                comp.status === 'done' ? (
                  <PhotoPicker
                    candidates={comp.candidatePhotos ?? []}
                    selected={comp.photoUrls}
                    onSelect={(photoUrl) =>
                      dispatch({ type: 'TOGGLE_COMPETITOR_PHOTO', payload: { url: comp.url, photoUrl } })
                    }
                  />
                ) : null
              }
            />
          </div>
        )}
      </div>

      {/* Section 08: Reference Photos */}
      <div id="section-referencePhotos" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <span className={styles.sectionNumber}>08</span>
            <h3 className={styles.sectionTitle}>Reference Photos</h3>
            <button
              type="button"
              className={skippedSections['referencePhotos'] ? styles.skipBtnActive : styles.skipBtn}
              onClick={() => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: 'referencePhotos' })}
            >
              {skippedSections['referencePhotos'] ? '✓ N/A' : 'N/A'}
            </button>
          </div>
          <div className={styles.sectionRule} />
        </div>
        {!skippedSections['referencePhotos'] && (
          <div className={styles.card}>
            <ReferencePhotosSection
              photos={state.referencePhotos ?? []}
              onAdd={(photo: ReferencePhotoEntry) => dispatch({ type: 'ADD_REFERENCE_PHOTO', payload: photo })}
              onRemove={(id: string) => dispatch({ type: 'REMOVE_REFERENCE_PHOTO', payload: id })}
              onUpdateNotes={(id: string, notes: string) => dispatch({ type: 'UPDATE_REFERENCE_PHOTO_NOTES', payload: { id, notes } })}
              onUpdateUrl={(id: string, url: string) => dispatch({ type: 'UPDATE_REFERENCE_PHOTO_URL', payload: { id, url } })}
            />
            <div className={styles.subhead} style={{ marginTop: 'var(--op-sp-5)' }}>Additional Notes</div>
            <textarea
              value={state.additionalNotes ?? ''}
              onChange={(e) => dispatch({ type: 'SET_ADDITIONAL_NOTES', payload: e.target.value })}
              placeholder="Any additional notes, context, or references for these photos…"
              className={styles.textareaInput}
              rows={4}
            />
          </div>
        )}
      </div>

      {/* Footnotes */}
      <div id="section-footnotes" className={styles.formSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <h3 className={styles.sectionTitle}>Footnotes</h3>
          </div>
          <div className={styles.sectionRule} />
        </div>
        <div className={styles.card}>
          <textarea
            value={state.footnotes}
            onChange={(e) => dispatch({ type: 'SET_FOOTNOTES', payload: e.target.value })}
            placeholder="Any additional notes, references, or clarifications…"
            className={styles.textareaInput}
            rows={4}
          />
        </div>
      </div>

      {/* Version History (admin only) */}
      {isAdmin && state.documentId && (
        <div className={styles.formSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadRow}>
              <h3 className={styles.sectionTitle}>Version History</h3>
              <span className={styles.adminBadge}>Admin</span>
            </div>
            <div className={styles.sectionRule} />
          </div>
          <VersionHistoryPanel
            documentId={state.documentId}
            currentVersion={state.version}
            onRollback={handleRollback}
          />
        </div>
      )}

      {/* Publish gate modal */}
      {publishGatePending !== null && (
        <PublishGateModal
          pending={publishGatePending}
          onPublish={handleGatePublish}
          onCancel={() => setPublishGatePending(null)}
        />
      )}
    </div>
  );

  const rightPanel = <DocumentPreview state={state} featureLayout={featureLayout} />;

  const handleUnpublish = useCallback(async () => {
    if (!state.documentId) {
      dispatch({ type: 'SET_PUBLISHED', payload: false });
      return;
    }
    try {
      await fetch(`/api/documents/${state.documentId}/publish`, { method: 'DELETE' });
      dispatch({ type: 'SET_PUBLISHED', payload: false });
    } catch {
      dispatch({ type: 'SET_PUBLISHED', payload: false });
    }
  }, [state.documentId, dispatch]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset the form? All unsaved data will be lost.')) {
      reset();
    }
  }, [reset]);

  const leftBar = (
    <div className={styles.barRow}>
      <div className={styles.barLeft}>
        <Link href="/" className={styles.barIconBtn} title="Home">
          &#8962;
        </Link>
        <button
          className={styles.barIconBtn}
          onClick={handleReset}
          title="Reset form"
        >
          &#8635;
        </button>
        <button
          className={styles.previewToggleBtn}
          onClick={() => setPreviewOpen((v) => !v)}
          data-open={previewOpen ? 'true' : 'false'}
          title={previewOpen ? 'Hide preview' : 'Show preview'}
        >
          {previewOpen ? '✕ Preview' : '▶ Preview'}
        </button>
      </div>
      <div className={styles.progressWrap}>
        <MissingInfoWidget
          sections={completionSections}
          onToggleSkip={(key) => dispatch({ type: 'TOGGLE_SECTION_SKIP', payload: key })}
          onTogglePaintSkip={() => dispatch({ type: 'SET_PAINT_SKIPPED', payload: !state.customization.paintSkipped })}
          onToggleLogoSkip={() => dispatch({ type: 'SET_LOGO_SKIPPED', payload: !state.customization.logoSkipped })}
        />
        <span className={styles.versionBadge} title={state.isPublished ? 'Published' : 'Draft'}>
          v{state.version}
        </span>
      </div>
      <div className={styles.barRight}>
        <button
          className={styles.exportButtonGhost}
          onClick={handleSaveDraft}
          disabled={isWorking}
        >
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        {state.isPublished ? (
          <button
            className={styles.exportButtonGhost}
            onClick={handleUnpublish}
            disabled={isWorking}
          >
            Unpublish
          </button>
        ) : (
          <button
            className={styles.exportButtonGhost}
            onClick={handlePublish}
            disabled={isWorking}
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        )}
        <button
          className={styles.exportButton}
          onClick={() => handleExport('docx')}
          disabled={isWorking}
        >
          {isExporting === 'docx' ? 'Exporting...' : 'Download DOCX'}
        </button>
        <button
          className={styles.exportButtonGhost}
          onClick={() => handleExport('pdf')}
          disabled={isWorking}
        >
          {isExporting === 'pdf' ? 'Preparing...' : 'Print / PDF'}
        </button>
      </div>
    </div>
  );

  return <SplitLayout leftPanel={leftPanel} leftBar={leftBar} rightPanel={rightPanel} previewOpen={previewOpen} />;
}

export default function OnePagerClient({ isAdmin }: { isAdmin: boolean }) {
  return (
    <OnePagerProvider>
      <OnePagerContent isAdmin={isAdmin} />
    </OnePagerProvider>
  );
}
