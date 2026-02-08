/**
 * Gap Analyzer Agent
 *
 * Wraps the gap-analysis skill (skills/gap_analyzer.ts) as an agent.
 * Receives parsed RequestData, determines whether clarification is needed,
 * and returns a GapAssessment with the decision, questions (if any), and
 * proceed-notes (if proceeding).
 *
 * Also exposes a static helper that the orchestrator calls when it needs to
 * merge a round of user answers back into RequestData before re-running
 * gap analysis.
 *
 * No AI provider calls are made -- the underlying analyzeGaps function is
 * purely deterministic.
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { RequestData, GapAssessment, ClarificationAnswers } from '@/lib/schemas';
import { analyzeGaps, mergeClarificationAnswers } from '@/skills/gap_analyzer';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

/**
 * Input to the gap analyzer.  The orchestrator supplies the parsed request
 * data together with clarification-round bookkeeping so that the skill can
 * avoid repeating questions.
 */
export interface GapAnalyzerInput {
  /** Parsed request data (output of ParserAgent or a previous merge). */
  requestData: RequestData;
  /**
   * Zero-based clarification round counter.  0 means no round has completed yet.
   */
  clarificationRound: number;
  /**
   * Flat list of question strings that have already been asked across all
   * previous rounds.  Used to prevent duplicate questions.
   */
  previousQuestions: string[];
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class GapAnalyzerAgent extends BaseAgent<GapAnalyzerInput, GapAssessment> {
  readonly id = 'gap-analyzer-agent';
  readonly name = 'Gap Analyzer Agent';
  readonly version = '1.0.0';
  readonly description =
    'Identifies information gaps in parsed request data and decides whether to clarify, proceed, or escalate';

  // No AI capabilities required
  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [];

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  validateInput(input: GapAnalyzerInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.requestData || typeof input.requestData !== 'object') {
      errors.push('requestData is required and must be a valid RequestData object');
    } else {
      // Spot-check that essential nested fields exist
      if (!input.requestData.productConcept) {
        errors.push('requestData.productConcept is missing');
      }
      if (!input.requestData.extractedData) {
        errors.push('requestData.extractedData is missing');
      }
    }

    if (typeof input.clarificationRound !== 'number' || input.clarificationRound < 0) {
      errors.push('clarificationRound must be a non-negative number');
    }

    if (!Array.isArray(input.previousQuestions)) {
      errors.push('previousQuestions must be an array of strings');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // -----------------------------------------------------------------------
  // Core execution
  // -----------------------------------------------------------------------

  protected async executeCore(
    input: GapAnalyzerInput,
    context: ExecutionContext
  ): Promise<GapAssessment> {
    context.log('info', `[${this.id}] Running gap analysis`, {
      round: input.clarificationRound,
      previousQuestionCount: input.previousQuestions.length,
    });

    const assessment = analyzeGaps(
      input.requestData,
      input.clarificationRound,
      input.previousQuestions
    );

    context.log('info', `[${this.id}] Gap analysis decision: ${assessment.decision}`, {
      blocking: assessment.gapAssessment.blocking.length,
      important: assessment.gapAssessment.important.length,
      minor: assessment.gapAssessment.minor.length,
      questionCount: assessment.clarification?.questions.length ?? 0,
    });

    return assessment;
  }

  // -----------------------------------------------------------------------
  // Static helper: merge clarification answers
  // -----------------------------------------------------------------------

  /**
   * Merges a round of user clarification answers into the existing RequestData.
   * This is a stateless utility exposed on the agent class so the orchestrator
   * can call it without importing the skill directly, keeping the dependency
   * graph clean.
   *
   * @param requestData - The current parsed request data.
   * @param answers     - The user's answers for the completed round.
   * @returns Updated RequestData with answers incorporated.
   */
  static mergeAnswers(requestData: RequestData, answers: ClarificationAnswers): RequestData {
    return mergeClarificationAnswers(requestData, answers);
  }
}
