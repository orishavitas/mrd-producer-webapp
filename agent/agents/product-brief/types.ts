// agent/agents/product-brief/types.ts

/**
 * Product Brief Agent Types
 */

export interface BatchExtractInput {
  productConcept: string;
}

export interface BatchExtractOutput {
  fields: {
    product_description: string;
    target_industry: string[];
    where_used: string[];
    who_uses: string[];
    must_have: string[];
    nice_to_have: string[];
    moq?: string;
    risk_assessment?: string;
    competition?: string[];
  };
  confidence: number;
}

export interface GapDetectionInput {
  fieldId: string;
  fieldContent: string | string[];
  fieldType: 'text' | 'list';
}

export interface Gap {
  id: string;
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface GapDetectionOutput {
  gaps: Gap[];
  score: number;  // 0-100
}

export interface CompetitorInfo {
  company: string;
  product: string;
  price?: string;
  url?: string;
  features?: string[];
  marketPosition?: string;
}
