'use client';

import { useState } from 'react';
import styles from './research-preview.module.css';
import type { ResearchPreview } from '../lib/intake-state';

interface ResearchPreviewProps {
  preview: ResearchPreview;
}

export default function ResearchPreviewComponent({ preview }: ResearchPreviewProps) {
  const [showSources, setShowSources] = useState(false);

  if (preview.isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Live Research</h3>
        <div className={styles.loading}>
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.loadingText}>Researching competitors, trends, and pricing...</p>
        </div>
      </div>
    );
  }

  if (!preview.data) {
    return null;
  }

  const { data, sources, quality } = preview;
  const hasCompetitive = !!data.competitive;
  const hasTrends = !!data.trends;
  const hasPricing = !!data.pricing;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Live Research</h3>

      {/* Quality indicator */}
      {quality && (
        <div className={styles.quality}>
          <span className={styles.qualityLabel}>Confidence:</span>
          <div className={styles.qualityBar}>
            <div
              className={styles.qualityFill}
              style={{ width: `${Math.round(quality.confidence * 100)}%` }}
            />
          </div>
          <span className={styles.qualityValue}>
            {Math.round(quality.confidence * 100)}%
          </span>
        </div>
      )}

      {/* Competitive analysis */}
      {hasCompetitive && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.statusIcon}>✓</span>
            Competitors Found
          </h4>
          <div className={styles.sectionContent}>
            {data.competitive.competitors && data.competitive.competitors.length > 0 && (
              <p className={styles.stat}>
                <strong>{data.competitive.competitors.length}</strong> competitors analyzed
              </p>
            )}
            {data.competitive.marketOverview?.priceRange && (
              <p className={styles.stat}>
                Price range: <strong>${data.competitive.marketOverview.priceRange.min} - ${data.competitive.marketOverview.priceRange.max}</strong>
                {data.competitive.marketOverview.priceRange.median && (
                  <> (median: ${data.competitive.marketOverview.priceRange.median})</>
                )}
              </p>
            )}
            {data.competitive.positioning?.differentiationOpportunities &&
              data.competitive.positioning.differentiationOpportunities.length > 0 && (
                <div className={styles.list}>
                  <p className={styles.listTitle}>Differentiation opportunities:</p>
                  <ul>
                    {data.competitive.positioning.differentiationOpportunities.slice(0, 3).map((opp: string, i: number) => (
                      <li key={i}>{opp}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Trend analysis */}
      {hasTrends && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.statusIcon}>✓</span>
            Market Trends
          </h4>
          <div className={styles.sectionContent}>
            {data.trends.trends && data.trends.trends.length > 0 && (
              <div className={styles.list}>
                <ul>
                  {data.trends.trends.slice(0, 3).map((trend: any, i: number) => (
                    <li key={i}>
                      <strong>{trend.name || trend.title}:</strong> {trend.description || trend.impact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing analysis */}
      {hasPricing && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.statusIcon}>✓</span>
            Pricing Insights
          </h4>
          <div className={styles.sectionContent}>
            {data.pricing.pricingModels && data.pricing.pricingModels.length > 0 && (
              <p className={styles.stat}>
                Common pricing models: <strong>{data.pricing.pricingModels.slice(0, 2).join(', ')}</strong>
              </p>
            )}
            {data.pricing.recommendations && data.pricing.recommendations.length > 0 && (
              <div className={styles.list}>
                <p className={styles.listTitle}>Recommendations:</p>
                <ul>
                  {data.pricing.recommendations.slice(0, 2).map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className={styles.sources}>
          <button
            type="button"
            className={styles.sourcesToggle}
            onClick={() => setShowSources(!showSources)}
          >
            {showSources ? '▼' : '▶'} {sources.length} source{sources.length !== 1 ? 's' : ''}
          </button>
          {showSources && (
            <ul className={styles.sourcesList}>
              {sources.map((source, i) => (
                <li key={i}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Gaps warning */}
      {quality && quality.gaps.length > 0 && (
        <div className={styles.gaps}>
          <p className={styles.gapsTitle}>Research limitations:</p>
          <ul>
            {quality.gaps.slice(0, 3).map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
