/**
 * MRD Generator Agent Types
 */

import type { MRDSection } from '@/app/mrd-generator/lib/mrd-state';
import type { Gap } from '@/app/mrd-generator/lib/mrd-state';

// ============================================================================
// Batch MRD Agent
// ============================================================================

export interface BatchMRDInput {
  concept: string;
}

export interface BatchMRDOutput {
  sections: Partial<
    Record<
      MRDSection,
      {
        content: string;
        subsections?: Record<string, { content: string }>;
        confidence?: number;
      }
    >
  >;
  suggestedDocumentName?: string;
}

// ============================================================================
// MRD Chat Agent
// ============================================================================

export interface MRDChatInput {
  sectionId: MRDSection;
  currentContent: string;
  gaps?: Gap[];
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  initialConcept?: string;
}

export interface MRDChatOutput {
  message: string;
  suggestedContent?: string;
  isFinalSuggestion: boolean;
}

// ============================================================================
// MRD Gap Agent
// ============================================================================

export interface MRDGapInput {
  sectionId: MRDSection;
  content: string;
}

export interface MRDGapOutput {
  gaps: Gap[];
  completeness: number;
}
