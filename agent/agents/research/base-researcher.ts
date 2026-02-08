/**
 * Base Researcher Agent
 *
 * Abstract base class for all research agents. Provides common functionality
 * for web search-based research, including:
 * - Building research prompts with focus areas
 * - Parsing AI responses with source citations
 * - Extracting structured data from grounded search results
 * - Validating research quality
 *
 * Research agents use the provider's generateWithSearch capability to perform
 * web searches and gather up-to-date information.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities, GroundedSource } from '@/lib/providers/types';

/**
 * Common input structure for all research agents.
 */
export interface ResearchInput {
  /** Product concept to research */
  productConcept: string;
  /** Target market information */
  targetMarket: string;
  /** Optional context for focused research */
  additionalContext?: string;
  /** Specific queries to guide research (optional) */
  guidingQueries?: string[];
}

/**
 * Common output structure for research results.
 */
export interface ResearchOutput<T = unknown> {
  /** Research ID for tracking */
  researchId: string;
  /** When the research was conducted */
  conductedAt: string;
  /** Type of research performed */
  researchType: string;
  /** Structured research data (agent-specific) */
  data: T;
  /** Source citations from grounded search */
  sources: GroundedSource[];
  /** Search queries used */
  searchQueries: string[];
  /** Quality assessment */
  quality: {
    /** Confidence score (0-1) */
    confidence: number;
    /** Whether minimum requirements were met */
    meetsMinimum: boolean;
    /** Identified gaps or limitations */
    gaps: string[];
  };
}

/**
 * Abstract base class for research agents.
 * Extends BaseAgent with research-specific functionality.
 */
export abstract class BaseResearcherAgent<T = unknown> extends BaseAgent<
  ResearchInput,
  ResearchOutput<T>
