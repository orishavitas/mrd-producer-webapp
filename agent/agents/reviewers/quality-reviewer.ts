/**
 * Quality Reviewer Agent
 *
 * Validates MRD quality before delivery.
 * Checks for:
 * - All required sections present
 * - Content specificity and depth
 * - Proper formatting and structure
 * - Source citations
 * - Technical accuracy
 *
 * Returns a quality score and detailed feedback.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';

/**
 * Input for quality review.
 */
export interface QualityReviewInput {
  /** The MRD content to review (markdown). */
  mrdContent: string;
  /** Sources used in the MRD. */
  sources: Array<{ title: string; url: string }>;
  /** Request ID for tracking. */
  requestId: string;
  /** Original product concept for context. */
  productConcept?: string;
  /** Original target market for context. */
  targetMarket?: string;
}

/**
 * Quality dimensions for MRD assessment.
 */
export interface QualityDimensions {
  /** Completeness: all sections present (0-100). */
  completeness: number;
  /** Specificity: concrete details vs. generic statements (0-100). */
  specificity: number;
  /** Structure: proper formatting and organization (0-100). */
  structure: number;
  /** Research: effective use of sources (0-100). */
  research: number;
  /** Technical: accuracy of technical details (0-100). */
  technical: number;
}

/**
 * Section-level quality feedback.
 */
export interface SectionQuality {
  /** Section number. */
  section: number;
  /** Section name. */
  name: string;
  /** Present in the document. */
  present: boolean;
  /** Quality score for this section (0-100). */
  score: number;
  /** Issues found in this section. */
  issues: string[];
  /** Strengths of this section. */
  strengths: string[];
}

/**
 * Output from quality review.
 */
export interface QualityReviewOutput {
  /** Overall quality score (0-100). */
  overallScore: number;
  /** Pass/fail based on minimum threshold. */
  passed: boolean;
  /** Quality scores by dimension. */
  dimensions: QualityDimensions;
  /** Section-by-section feedback. */
  sections: SectionQuality[];
  /** Critical issues that must be addressed. */
  criticalIssues: string[];
  /** Suggestions for improvement. */
  suggestions: string[];
  /** Positive aspects worth noting. */
  strengths: string[];
}

/**
 * Expected MRD sections.
 */
