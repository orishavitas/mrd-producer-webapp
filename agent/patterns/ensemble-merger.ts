/**
 * Ensemble Merger
 *
 * Implements strategies for merging multiple MRD generations into a single
 * high-quality output. Supports different voting and selection strategies.
 *
 * This pattern is used when multiple generators produce the same sections
 * and we need to select or combine the best outputs.
 */

import { SectionGeneratorOutput } from '@/agent/agents/generators/base-section-generator';
import { QualityReviewOutput } from '@/agent/agents/reviewers/quality-reviewer';

/**
 * A candidate MRD generation with its quality assessment.
 */
export interface MRDCandidate {
  /** Unique identifier for this candidate. */
  id: string;
  /** Generated sections. */
  sections: Record<number, string>;
  /** Confidence scores per section. */
  confidence: Record<number, number>;
  /** Quality review results (optional). */
  qualityReview?: QualityReviewOutput;
  /** Overall score for ranking. */
  overallScore: number;
  /** Generator or source of this candidate. */
  source: string;
}

/**
 * Merge strategy options.
 */
export type MergeStrategy =
  | 'best-of-n' // Select the single best candidate
  | 'section-voting' // Vote on each section independently
  | 'confidence-weighted' // Weight by confidence scores
  | 'quality-weighted'; // Weight by quality scores

/**
 * Voting result for a single section.
 */
export interface SectionVote {
  /** Section number. */
  sectionNumber: number;
  /** Winning content. */
  winningContent: string;
  /** Winning candidate ID. */
  winnerId: string;
  /** Vote tallies by candidate ID. */
  votes: Record<string, number>;
  /** Confidence in the vote. */
  confidence: number;
}

/**
 * Result of ensemble merging.
 */
export interface EnsembleMergeResult {
  /** Merged sections. */
  sections: Record<number, string>;
  /** Confidence per section. */
  confidence: Record<number, number>;
  /** Strategy used for merging. */
  strategy: MergeStrategy;
  /** Which candidate won overall or per section. */
  winners: Record<number, string>;
  /** Voting details (for transparency). */
  votingDetails?: SectionVote[];
  /** Overall confidence in the merge. */
  overallConfidence: number;
}

/**
 * Options for ensemble merging.
 */
export interface EnsembleMergeOptions {
  /** Merge strategy to use. */
  strategy: MergeStrategy;
  /** Minimum confidence threshold (0-100). */
  minConfidence?: number;
  /** Weight for quality scores vs. confidence. */
  qualityWeight?: number;
  /** Enable tie-breaking rules. */
  enableTieBreaking?: boolean;
}

/**
 * Ensemble Merger - merges multiple MRD candidates.
 */
export class EnsembleMerger {
  /**
   * Merge multiple candidates using the specified strategy.
   */
  merge(candidates: MRDCandidate[], options: EnsembleMergeOptions): EnsembleMergeResult {
    if (candidates.length === 0) {
      throw new Error('Cannot merge empty candidate list');
    }

    // Validate strategy first
    const validStrategies: MergeStrategy[] = [
      'best-of-n',
      'section-voting',
      'confidence-weighted',
      'quality-weighted',
    ];
    if (!validStrategies.includes(options.strategy)) {
      throw new Error(`Unknown merge strategy: ${options.strategy}`);
    }

    if (candidates.length === 1) {
      // Single candidate - return as-is
      return {
        sections: candidates[0].sections,
        confidence: candidates[0].confidence,
        strategy: options.strategy,
        winners: this.createWinnersMap(candidates[0]),
        overallConfidence: candidates[0].overallScore,
      };
    }

    // Dispatch to strategy-specific merger
    switch (options.strategy) {
      case 'best-of-n':
        return this.mergeBestOfN(candidates, options);
      case 'section-voting':
        return this.mergeSectionVoting(candidates, options);
      case 'confidence-weighted':
        return this.mergeConfidenceWeighted(candidates, options);
      case 'quality-weighted':
        return this.mergeQualityWeighted(candidates, options);
      default:
        throw new Error(`Unknown merge strategy: ${options.strategy}`);
    }
  }

  /**
   * Best-of-N: Select the single best candidate overall.
   */
  private mergeBestOfN(
    candidates: MRDCandidate[],
    options: EnsembleMergeOptions
  ): EnsembleMergeResult {
    // Sort candidates by overall score
    const sorted = [...candidates].sort((a, b) => b.overallScore - a.overallScore);
    const winner = sorted[0];

    return {
      sections: winner.sections,
      confidence: winner.confidence,
      strategy: 'best-of-n',
      winners: this.createWinnersMap(winner),
      overallConfidence: winner.overallScore,
    };
  }

  /**
   * Section Voting: Vote on each section independently.
   * Each candidate "votes" for its own section content.
   * Winner is determined by highest confidence score.
   */
  private mergeSectionVoting(
    candidates: MRDCandidate[],
    options: EnsembleMergeOptions
  ): EnsembleMergeResult {
    const allSectionNumbers = this.getAllSectionNumbers(candidates);
    const votingDetails: SectionVote[] = [];
    const mergedSections: Record<number, string> = {};
    const mergedConfidence: Record<number, number> = {};
    const winners: Record<number, string> = {};

    for (const sectionNum of allSectionNumbers) {
      const vote = this.voteSingleSection(sectionNum, candidates, options);
      votingDetails.push(vote);
      mergedSections[sectionNum] = vote.winningContent;
      mergedConfidence[sectionNum] = vote.confidence;
      winners[sectionNum] = vote.winnerId;
    }

    const overallConfidence = this.calculateAverageConfidence(mergedConfidence);

    return {
      sections: mergedSections,
      confidence: mergedConfidence,
      strategy: 'section-voting',
      winners,
      votingDetails,
      overallConfidence,
    };
  }

