/**
 * Field Definitions for Brief Helper
 *
 * Metadata for each of the 6 brief helper fields including
 * labels, placeholders, help text, and ordering.
 */

import { BriefField } from './brief-state';

// ============================================================================
// Field Metadata
// ============================================================================

export interface FieldDefinition {
  /** Field identifier */
  id: BriefField;
  /** Display label */
  label: string;
  /** Textarea placeholder text */
  placeholder: string;
  /** Help text / description */
  helpText: string;
  /** Order in the form (1-6) */
  order: number;
}

// ============================================================================
// Field Definitions
// ============================================================================

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: 'what',
    label: 'What is it?',
    placeholder: 'Describe the product... (e.g., "A secure tablet stand for retail POS systems")',
    helpText: 'What is the product? What does it do? Include key features and purpose.',
    order: 1,
  },
  {
    id: 'who',
    label: 'Who is it for?',
    placeholder: 'Describe the target users... (e.g., "Retail store managers and cashiers")',
    helpText: 'Who will use this product? Describe your target customers or users.',
    order: 2,
  },
  {
    id: 'where',
    label: 'Where is it used?',
    placeholder: 'Describe the environment... (e.g., "Retail counters, restaurants, trade show booths")',
    helpText: 'Where will this product be used? Include environment, context, and use cases.',
    order: 3,
  },
  {
    id: 'moq',
    label: 'Minimum Order Quantity',
    placeholder: 'Enter MOQ and any constraints... (e.g., "1000 units, need fast turnaround")',
    helpText:
      'What is your minimum order quantity? This helps determine manufacturing approach and design complexity.',
    order: 4,
  },
  {
    id: 'must-have',
    label: 'Must-Have Features',
    placeholder:
      'List essential requirements... (e.g., "VESA mount compatible, cable management, lockable")',
    helpText: 'What are the non-negotiable features? These are requirements that must be met.',
    order: 5,
  },
  {
    id: 'nice-to-have',
    label: 'Nice-to-Have Features',
    placeholder:
      'List optional enhancements... (e.g., "Adjustable height, wireless charging, multiple colors")',
    helpText: 'What are the optional enhancements? These would be great but are not required.',
    order: 6,
  },
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/**
 * Get field definition by ID
 */
export function getFieldDefinition(fieldId: BriefField): FieldDefinition {
  const field = FIELD_DEFINITIONS.find((f) => f.id === fieldId);
  if (!field) {
    throw new Error(`Field definition not found for: ${fieldId}`);
  }
  return field;
}

/**
 * Get all fields in display order
 */
export function getFieldsInOrder(): FieldDefinition[] {
  return [...FIELD_DEFINITIONS].sort((a, b) => a.order - b.order);
}

/**
 * Get field label
 */
export function getFieldLabel(fieldId: BriefField): string {
  return getFieldDefinition(fieldId).label;
}

/**
 * Get field placeholder
 */
export function getFieldPlaceholder(fieldId: BriefField): string {
  return getFieldDefinition(fieldId).placeholder;
}

/**
 * Get field help text
 */
export function getFieldHelpText(fieldId: BriefField): string {
  return getFieldDefinition(fieldId).helpText;
}
