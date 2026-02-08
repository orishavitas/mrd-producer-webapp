/**
 * Parser Agent
 *
 * Extracts structured RequestData from raw user input.
 * Wraps the parsing logic previously inlined in workflow.ts
 * (extractProductName, inferProductCategory, inferTargetMarkets,
 * extractUseCases, extractTargetPrice, extractTechnicalRequirements)
 * and applies input sanitization before extraction.
 *
 * This agent performs no AI provider calls -- it is pure deterministic
 * extraction based on keyword matching and heuristics.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { RequestData } from '@/lib/schemas';
import { sanitizeMRDInput } from '@/lib/sanitize';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

/**
 * Raw input supplied by the user or the orchestrator.
 */
export interface ParserInput {
  /** The product concept description (required). */
  productConcept: string;
  /** The target market description (required). */
  targetMarket: string;
  /** Optional additional context or details. */
  additionalDetails?: string;
  /**
   * Request ID to stamp on the output.  When omitted the agent generates one
   * using the same format as lib/schemas.generateRequestId.
   */
  requestId?: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class ParserAgent extends BaseAgent<ParserInput, RequestData> {
  readonly id = 'parser-agent';
  readonly name = 'Parser Agent';
  readonly version = '1.0.0';
  readonly description =
    'Extracts structured RequestData from raw user input using keyword-based heuristics and sanitization';

  // No AI capabilities required -- pure extraction logic
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [];

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: ParserInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.productConcept || typeof input.productConcept !== 'string' || input.productConcept.trim().length === 0) {
      errors.push('productConcept is required and must be a non-empty string');
    }

    if (!input.targetMarket || typeof input.targetMarket !== 'string' || input.targetMarket.trim().length === 0) {
      errors.push('targetMarket is required and must be a non-empty string');
    }

    if (input.additionalDetails !== undefined && typeof input.additionalDetails !== 'string') {
      errors.push('additionalDetails must be a string when provided');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: ParserInput,
    context: ExecutionContext
  ): Promise<RequestData> {
    context.log('info', `[${this.id}] Parsing request`, {
      hasAdditionalDetails: !!input.additionalDetails,
    });

    // Sanitize all free-text inputs before extraction
    const sanitized = sanitizeMRDInput({
      productConcept: input.productConcept,
      targetMarket: input.targetMarket,
      additionalDetails: input.additionalDetails,
    });

    const requestId = input.requestId || generateRequestId();

    const requestData: RequestData = {
      requestId,
      sender: {
        email: null,
        name: 'Unknown',
        department: 'Unknown',
        inferredFrom: null,
      },
      productConcept: {
        name: extractProductName(sanitized.productConcept),
        summary: sanitized.productConcept,
        category: inferProductCategory(sanitized.productConcept),
      },
      rawInput: {
        productConcept: sanitized.productConcept,
        targetMarket: sanitized.targetMarket,
        additionalDetails: sanitized.additionalDetails || null,
      },
      extractedData: {
        targetMarkets: inferTargetMarkets(sanitized.targetMarket),
        useCases: extractUseCases(sanitized.productConcept, sanitized.additionalDetails),
        targetPrice: extractTargetPrice(sanitized.additionalDetails),
        technicalRequirements: extractTechnicalRequirements(sanitized.additionalDetails),
        volumeExpectation: null,
        timeline: {
          urgency: 'medium',
          targetDate: null,
          notes: null,
        },
        additionalContext: sanitized.additionalDetails || null,
      },
      gaps: { critical: [], optional: [] },
      scopeFlags: [],
      metadata: {
        parsedAt: new Date().toISOString(),
        parserVersion: this.version,
        confidence: 0.8,
      },
    };

    context.log('debug', `[${this.id}] Extraction complete`, {
      productName: requestData.productConcept.name,
      category: requestData.productConcept.category,
      markets: requestData.extractedData.targetMarkets,
      useCases: requestData.extractedData.useCases,
    });

    return requestData;
  }
}

// ---------------------------------------------------------------------------
// Extraction helpers (mirrored from workflow.ts for agent encapsulation)
// ---------------------------------------------------------------------------

/**
 * Generates a unique request ID in the MRD-YYYYMMDD-NNNN format.
 */
