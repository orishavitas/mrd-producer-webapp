/**
 * Base Section Generator
 *
 * Abstract base class for specialized section generators.
 * Each section generator is responsible for generating specific sections
 * of the MRD document, using domain-specific expertise.
 *
 * This follows the section specialist pattern where multiple domain-specific
 * agents collaborate to produce different parts of the final document.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';

/**
 * Input for section generation.
 * Contains all the information needed to generate specific sections.
 */
export interface SectionGeneratorInput {
  /** Product concept text from the user. */
  productConcept: string;
  /** Target market text from the user. */
  targetMarket: string;
  /** Additional details from the user. */
  additionalDetails?: string;
  /** Research findings from the research stage. */
  researchFindings: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  /** Full research summary text. */
  researchSummary?: string;
  /** Clarification Q&A history. */
  clarifications?: Array<{
    question: string;
    answer: string;
  }>;
  /** Request ID for tracking. */
  requestId: string;
}

/**
 * Output from section generation.
 * Contains the generated sections with confidence scores.
 */
export interface SectionGeneratorOutput {
  /** Map of section numbers to generated markdown content. */
  sections: Record<number, string>;
  /** Confidence score for each section (0-100). */
  confidence: Record<number, number>;
  /** Data sources used for each section. */
  dataSources: Record<number, ('user' | 'research' | 'clarification' | 'inferred')[]>;
  /** Any gaps or limitations noted during generation. */
  gaps: string[];
  /** Domain of this generator (market, technical, strategy). */
  domain: string;
}

/**
 * Abstract base class for section generators.
 *
 * Provides common functionality:
 * - Input validation
 * - Prompt building helpers
 * - Section formatting validation
 * - Confidence scoring
 */
export abstract class BaseSectionGenerator extends BaseAgent<
  SectionGeneratorInput,
  SectionGeneratorOutput