const REQUIRED_SECTIONS = [
  { number: 1, name: 'Purpose & Vision', pattern: /##\s*1\.\s*Purpose\s*&\s*Vision/i },
  { number: 2, name: 'Problem Statement', pattern: /##\s*2\.\s*Problem\s+Statement/i },
  { number: 3, name: 'Target Market & Use Cases', pattern: /##\s*3\.\s*Target\s+Market/i },
  { number: 4, name: 'Target Users', pattern: /##\s*4\.\s*Target\s+Users/i },
  { number: 5, name: 'Product Description', pattern: /##\s*5\.\s*Product\s+Description/i },
  { number: 6, name: 'Key Requirements', pattern: /##\s*6\.\s*Key\s+Requirements/i },
  { number: 7, name: 'Design & Aesthetics', pattern: /##\s*7\.\s*Design\s*&\s*Aesthetics/i },
  { number: 8, name: 'Target Price', pattern: /##\s*8\.\s*Target\s+Price/i },
  { number: 9, name: 'Risks and Thoughts', pattern: /##\s*9\.\s*Risks\s+and\s+Thoughts/i },
  { number: 10, name: 'Competition to review', pattern: /##\s*10\.\s*Competition/i },
  {
    number: 11,
    name: 'Additional Considerations',
    pattern: /##\s*11\.\s*Additional\s+Considerations/i,
  },
  { number: 12, name: 'Success Criteria', pattern: /##\s*12\.\s*Success\s+Criteria/i },
];

export class QualityReviewer extends BaseAgent<QualityReviewInput, QualityReviewOutput> {
  readonly id = 'quality-reviewer';
  readonly name = 'Quality Reviewer';
  readonly version = '1.0.0';
  readonly description =
    'Reviews MRD quality, checking completeness, specificity, structure, and research integration';

  // Minimum passing score (configurable)
  private readonly passingScore = 70;

  validateInput(input: QualityReviewInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.mrdContent || typeof input.mrdContent !== 'string') {
      errors.push('mrdContent is required and must be a string');
    }

    if (!Array.isArray(input.sources)) {
      errors.push('sources must be an array');
    }

    if (!input.requestId || typeof input.requestId !== 'string') {
      errors.push('requestId is required');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  protected async executeCore(
    input: QualityReviewInput,
    context: ExecutionContext
  ): Promise<QualityReviewOutput> {
    context.log('info', `[${this.id}] Starting quality review`, {
      contentLength: input.mrdContent.length,
      sourcesCount: input.sources.length,
    });

    // Perform quality checks
    const sections = this.checkSections(input.mrdContent);
    const completeness = this.assessCompleteness(sections);
    const specificity = this.assessSpecificity(input.mrdContent);
    const structure = this.assessStructure(input.mrdContent);
    const research = this.assessResearch(input.mrdContent, input.sources);
    const technical = this.assessTechnical(input.mrdContent);

    const dimensions: QualityDimensions = {
      completeness,
      specificity,
      structure,
      research,
      technical,
    };

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      completeness * 0.25 +
        specificity * 0.25 +
        structure * 0.15 +
        research * 0.2 +
        technical * 0.15
    );

    // Collect issues and suggestions
    const criticalIssues = this.collectCriticalIssues(sections, dimensions);
    const suggestions = this.generateSuggestions(dimensions, sections);
    const strengths = this.identifyStrengths(dimensions, input.mrdContent);

    const passed = overallScore >= this.passingScore && criticalIssues.length === 0;

    context.log('info', `[${this.id}] Quality review complete`, {
      overallScore,
      passed,
      criticalIssues: criticalIssues.length,
    });

    return {
      overallScore,
      passed,
      dimensions,
      sections,
      criticalIssues,
      suggestions,
      strengths,
    };
  }

  /**
   * Check which sections are present and assess their quality.
   */
  private checkSections(content: string): SectionQuality[] {
    return REQUIRED_SECTIONS.map((section) => {
      const present = section.pattern.test(content);

      if (!present) {
        return {
          section: section.number,
          name: section.name,
          present: false,
          score: 0,
          issues: ['Section is missing'],
          strengths: [],
        };
      }

      // Extract section content
      const sectionContent = this.extractSectionContent(content, section.number);
      const score = this.scoreSectionContent(sectionContent, section.number);
      const issues = this.findSectionIssues(sectionContent, section.number);
      const strengths = this.findSectionStrengths(sectionContent, section.number);

      return {
        section: section.number,
        name: section.name,
        present: true,
        score,
        issues,
        strengths,
      };
    });
  }

  /**
   * Extract content between section heading and next heading.
   */
  private extractSectionContent(content: string, sectionNum: number): string {
    const currentPattern = new RegExp(`##\\s*${sectionNum}\\.\\s*[^\\n]+\\n`, 'i');
    const nextPattern = new RegExp(`##\\s*${sectionNum + 1}\\.\\s*[^\\n]+`, 'i');

    const startMatch = content.match(currentPattern);
    if (!startMatch) return '';

    const startIndex = content.indexOf(startMatch[0]) + startMatch[0].length;
    const nextMatch = content.slice(startIndex).match(nextPattern);

    if (nextMatch) {
      const endIndex = startIndex + content.slice(startIndex).indexOf(nextMatch[0]);
      return content.slice(startIndex, endIndex).trim();
    }

    return content.slice(startIndex).trim();
  }

  /**
   * Score section content quality.
   */
  private scoreSectionContent(content: string, sectionNum: number): number {
    if (!content || content.length < 50) return 20;

    let score = 50; // Base score for presence

    // Check for bullet points (expected in most sections)
    if ([2, 3, 4, 6, 7, 10, 11, 12].includes(sectionNum)) {
      if (content.includes('*') || content.includes('-')) {
        score += 15;
      }
    }

    // Check for bold formatting (indicates emphasis on key points)
    if (content.includes('**')) {
      score += 10;
    }

    // Check for specific details (numbers, measurements, etc.)
    if (/\d+/.test(content)) {
      score += 10;
    }

    // Check for adequate length
    if (content.length > 200) {
      score += 10;
    }
    if (content.length > 500) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Find issues in section content.
   */
  private findSectionIssues(content: string, sectionNum: number): string[] {
    const issues: string[] = [];

    if (content.length < 100) {
      issues.push('Content is too brief - needs more detail');
    }

    // Check for generic placeholder text
    if (
      content.includes('TBD') ||
      content.includes('TODO') ||
      content.includes('[insert') ||
      content.includes('placeholder')
    ) {
      issues.push('Contains placeholder text that should be replaced');
    }

    // Section-specific checks
    if (sectionNum === 8 && !content.includes('$')) {
      issues.push('Target price should include dollar amount');
    }

    if (sectionNum === 10 && !content.includes('http')) {
      issues.push('Competition section should include URLs');
    }

    if ([3, 6].includes(sectionNum) && !content.includes('###')) {
      issues.push('Expected to have subsections (H3 headings)');
    }

    return issues;
  }

  /**
   * Find strengths in section content.
   */
  private findSectionStrengths(content: string, sectionNum: number): string[] {
    const strengths: string[] = [];

    if (content.length > 500) {
      strengths.push('Comprehensive content with good detail');
    }

    if (content.includes('**') && content.split('**').length > 6) {
      strengths.push('Good use of emphasis on key points');
    }

    if (sectionNum === 10 && content.includes('http')) {
      strengths.push('Includes competitor URLs for reference');
    }

    if ([6, 11].includes(sectionNum) && content.includes('**') && content.includes(':')) {
      strengths.push('Well-structured with labeled categories');
    }

    return strengths;
  }

  /**
   * Assess overall completeness.
   */
  private assessCompleteness(sections: SectionQuality[]): number {
    const presentCount = sections.filter((s) => s.present).length;
    const totalCount = sections.length;
    return Math.round((presentCount / totalCount) * 100);
  }

  /**
   * Assess specificity (concrete vs. generic).
   */
  private assessSpecificity(content: string): number {
    let score = 50; // Base score

    // Check for specific measurements
    const measurements = content.match(/\d+\s*(cm|mm|inch|"|kg|lbs|ft)/gi);
    if (measurements && measurements.length > 5) {
      score += 15;
    }

    // Check for specific product names/brands
    const brands = content.match(/iPad|Surface|Android|VESA|Kensington|ADA/gi);
    if (brands && brands.length > 3) {
      score += 10;
    }

    // Check for specific numbers (prices, quantities, percentages)
    const numbers = content.match(/\$\d+|[\d.]+%|\d+\s*units?/gi);
    if (numbers && numbers.length > 3) {
      score += 10;
    }

    // Penalize generic phrases
    const genericPhrases = content.match(/various|multiple|several|some|many/gi);
    if (genericPhrases && genericPhrases.length > 10) {
      score -= 10;
    }

    // Check for concrete examples
    if (content.includes('e.g.,') || content.includes('such as')) {
      score += 5;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Assess structure and formatting.
   */
  private assessStructure(content: string): number {
    let score = 50; // Base score

    // Check for proper heading hierarchy
    const h2Count = (content.match(/^##\s/gm) || []).length;
    if (h2Count >= 12) {
      score += 15;
    }

    // Check for horizontal rules between sections
    const hrCount = (content.match(/^---$/gm) || []).length;
    if (hrCount >= 10) {
      score += 10;
    }

    // Check for bullet lists
    const bulletCount = (content.match(/^\*\s/gm) || []).length;
    if (bulletCount >= 20) {
      score += 10;
    }

    // Check for proper spacing (blank lines)
    const hasGoodSpacing = content.includes('\n\n');
    if (hasGoodSpacing) {
      score += 10;
    }

    // Penalize walls of text
    const longParagraphs = content.match(/[^\n]{500,}/g);
    if (longParagraphs && longParagraphs.length > 3) {
      score -= 10;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Assess research integration.
   */
  private assessResearch(content: string, sources: Array<{ title: string; url: string }>): number {
    let score = 40; // Base score

    if (sources.length === 0) {
      return 30; // Low score if no sources
    }

    // Award points for number of sources
    if (sources.length >= 3) score += 20;
    else if (sources.length >= 1) score += 10;

    // Check if sources are referenced in content
    const urlsInContent = (content.match(/https?:\/\/[^\s)]+/g) || []).length;
    if (urlsInContent >= 3) {
      score += 20;
    } else if (urlsInContent >= 1) {
      score += 10;
    }

    // Check for research-driven content
    if (content.includes('according to') || content.includes('research shows')) {
      score += 10;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Assess technical accuracy (basic heuristics).
   */
  private assessTechnical(content: string): number {
    let score = 60; // Base score (neutral)

    // Check for technical specifications
    const hasMeasurements = /\d+\s*(cm|mm|inch|kg|lbs)/.test(content);
    if (hasMeasurements) score += 10;

    // Check for technical standards
    const hasStandards = /VESA|ADA|ANSI|BIFMA|UL|CE/.test(content);
    if (hasStandards) score += 10;

    // Check for specific technical terms
    const hasTechTerms =
      /telescopic|mounting|compatibility|load capacity|durability/.test(content);
    if (hasTechTerms) score += 10;

    // Penalize obvious errors (TBD, missing units, etc.)
    if (content.includes('TBD') || content.includes('TODO')) {
      score -= 15;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Collect critical issues that must be fixed.
   */
  private collectCriticalIssues(
    sections: SectionQuality[],
    dimensions: QualityDimensions
  ): string[] {
    const issues: string[] = [];

    // Missing sections
    const missingSections = sections.filter((s) => !s.present);
    if (missingSections.length > 0) {
      issues.push(
        `Missing ${missingSections.length} required section(s): ${missingSections
          .map((s) => s.name)
          .join(', ')}`
      );
    }

    // Very low scores
    if (dimensions.completeness < 50) {
      issues.push('Document is incomplete - less than 50% of sections present');
    }

    if (dimensions.specificity < 40) {
      issues.push('Content is too generic - needs more specific details and measurements');
    }

    return issues;
  }

  /**
   * Generate improvement suggestions.
   */
  private generateSuggestions(
    dimensions: QualityDimensions,
    sections: SectionQuality[]
  ): string[] {
    const suggestions: string[] = [];

    if (dimensions.specificity < 70) {
      suggestions.push(
        'Add more specific measurements, product names, and concrete examples'
      );
    }

    if (dimensions.research < 60) {
      suggestions.push('Better integrate research findings and cite sources more explicitly');
    }

    if (dimensions.technical < 70) {
      suggestions.push(
        'Include more technical specifications, standards, and measurable requirements'
      );
    }

    if (dimensions.structure < 70) {
      suggestions.push('Improve formatting with proper headings, bullet points, and spacing');
    }

    // Section-specific suggestions
    const lowScoreSections = sections.filter((s) => s.present && s.score < 60);
    if (lowScoreSections.length > 0) {
      suggestions.push(
        `Expand these sections with more detail: ${lowScoreSections.map((s) => s.name).join(', ')}`
      );
    }

    return suggestions;
  }

  /**
   * Identify document strengths.
   */
  private identifyStrengths(dimensions: QualityDimensions, content: string): string[] {
    const strengths: string[] = [];

    if (dimensions.completeness >= 90) {
      strengths.push('All required sections are present');
    }

    if (dimensions.specificity >= 75) {
      strengths.push('Content includes specific, measurable details');
    }

    if (dimensions.research >= 75) {
      strengths.push('Effective integration of research findings');
    }

    if (dimensions.structure >= 80) {
      strengths.push('Well-structured with clear formatting');
    }

    if (content.length > 5000) {
      strengths.push('Comprehensive document with substantial detail');
    }

    return strengths;
  }
}