function generateRequestId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MRD-${date}-${random}`;
}

/**
 * Extracts a short product name from the concept string.
 * Takes the first sentence or the first 50 characters, whichever is shorter.
 */
function extractProductName(concept: string): string {
  const firstSentence = concept.split(/[.!?]/)[0];
  return firstSentence.slice(0, 50).trim() || 'Unnamed Product';
}

/**
 * Infers the product category based on keywords in the concept.
 */
function inferProductCategory(concept: string): RequestData['productConcept']['category'] {
  const lower = concept.toLowerCase();
  if (lower.includes('enclosure') || lower.includes('case')) return 'enclosure';
  if (lower.includes('mount') || lower.includes('mounting')) return 'mount';
  if (lower.includes('stand') || lower.includes('kiosk')) return 'stand';
  if (lower.includes('lock') || lower.includes('security')) return 'lock';
  if (lower.includes('charg') || lower.includes('power')) return 'charging';
  if (lower.includes('app') || lower.includes('software') || lower.includes('platform')) return 'software';
  return 'other';
}

/**
 * Infers target market verticals from the market description string.
 */
function inferTargetMarkets(market: string): RequestData['extractedData']['targetMarkets'] {
  const lower = market.toLowerCase();
  const markets: RequestData['extractedData']['targetMarkets'] = [];

  if (lower.includes('retail') || lower.includes('store')) markets.push('Retail');
  if (lower.includes('hotel') || lower.includes('hospitality') || lower.includes('restaurant')) markets.push('Hospitality');
  if (lower.includes('health') || lower.includes('hospital') || lower.includes('medical')) markets.push('Healthcare');
  if (lower.includes('corporate') || lower.includes('enterprise') || lower.includes('office')) markets.push('Corporate');
  if (lower.includes('school') || lower.includes('education') || lower.includes('university')) markets.push('Education');
  if (lower.includes('government') || lower.includes('public')) markets.push('Government');

  return markets.length > 0 ? markets : ['Other'];
}

/**
 * Extracts use-case labels from the combined concept and details text.
 */
function extractUseCases(concept: string, details?: string | null): string[] {
  const useCases: string[] = [];
  const text = `${concept} ${details || ''}`.toLowerCase();

  if (text.includes('check-in') || text.includes('checkin')) useCases.push('Self-service check-in');
  if (text.includes('display') || text.includes('signage')) useCases.push('Digital signage');
  if (text.includes('point of sale') || text.includes('pos') || text.includes('payment')) useCases.push('Point of sale');
  if (text.includes('inventory') || text.includes('stock')) useCases.push('Inventory management');
  if (text.includes('survey') || text.includes('feedback')) useCases.push('Customer feedback');

  return useCases;
}

/**
 * Extracts a price target if a dollar-sign amount appears in the details.
 */
function extractTargetPrice(details?: string | null): RequestData['extractedData']['targetPrice'] {
  if (!details) return null;

  const priceMatch = details.match(/\$\s*([\d,]+)/);
  if (priceMatch) {
    return {
      value: parseInt(priceMatch[1].replace(/,/g, ''), 10),
      type: 'approximate',
      min: null,
      max: null,
      currency: 'USD',
    };
  }

  return null;
}

/**
 * Extracts technical requirements (device compatibility, VESA, materials)
 * from the details string.
 */
function extractTechnicalRequirements(details?: string | null): RequestData['extractedData']['technicalRequirements'] {
  const requirements: RequestData['extractedData']['technicalRequirements'] = {
    deviceCompatibility: [],
    vesaPattern: null,
    materials: [],
    other: [],
  };

  if (!details) return requirements;

  const lower = details.toLowerCase();

  // Device detection
  if (lower.includes('ipad')) requirements.deviceCompatibility.push('iPad');
  if (lower.includes('android')) requirements.deviceCompatibility.push('Android tablet');
  if (lower.includes('surface')) requirements.deviceCompatibility.push('Surface');

  // VESA detection
  const vesaMatch = lower.match(/vesa\s*(\d+)\s*x?\s*(\d+)?/);
  if (vesaMatch) {
    requirements.vesaPattern = `${vesaMatch[1]}x${vesaMatch[2] || vesaMatch[1]}`;
  }

  // Material detection
  if (lower.includes('aluminum') || lower.includes('aluminium')) requirements.materials.push('Aluminum');
  if (lower.includes('steel')) requirements.materials.push('Steel');
  if (lower.includes('plastic')) requirements.materials.push('Plastic');

  return requirements;
}
