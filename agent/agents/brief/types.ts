/**
 * Brief Helper Agent Types
 *
 * Shared type definitions for all brief helper agents.
 */

import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Text Extraction Agent
// ============================================================================

/**
 * Input for text extraction agent
 */
export interface TextExtractionInput {
  /** Field type (determines extraction strategy) */
  fieldType: BriefField;
  /** Raw free-form text from user */
  freeText: string;
}

/**
 * Extracted entity with metadata
 */
export interface ExtractedEntity {
  /** Entity type (e.g., 'dimension', 'material', 'standard', 'use_case') */
  type: string;
  /** Extracted value */
  value: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original text span (optional) */
  span?: string;
}

/**
 * Output from text extraction agent
 */
export interface TextExtractionOutput {
  /** Structured bullet points */
  bulletPoints: string[];
  /** Extracted entities */
  entities: ExtractedEntity[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Field type processed */
  fieldType: BriefField;
}

// ============================================================================
// Gap Detection Agent
// ============================================================================

/**
 * Input for gap detection agent
 */
export interface GapDetectionInput {
  /** Field type */
  fieldType: BriefField;
  /** Extracted entities from text extraction */
  entities: ExtractedEntity[];
  /** Current bullet points */
  bulletPoints: string[];
}

/**
 * Identified information gap
 */
export interface IdentifiedGap {
  /** Gap identifier */
  id: string;
  /** Gap category */
  category: string;
  /** Missing information description */
  description: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Suggested question to ask user */
  suggestedQuestion: string;
  /** Example answer (optional) */
  exampleAnswer?: string;
}

/**
 * Output from gap detection agent
 */
export interface GapDetectionOutput {
  /** Identified gaps */
  gaps: IdentifiedGap[];
  /** Field type processed */
  fieldType: BriefField;
  /** Completeness score (0-1) */
  completeness: number;
}

// ============================================================================
// Batch Extraction Agent (V2)
// ============================================================================

/**
 * Input for batch extraction agent
 */
export interface BatchExtractionInput {
  /** Initial product description from start page */
  description: string;
}

/**
 * Output from batch extraction agent
 */
export interface BatchExtractionOutput {
  /** Extracted data for all 6 fields */
  fields: {
    [K in BriefField]: {
      /** Structured bullet points */
      bullets: string[];
      /** Extracted entities */
      entities: ExtractedEntity[];
      /** Confidence score (0-1) */
      confidence: number;
    };
  };
}

// ============================================================================
// Brief Generation Agent
// ============================================================================

/**
 * Input for brief generation agent
 */
export interface BriefGenerationInput {
  /** Data from all 6 fields */
  fields: {
    what: string[];
    who: string[];
    where: string[];
    moq: string[];
    'must-have': string[];
    'nice-to-have': string[];
  };
}

/**
 * Output from brief generation agent
 */
export interface BriefGenerationOutput {
  /** Generated brief in Markdown format */
  markdown: string;
  /** Generated brief in HTML format */
  html: string;
  /** Brief metadata */
  metadata: {
    generatedAt: string;
    fieldCount: number;
    totalBulletPoints: number;
  };
}
