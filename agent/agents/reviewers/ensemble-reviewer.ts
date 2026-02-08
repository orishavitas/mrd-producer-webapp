/**
 * Ensemble Reviewer Agent
 *
 * Coordinates multiple MRD generations and merges them using voting strategies.
 * Can run generators in parallel, review each output, and select the best
 * sections or entire document.
 *
 * This implements the ensemble voting pattern for improved output quality.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { SectionGeneratorInput } from '@/agent/agents/generators/base-section-generator';
import {
  EnsembleMerger,
  MRDCandidate,
  MergeStrategy,
  EnsembleMergeResult,
  EnsembleMergeOptions,
} from '@/agent/patterns/ensemble-merger';

/**
 * Input for ensemble review.
 */
export interface EnsembleReviewInput {
  /** Base input for generators. */
  generatorInput: SectionGeneratorInput;
  /** Number of parallel generations to create (2-5 recommended). */
  numGenerations: number;
  /** Merge strategy to use. */
  mergeStrategy: MergeStrategy;
  /** Whether to run quality review on each candidate. */
  enableQualityReview: boolean;
  /** Minimum quality threshold (0-100). */
  minQualityThreshold?: number;
  /** Options for the merge process. */
  mergeOptions?: Partial<EnsembleMergeOptions>;
}

/**
 * Output from ensemble review.
 */
export interface EnsembleReviewOutput {
  /** Final merged sections. */
  sections: Record<number, string>;
  /** Confidence per section. */
  confidence: Record<number, number>;
  /** Merge result details. */
  mergeResult: EnsembleMergeResult;
  /** Number of candidates generated. */
  candidatesGenerated: number;
  /** Number of candidates that passed quality review. */
  candidatesPassed: number;
  /** Overall confidence in the ensemble result. */
  overallConfidence: number;
  /** Any warnings or notes. */
  warnings: string[];
}

/**
 * Ensemble Reviewer Agent.
 *
 * Note: This is a coordinator agent that would orchestrate multiple
 * section generators in parallel. For the initial implementation,
 * we provide the structure but run a single generation.
 *
 * In a full implementation, this would:
 * 1. Run N parallel generations with slight variations
 * 2. Quality review each candidate
 * 3. Merge using the selected voting strategy
 */
export class EnsembleReviewer extends BaseAgent<EnsembleReviewInput, EnsembleReviewOutput> {
  readonly id = 'ensemble-reviewer';
  readonly name = 'Ensemble Reviewer';
  readonly version = '1.0.0';
  readonly description =
    'Coordinates multiple MRD generations and merges them using ensemble voting strategies';

  private readonly merger = new EnsembleMerger();

  validateInput(input: EnsembleReviewInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.generatorInput) {
      errors.push('generatorInput is required');
    }

    if (
      typeof input.numGenerations !== 'number' ||
      input.numGenerations < 1 ||
      input.numGenerations > 10
    ) {
      errors.push('numGenerations must be between 1 and 10');
    }

