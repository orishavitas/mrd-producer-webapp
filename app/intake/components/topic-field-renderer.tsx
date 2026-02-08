'use client';

import { useState, useCallback } from 'react';
import type { FieldDefinition } from '../lib/topic-definitions';
import ChipSelect from './chip-select';
import styles from './topic-field-renderer.module.css';

interface TopicFieldRendererProps {
  field: FieldDefinition;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

/**
 * Renders the appropriate input component for a given FieldDefinition.
 * Supports: chips, select, multi-select, text, freetext, dynamic-list
 */
export default function TopicFieldRenderer({
  field,
  value,
  onChange,
}: TopicFieldRendererProps) {
  switch (field.type) {
    case 'chips':
      return (
        <div className={styles.fieldGroup}>
          <ChipSelect
            label={field.label}
            options={field.options || []}
            selected={Array.isArray(value) ? value : value ? [value] : []}
            onChange={onChange}
            allowCustom={field.allowCustom}
          />
        </div>
      );

    case 'multi-select':
      return (
        <div className={styles.fieldGroup}>
          <ChipSelect
            label={field.label}
            options={field.options || []}
            selected={Array.isArray(value) ? value : value ? [value] : []}
            onChange={onChange}
          />
        </div>
      );

    case 'select':
      return (
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`field-${field.id}`}>
            {field.label}
            {field.required && <span className={styles.required}>*</span>}
          </label>
          <select
            id={`field-${field.id}`}
            className={styles.select}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case 'text':
      return (
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`field-${field.id}`}>
            {field.label}
            {field.required && <span className={styles.required}>*</span>}
          </label>
          <input
            id={`field-${field.id}`}
            type="text"
            className={styles.textInput}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        </div>
      );

    case 'freetext':
      return (
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor={`field-${field.id}`}>
            {field.label}
            {field.required && <span className={styles.required}>*</span>}
          </label>
          <textarea
            id={`field-${field.id}`}
            className={styles.textarea}
            rows={field.rows || 3}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        </div>
      );

    case 'dynamic-list':
      return (
        <DynamicListField
          field={field}
          value={typeof value === 'string' ? value : Array.isArray(value) ? value.join('\n') : ''}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

// --- Dynamic List (for competitors: name+URL pairs) ---

interface DynamicListFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}

interface ListEntry {
  name: string;
  url: string;
}

function parseEntries(raw: string): ListEntry[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON, treat each line as a name
    return raw
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => ({ name: line.trim(), url: '' }));
  }
  return [];
}

function serializeEntries(entries: ListEntry[]): string {
  const nonEmpty = entries.filter((e) => e.name.trim() || e.url.trim());
  if (nonEmpty.length === 0) return '';
  return JSON.stringify(nonEmpty);
}

function DynamicListField({ field, value, onChange }: DynamicListFieldProps) {
  const [entries, setEntries] = useState<ListEntry[]>(() => {
    const parsed = parseEntries(value);
    return parsed.length > 0 ? parsed : [{ name: '', url: '' }];
  });

  const syncToParent = useCallback(
    (updated: ListEntry[]) => {
      setEntries(updated);
      onChange(serializeEntries(updated));
    },
    [onChange]
  );

  function handleNameChange(index: number, name: string) {
    const updated = entries.map((e, i) => (i === index ? { ...e, name } : e));
    syncToParent(updated);
  }

  function handleUrlChange(index: number, url: string) {
    const updated = entries.map((e, i) => (i === index ? { ...e, url } : e));
    syncToParent(updated);
  }

  function addEntry() {
    syncToParent([...entries, { name: '', url: '' }]);
  }

  function removeEntry(index: number) {
    if (entries.length <= 1) {
      // Keep at least one empty row
      syncToParent([{ name: '', url: '' }]);
    } else {
      syncToParent(entries.filter((_, i) => i !== index));
    }
  }

  return (
    <div className={styles.fieldGroup}>
      <span className={styles.label}>
        {field.label}
        {field.required && <span className={styles.required}>*</span>}
      </span>
      <div className={styles.dynamicList}>
        {entries.map((entry, index) => (
          <div key={index} className={styles.dynamicRow}>
            <input
              type="text"
              className={styles.dynamicInput}
              value={entry.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              placeholder="Competitor name"
              aria-label={`Competitor ${index + 1} name`}
            />
            <input
              type="url"
              className={styles.dynamicInput}
              value={entry.url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="Website URL (optional)"
              aria-label={`Competitor ${index + 1} URL`}
            />
            <button
              type="button"
              className={styles.dynamicRemove}
              onClick={() => removeEntry(index)}
              aria-label={`Remove competitor ${index + 1}`}
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.dynamicAdd}
          onClick={addEntry}
        >
          + Add another
        </button>
      </div>
    </div>
  );
}