> {
  abstract readonly domain: string;
  abstract readonly sectionRange: [number, number];

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = ['textGeneration'];

  /**
   * Validate common input requirements.
   */
  validateInput(input: SectionGeneratorInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.productConcept || typeof input.productConcept !== 'string') {
      errors.push('productConcept is required and must be a string');
    }

    if (!input.targetMarket || typeof input.targetMarket !== 'string') {
      errors.push('targetMarket is required and must be a string');
    }

    if (!Array.isArray(input.researchFindings)) {
      errors.push('researchFindings must be an array');
    }

    if (!input.requestId || typeof input.requestId !== 'string') {
      errors.push('requestId is required');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  /**
   * Build a context string from research findings.
   */
  protected buildResearchContext(input: SectionGeneratorInput): string {
    const parts: string[] = [];

    if (input.researchSummary) {
      parts.push('=== Research Summary ===');
      parts.push(input.researchSummary);
      parts.push('');
    }

    if (input.researchFindings.length > 0) {
      parts.push('=== Research Sources ===');
      input.researchFindings.forEach((finding, idx) => {
        parts.push(`${idx + 1}. ${finding.title}`);
        parts.push(`   URL: ${finding.url}`);
        parts.push(`   ${finding.snippet}`);
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Build a context string from clarifications.
   */
  protected buildClarificationContext(input: SectionGeneratorInput): string {
    if (!input.clarifications || input.clarifications.length === 0) {
      return '';
    }

    const parts: string[] = ['=== Clarifications ==='];
    input.clarifications.forEach((qa, idx) => {
      parts.push(`Q${idx + 1}: ${qa.question}`);
      parts.push(`A${idx + 1}: ${qa.answer}`);
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Build system prompt for section generation.
   */
  protected buildSystemPrompt(): string {
    return `You are a specialized MRD section generator focused on the ${this.domain} domain.
You generate sections ${this.sectionRange[0]}-${this.sectionRange[1]} of Market Requirements Documents.

Your role is to:
1. Focus on your domain expertise (${this.domain})
2. Generate high-quality, specific, actionable content
3. Use research findings and user input effectively
4. Follow the MRD template format exactly
5. Provide confidence scores for your output

Output only valid JSON following the SectionGeneratorOutput schema.`;
  }

  /**
   * Build the main generation prompt.
   */
  protected buildGenerationPrompt(input: SectionGeneratorInput): string {
    const parts: string[] = [];

    parts.push('# MRD Section Generation Task');
    parts.push('');
    parts.push(`Domain: ${this.domain}`);
    parts.push(`Sections: ${this.sectionRange[0]}-${this.sectionRange[1]}`);
    parts.push('');

    parts.push('## User Input');
    parts.push('');
    parts.push('### Product Concept:');
    parts.push(input.productConcept);
    parts.push('');
    parts.push('### Target Market:');
    parts.push(input.targetMarket);
    parts.push('');

    if (input.additionalDetails) {
      parts.push('### Additional Details:');
      parts.push(input.additionalDetails);
      parts.push('');
    }

    const researchContext = this.buildResearchContext(input);
    if (researchContext) {
      parts.push('## Research Context');
      parts.push('');
      parts.push(researchContext);
    }

    const clarificationContext = this.buildClarificationContext(input);
    if (clarificationContext) {
      parts.push('## Clarifications');
      parts.push('');
      parts.push(clarificationContext);
    }

    parts.push('## Task');
    parts.push('');
    parts.push(this.getTaskDescription());
    parts.push('');

    parts.push('## Output Format');
    parts.push('');
    parts.push('Return a JSON object with:');
    parts.push('- sections: Record<number, string> - Generated markdown for each section');
    parts.push('- confidence: Record<number, number> - Confidence score 0-100 for each section');
    parts.push('- dataSources: Record<number, string[]> - Data sources used: user, research, clarification, inferred');
    parts.push('- gaps: string[] - Any limitations or gaps in the generated content');
    parts.push('- domain: string - Your domain identifier');

    return parts.join('\n');
  }

  /**
   * Get domain-specific task description.
   * Subclasses must override this.
   */
  protected abstract getTaskDescription(): string;

  /**
   * Validate that generated sections match the expected format.
   */
  protected validateSections(sections: Record<number, string>): string[] {
    const errors: string[] = [];
    const [start, end] = this.sectionRange;

    for (let i = start; i <= end; i++) {
      if (!sections[i]) {
        errors.push(`Missing section ${i}`);
      } else if (typeof sections[i] !== 'string') {
        errors.push(`Section ${i} must be a string`);
      } else if (sections[i].trim().length === 0) {
        errors.push(`Section ${i} is empty`);
      }
    }

    return errors;
  }

  /**
   * Parse JSON response from AI provider.
   */
  protected parseResponse(response: string): SectionGeneratorOutput {
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = response.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.sections || typeof parsed.sections !== 'object') {
        throw new Error('Response missing sections object');
      }

      if (!parsed.confidence || typeof parsed.confidence !== 'object') {
        throw new Error('Response missing confidence scores');
      }

      if (!parsed.dataSources || typeof parsed.dataSources !== 'object') {
        throw new Error('Response missing dataSources');
      }

      if (!Array.isArray(parsed.gaps)) {
        parsed.gaps = [];
      }

      if (!parsed.domain) {
        parsed.domain = this.domain;
      }

      // Validate sections
      const sectionErrors = this.validateSections(parsed.sections);
      if (sectionErrors.length > 0) {
        throw new Error(`Section validation failed: ${sectionErrors.join(', ')}`);
      }

      return parsed as SectionGeneratorOutput;
    } catch (error) {
      throw new Error(
        `Failed to parse section generator response: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Generate sections using the template fallback.
   * Used when AI generation fails or is unavailable.
   */
  protected abstract generateTemplateSections(
    input: SectionGeneratorInput
  ): SectionGeneratorOutput;

  /**
   * Core execution - delegates to AI or template.
   */
  protected async executeCore(
    input: SectionGeneratorInput,
    context: ExecutionContext
  ): Promise<SectionGeneratorOutput> {
    context.log('info', `[${this.id}] Generating sections ${this.sectionRange[0]}-${this.sectionRange[1]}`, {
      domain: this.domain,
      hasResearch: input.researchFindings.length > 0,
      hasClarifications: (input.clarifications?.length || 0) > 0,
    });

    try {
      const provider = context.getProvider();
      const systemPrompt = this.buildSystemPrompt();
      const generationPrompt = this.buildGenerationPrompt(input);

      const response = await provider.generateText(generationPrompt, systemPrompt);
      const output = this.parseResponse(response.text);

      context.log('info', `[${this.id}] Section generation complete`, {
        sectionsGenerated: Object.keys(output.sections).length,
        avgConfidence:
          Object.values(output.confidence).reduce((a, b) => a + b, 0) /
          Object.keys(output.confidence).length,
      });

      return output;
    } catch (error) {
      context.log('warn', `[${this.id}] AI generation failed, using template fallback`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return this.generateTemplateSections(input);
    }
  }
}