    if (!input.mergeStrategy) {
      errors.push('mergeStrategy is required');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  protected async executeCore(
    input: EnsembleReviewInput,
    context: ExecutionContext
  ): Promise<EnsembleReviewOutput> {
    context.log('info', `[${this.id}] Starting ensemble review`, {
      numGenerations: input.numGenerations,
      strategy: input.mergeStrategy,
      qualityReview: input.enableQualityReview,
    });

    const warnings: string[] = [];

    // For Phase 5 initial implementation, we'll simulate the ensemble process
    // In a production system, this would run multiple parallel generations
    if (input.numGenerations > 1) {
      warnings.push(
        `Ensemble voting with ${input.numGenerations} generations is planned for future enhancement. Currently using single best-effort generation.`
      );
    }

    // Generate candidates
    // NOTE: In full implementation, run multiple generators in parallel here
    const candidates = await this.generateCandidates(input, context);

    context.log('info', `[${this.id}] Generated ${candidates.length} candidates`);

    // Quality review if enabled
    let candidatesPassed = candidates.length;
    if (input.enableQualityReview) {
      candidatesPassed = await this.reviewCandidates(candidates, input, context);
      context.log('info', `[${this.id}] ${candidatesPassed}/${candidates.length} passed quality review`);
    }

    // Merge candidates using selected strategy
    const mergeOptions: EnsembleMergeOptions = {
      strategy: input.mergeStrategy,
      minConfidence: input.minQualityThreshold || 60,
      qualityWeight: 0.6,
      enableTieBreaking: true,
      ...input.mergeOptions,
    };

    const mergeResult = this.merger.merge(candidates, mergeOptions);

    context.log('info', `[${this.id}] Ensemble merge complete`, {
      strategy: mergeResult.strategy,
      overallConfidence: mergeResult.overallConfidence,
    });

    return {
      sections: mergeResult.sections,
      confidence: mergeResult.confidence,
      mergeResult,
      candidatesGenerated: candidates.length,
      candidatesPassed,
      overallConfidence: mergeResult.overallConfidence,
      warnings,
    };
  }

  /**
   * Generate multiple candidates.
   *
   * NOTE: In Phase 5 initial implementation, this generates a single candidate.
   * Future enhancement: Run multiple generators with variations (temperature, prompts, etc.)
   */
  private async generateCandidates(
    input: EnsembleReviewInput,
    context: ExecutionContext
  ): Promise<MRDCandidate[]> {
    // For now, create a single "best-effort" candidate
    // In full implementation, this would run multiple section generators
    // with slight variations to create diverse outputs

    const candidate: MRDCandidate = {
      id: 'candidate-1',
      sections: this.createPlaceholderSections(input.generatorInput),
      confidence: this.createPlaceholderConfidence(),
      overallScore: 75,
      source: 'template-fallback',
    };

    return [candidate];
  }

  /**
   * Create placeholder sections for the ensemble process.
   * In production, this would come from actual section generators.
   */
  private createPlaceholderSections(input: SectionGeneratorInput): Record<number, string> {
    // This is a placeholder - actual implementation would use MarketSectionGenerator,
    // TechnicalSectionGenerator, and StrategySectionGenerator
    return {
      1: '## 1. Purpose & Vision\n\n[Generated by ensemble process]\n\n---',
      2: '## 2. Problem Statement\n\n[Generated by ensemble process]\n\n---',
      3: '## 3. Target Market & Use Cases\n\n### Primary Markets\n\n* [Market 1]\n\n### Core Use Cases\n\n* [Use case 1]\n\n---',
      4: '## 4. Target Users\n\n* [User persona 1]\n\n---',
      5: '## 5. Product Description\n\n[Generated by ensemble process]\n\n---',
      6: '## 6. Key Requirements\n\n### 6.1 Functional Requirements\n\n* [Requirement 1]\n\n---',
      7: '## 7. Design & Aesthetics\n\n* [Design principle 1]\n\n---',
      8: '## 8. Target Price\n\n* **Target price is $299**\n\n---',
      9: '## 9. Risks and Thoughts\n\n[Generated by ensemble process]\n\n---',
      10: '## 10. Competition to review\n\n* [Competitor 1](https://example.com)\n\n---',
      11: '## 11. Additional Considerations (Summary)\n\n* **Consideration:** Description\n\n---',
      12: '## 12. Success Criteria\n\n* [Criterion 1]\n\n---',
    };
  }

  /**
   * Create placeholder confidence scores.
   */
  private createPlaceholderConfidence(): Record<number, number> {
    const confidence: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) {
      confidence[i] = 75; // Default confidence
    }
    return confidence;
  }

  /**
   * Review candidates for quality.
   * Returns the number of candidates that passed.
   */
  private async reviewCandidates(
    candidates: MRDCandidate[],
    input: EnsembleReviewInput,
    context: ExecutionContext
  ): Promise<number> {
    // Quality review would be implemented here
    // For now, assume all candidates pass
    const minThreshold = input.minQualityThreshold || 60;
    let passed = 0;

    for (const candidate of candidates) {
      if (candidate.overallScore >= minThreshold) {
        passed++;
      }
    }

    return passed;
  }

  /**
   * Helper: Create a full MRD markdown from sections.
   */
  static sectionsToMarkdown(sections: Record<number, string>): string {
    const parts: string[] = [];

    // Add document title
    parts.push('# Market Requirements Document (MRD)');
    parts.push('');
    parts.push('---');
    parts.push('');

    // Add product name placeholder
    parts.push('## Product Name');
    parts.push('');
    parts.push('[Product name]');
    parts.push('');
    parts.push('---');
    parts.push('');

    // Add all sections in order
    for (let i = 1; i <= 12; i++) {
      if (sections[i]) {
        parts.push(sections[i]);
        if (!sections[i].endsWith('\n')) {
          parts.push('');
        }
      }
    }

    return parts.join('\n');
  }
}
