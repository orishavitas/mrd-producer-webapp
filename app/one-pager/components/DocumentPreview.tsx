'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './DocumentPreview.module.css';
import { OnePagerState } from '../lib/one-pager-state';

interface DocumentPreviewProps {
  state: OnePagerState;
  featureLayout?: 'sideBySide' | 'stacked';
}

export default function DocumentPreview({ state, featureLayout = 'sideBySide' }: DocumentPreviewProps) {
  const [design, setDesign] = useState<'classic' | 'm3'>('m3');

  const generateMarkdown = (): string => {
    const parts: string[] = [];

    if (state.description) {
      parts.push('## Product Description', '', state.description, '');
    }

    if (state.goal) {
      parts.push('## Goal', '', state.goal, '');
    }

    if (state.context.environments.length > 0 || state.context.industries.length > 0) {
      parts.push('## Where');
      if (state.context.environments.length > 0) {
        parts.push('', '**Environment:** ' + state.context.environments.join(', '));
      }
      if (state.context.industries.length > 0) {
        parts.push('', '**Industry:** ' + state.context.industries.join(', '));
      }
      parts.push('');
    }

    const allRoles = [...state.audience.predefined, ...state.audience.custom];
    if (allRoles.length > 0) {
      parts.push('## Who (Target Audience)', '', allRoles.map((r) => `- ${r}`).join('\n'), '');
    }

    if (state.useCases) {
      parts.push('## Use Cases', '', state.useCases, '');
    }

    if (state.commercials.moq || state.commercials.targetPrice) {
      parts.push('## Commercials');
      if (state.commercials.moq) parts.push('', `**MOQ:** ${state.commercials.moq}`);
      if (state.commercials.targetPrice) parts.push('', `**Target Price:** ${state.commercials.targetPrice}`);
      parts.push('');
    }

    return parts.join('\n');
  };

  const doneCompetitors = state.competitors.filter((c) => c.status === 'done');
  const hasFeatures = state.features.mustHave.length > 0 || state.features.niceToHave.length > 0;

  return (
    <div className={styles.container}>
      {/* ── Chrome header (outside the white doc area) ── */}
      <div className={styles.chrome} data-design={design}>
        <span className={styles.chromeLabel} data-design={design}>Document Preview</span>
        {/* Design toggle */}
        <div className={styles.designToggle} role="group" aria-label="Preview design">
          <button
            type="button"
            className={styles.designToggleBtn}
            aria-pressed={design === 'classic'}
            onClick={() => setDesign('classic')}
          >
            Classic
          </button>
          <button
            type="button"
            className={styles.designToggleBtn}
            aria-pressed={design === 'm3'}
            onClick={() => setDesign('m3')}
          >
            M3
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/compulocks-logo.png"
          alt="Compulocks"
          className={styles.chromeLogo}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* ── White document area ── */}
      <div className={styles.doc} data-design={design}>
        {/* Doc header: title left, logo right, split line below */}
        <div className={styles.docHeader}>
          <h1 className={styles.docTitle}>Marketing Requirement Document</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/compulocks-logo.svg"
            alt="Compulocks"
            className={styles.docLogo}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/compulocks-logo.png';
            }}
          />
        </div>
        <hr className={styles.docDivider} />

        {/* Metadata */}
        {(state.productName || state.preparedBy || state.userEmail) && (
          <div className={styles.meta}>
            {state.productName && <span><strong>Product:</strong> {state.productName}</span>}
            {state.preparedBy && <span><strong>Prepared by:</strong> {state.preparedBy}</span>}
            {state.userEmail && <span><strong>Contact:</strong> {state.userEmail}</span>}
          </div>
        )}

        {/* Body sections via ReactMarkdown */}
        <div className={styles.content} data-design={design}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {generateMarkdown()}
          </ReactMarkdown>

          {/* Features — side-by-side cards */}
          {hasFeatures && (
            <div className={styles.section}>
              <h2 className={styles.sectionHeading} data-design={design}>Features</h2>
              {design === 'm3' && <div className={styles.sectionRule} />}
              <div className={featureLayout === 'sideBySide' ? styles.featureCards : styles.featureCardsStacked}>
                {state.features.mustHave.length > 0 && (
                  <div className={styles.featureCard} data-design={design}>
                    <div className={styles.featureCardLabel} data-design={design}>Must Have</div>
                    <ul>
                      {state.features.mustHave.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {state.features.niceToHave.length > 0 && (
                  <div className={styles.featureCard} data-design={design}>
                    <div className={styles.featureCardLabel} data-design={design}>Nice to Have</div>
                    <ul>
                      {state.features.niceToHave.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Competitors */}
          {doneCompetitors.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionHeading} data-design={design}>Competitors</h2>
              {design === 'm3' && <div className={styles.sectionRule} />}
              {doneCompetitors.map((comp) => (
                <div key={comp.url} className={styles.competitor}>
                  <h3 className={styles.competitorName}>{comp.brand} — {comp.productName}</h3>
                  {comp.photoUrls?.length > 0 && (
                    <div className={styles.photoRow}>
                      {comp.photoUrls.map((photoUrl) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={photoUrl} src={photoUrl} alt={comp.productName} />
                      ))}
                    </div>
                  )}
                  {comp.cost && <p className={styles.body}><strong>Price:</strong> {comp.cost}</p>}
                  {comp.description && <p className={styles.body}>{comp.description}</p>}
                  <p className={styles.body}><a href={comp.url}>View product</a></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