  /**
   * Vote on a single section across all candidates.
   */
  private voteSingleSection(
    sectionNum: number,
    candidates: MRDCandidate[],
    options: EnsembleMergeOptions
  ): SectionVote {
    // Collect all versions of this section
    const versions: Array<{ candidate: MRDCandidate; content: string; confidence: number }> = [];

    for (const candidate of candidates) {
      if (candidate.sections[sectionNum]) {
        versions.push({
          candidate,
          content: candidate.sections[sectionNum],
          confidence: candidate.confidence[sectionNum] || 0,
        });
      }
    }

    if (versions.length === 0) {
      throw new Error(`No candidates have section ${sectionNum}`);
    }

    // Vote based on confidence scores
    const votes: Record<string, number> = {};
    let maxVote = 0;
    let winnerId = versions[0].candidate.id;
    let winningContent = versions[0].content;
    let winningConfidence = versions[0].confidence;

    for (const version of versions) {
      const voteWeight = version.confidence;
      votes[version.candidate.id] = voteWeight;

      if (voteWeight > maxVote) {
        maxVote = voteWeight;
        winnerId = version.candidate.id;
        winningContent = version.content;
        winningConfidence = version.confidence;
      } else if (
        voteWeight === maxVote &&
        options.enableTieBreaking &&
        version.content.length > winningContent.length
      ) {
        // Tie-breaker: prefer longer content
        winnerId = version.candidate.id;
        winningContent = version.content;
        winningConfidence = version.confidence;
      }
    }

    return {
      sectionNumber: sectionNum,
      winningContent,
      winnerId,
      votes,
      confidence: winningConfidence,
    };
  }

  /**
   * Confidence Weighted: Merge based on confidence scores.
   * Similar to section voting but explicitly weighted by confidence.
   */
  private mergeConfidenceWeighted(
    candidates: MRDCandidate[],
    options: EnsembleMergeOptions
  ): EnsembleMergeResult {
    // This is essentially the same as section voting for now
    return this.mergeSectionVoting(candidates, options);
  }

  /**
   * Quality Weighted: Merge based on quality review scores.
   * Uses quality review results if available, otherwise falls back to confidence.
   */
  private mergeQualityWeighted(
    candidates: MRDCandidate[],
    options: EnsembleMergeOptions
  ): EnsembleMergeResult {
    const qualityWeight = options.qualityWeight ?? 0.6;
    const confidenceWeight = 1 - qualityWeight;

    // Re-score candidates based on quality + confidence
    const rescoredCandidates = candidates.map((candidate) => {
      let qualityScore = 50; // Default if no quality review

      if (candidate.qualityReview) {
        qualityScore = candidate.qualityReview.overallScore;
      }

      const avgConfidence = this.calculateAverageConfidence(candidate.confidence);
      const combinedScore = qualityScore * qualityWeight + avgConfidence * confidenceWeight;

      // Update confidence scores per section based on combined score
      const newConfidence: Record<number, number> = {};
      for (const [sectionNum, conf] of Object.entries(candidate.confidence)) {
        // Weight section confidence by combined score ratio
        newConfidence[parseInt(sectionNum, 10)] =
          conf * (combinedScore / avgConfidence);
      }

      return {
        ...candidate,
        confidence: newConfidence,
        overallScore: combinedScore,
      };
    });

    // Now use section voting with the rescored candidates
    return this.mergeSectionVoting(rescoredCandidates, options);
  }

  /**
   * Get all section numbers across all candidates.
   */
  private getAllSectionNumbers(candidates: MRDCandidate[]): number[] {
    const sectionSet = new Set<number>();
    for (const candidate of candidates) {
      Object.keys(candidate.sections).forEach((key) => sectionSet.add(parseInt(key, 10)));
    }
    return Array.from(sectionSet).sort((a, b) => a - b);
  }

  /**
   * Create winners map for a single candidate.
   */
  private createWinnersMap(candidate: MRDCandidate): Record<number, string> {
    const winners: Record<number, string> = {};
    Object.keys(candidate.sections).forEach((key) => {
      winners[parseInt(key, 10)] = candidate.id;
    });
    return winners;
  }

  /**
   * Calculate average confidence across sections.
   */
  private calculateAverageConfidence(confidence: Record<number, number>): number {
    const values = Object.values(confidence);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Create a candidate from section generator output.
   */
  static createCandidate(
    id: string,
    output: SectionGeneratorOutput,
    source: string
  ): MRDCandidate {
    const avgConfidence =
      Object.values(output.confidence).reduce((sum, val) => sum + val, 0) /
        Object.keys(output.confidence).length || 0;

    return {
      id,
      sections: output.sections,
      confidence: output.confidence,
      overallScore: avgConfidence,
      source,
    };
  }

  /**
   * Combine section outputs from multiple generators into a full MRD.
   */
  static combineSections(
    marketOutput: SectionGeneratorOutput,
    technicalOutput: SectionGeneratorOutput,
    strategyOutput: SectionGeneratorOutput
  ): Record<number, string> {
    return {
      ...marketOutput.sections,
      ...technicalOutput.sections,
      ...strategyOutput.sections,
    };
  }

  /**
   * Combine confidence scores from multiple generators.
   */
  static combineConfidence(
    marketOutput: SectionGeneratorOutput,
    technicalOutput: SectionGeneratorOutput,
    strategyOutput: SectionGeneratorOutput
  ): Record<number, number> {
    return {
      ...marketOutput.confidence,
      ...technicalOutput.confidence,
      ...strategyOutput.confidence,
    };
  }
}
