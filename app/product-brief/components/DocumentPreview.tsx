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