> {
  /**
   * Research type identifier (e.g., 'competitor', 'trend', 'pricing')
   */
  abstract readonly researchType: string;

  /**
   * Focus areas for this type of research.
   * Guides prompt construction and validation.
   */
  abstract readonly focusAreas: string[];

  /**
   * Minimum number of sources required for quality research.
   */
  abstract readonly minSourcesRequired: number;

  /**
   * All research agents require search grounding capability.
   */
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'searchGrounding',
  ];

  // -----------------------------------------------------------------------
  // Abstract methods - must be implemented by subclasses
  // -----------------------------------------------------------------------

  /**
   * Build the research prompt for the AI provider.
   * Should incorporate focus areas and product context.
   */
  protected abstract buildResearchPrompt(input: ResearchInput): string;

  /**
   * Parse the AI response into structured data.
   * Extract relevant information based on research type.
   */
  protected abstract parseResearchData(
    responseText: string,
    sources: GroundedSource[]
  ): T;

  /**
   * Assess the quality of research results.
   * Check if minimum requirements are met.
   */
  protected abstract assessQuality(
    data: T,
    sources: GroundedSource[]
  ): {
    confidence: number;
    meetsMinimum: boolean;
    gaps: string[];
  };

  // -----------------------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------------------

  validateInput(input: ResearchInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (
      !input.productConcept ||
      typeof input.productConcept !== 'string' ||
      input.productConcept.trim().length === 0
    ) {
      errors.push('productConcept is required and must be a non-empty string');
    }

    if (
      !input.targetMarket ||
      typeof input.targetMarket !== 'string' ||
      input.targetMarket.trim().length === 0
    ) {
      errors.push('targetMarket is required and must be a non-empty string');
    }

    if (
      input.additionalContext !== undefined &&
      typeof input.additionalContext !== 'string'
    ) {
      errors.push('additionalContext must be a string when provided');
    }

    if (
      input.guidingQueries !== undefined &&
      (!Array.isArray(input.guidingQueries) ||
        input.guidingQueries.some((q) => typeof q !== 'string'))
    ) {
      errors.push('guidingQueries must be an array of strings when provided');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: ResearchInput,
    context: ExecutionContext
  ): Promise<ResearchOutput<T>> {
    context.log('info', `[${this.id}] Starting ${this.researchType} research`, {
      focusAreas: this.focusAreas,
    });

    const provider = context.getProvider();

    // Check if provider supports search grounding
    if (!provider.capabilities.searchGrounding) {
      throw new Error(
        `Provider ${provider.name} does not support search grounding, which is required for ${this.researchType} research`
      );
    }

    if (!provider.generateWithSearch) {
      throw new Error(
        `Provider ${provider.name} does not implement generateWithSearch method`
      );
    }

    // Build the research prompt
    const prompt = this.buildResearchPrompt(input);
    const systemPrompt = this.buildSystemPrompt();

    context.log('debug', `[${this.id}] Executing grounded search`, {
      promptLength: prompt.length,
    });

    // Execute grounded search
    const response = await provider.generateWithSearch(prompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    context.log('info', `[${this.id}] Grounded search completed`, {
      sourcesFound: response.sources?.length ?? 0,
      queriesUsed: response.searchQueries?.length ?? 0,
    });

    // Parse the research data
    const sources = response.sources || [];
    const data = this.parseResearchData(response.text, sources);

    // Assess quality
    const quality = this.assessQuality(data, sources);

    context.log('info', `[${this.id}] Research quality assessment`, {
      confidence: quality.confidence,
      meetsMinimum: quality.meetsMinimum,
      gapsCount: quality.gaps.length,
    });

    // Generate research ID
    const researchId = `${this.researchType}-${Date.now()}`;

    return {
      researchId,
      conductedAt: new Date().toISOString(),
      researchType: this.researchType,
      data,
      sources,
      searchQueries: response.searchQueries || [],
      quality,
    };
  }

  // -----------------------------------------------------------------------
  // Helper methods
  // -----------------------------------------------------------------------

  /**
   * Build the system prompt for research agents.
   * Can be overridden by subclasses for specialized instructions.
   */
  protected buildSystemPrompt(): string {
    return `You are a professional market research analyst specializing in ${this.researchType} research.

Your task is to conduct thorough research on the given product concept and provide detailed, actionable insights.

Focus areas for this research:
${this.focusAreas.map((area) => `- ${area}`).join('\n')}

Requirements:
1. Conduct comprehensive web searches to find current, accurate information
2. Cite all sources with URLs
3. Provide specific, quantitative data where possible
4. Identify trends and patterns
5. Be objective and evidence-based
6. Highlight any gaps or limitations in available data

Format your response clearly with structured sections.`;
  }

  /**
   * Extract sources from a text response if not provided separately.
   * Looks for markdown links and citations.
   */
  protected extractSourcesFromText(text: string): GroundedSource[] {
    const sources: GroundedSource[] = [];
    const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const [, title, url] = match;
      if (url.startsWith('http')) {
        sources.push({ title, url });
      }
    }

    return sources;
  }

  /**
   * Parse JSON from a text response that may contain markdown code blocks.
   */
  protected parseJsonFromText<T>(text: string): T | null {
    try {
      // First try direct parsing
      return JSON.parse(text) as T;
    } catch {
      // Try extracting from markdown code block
      const codeBlockMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Calculate confidence score based on source count and quality indicators.
   */
  protected calculateConfidence(
    sourceCount: number,
    hasQuantitativeData: boolean,
    hasRecentData: boolean
  ): number {
    let confidence = 0;

    // Source count contribution (up to 0.5)
    confidence += Math.min(sourceCount / this.minSourcesRequired, 1.0) * 0.5;

    // Quantitative data contribution (0.25)
    if (hasQuantitativeData) {
      confidence += 0.25;
    }

    // Recency contribution (0.25)
    if (hasRecentData) {
      confidence += 0.25;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate guiding queries for focused research.
   * Can be used to supplement user-provided queries.
   */
  protected generateDefaultQueries(input: ResearchInput): string[] {
    return [
      `${input.productConcept} ${this.researchType} analysis`,
      `${input.targetMarket} ${input.productConcept} market research`,
      ...this.focusAreas.map(
        (area) => `${input.productConcept} ${area} ${input.targetMarket}`
      ),
    ];
  }
}
