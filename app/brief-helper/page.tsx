'use client';

/**
 * Brief Helper Page
 *
 * Main page for creating product briefs with AI assistance.
 * Displays 6 fields with progress tracking and state persistence.
 */

import React from 'react';
import { BriefProvider } from './lib/brief-context';
import { getFieldsInOrder } from './lib/field-definitions';
import BriefField from './components/BriefField';
import ProgressIndicator from './components/ProgressIndicator';
import styles from './page.module.css';

// ============================================================================
// Component
// ============================================================================

export default function BriefHelperPage() {
  const fields = getFieldsInOrder();

  return (
    <BriefProvider>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Page header */}
          <header className={styles.header}>
            <div className={styles.eyebrow}>AI-Assisted</div>
            <h1 className={styles.title}>Brief Helper</h1>
            <p className={styles.subtitle}>
              Quick product detail capture with intelligent assistance. Fill in the 6 fields below
              to create a simplified product brief.
            </p>
          </header>

          {/* Progress indicator */}
          <ProgressIndicator />

          {/* Brief form */}
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            {fields.map((field, index) => (
              <BriefField key={field.id} fieldType={field.id} order={index + 1} />
            ))}
          </form>
        </div>
      </div>
    </BriefProvider>
  );
}
