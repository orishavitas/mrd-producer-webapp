/**
 * Gap Analyzer Skill
 *
 * Analyzes parsed request data to identify information gaps
 * and generate clarification questions when needed.
 *
 * Based on reference library 02_gap_analysis.md methodology.
 */

import {
  GapAssessment,
  GapInfo,
  ClarificationQuestion,
  WorkflowDecision,
  RequestData,
  ClarificationAnswers,
} from '@/lib/schemas';

/**
 * Maximum number of clarification rounds allowed.
 */
const MAX_CLARIFICATION_ROUNDS = 2;

/**
 * Maximum questions per round.
 */
const MAX_QUESTIONS_PER_ROUND = 5;

/**
 * Question priority order (higher priority = asked first).
 */
const FIELD_PRIORITY: Record<string, number> = {
  target_markets: 100,
  use_cases: 90,
  target_price: 80,
  technical_requirements: 70,
  volume_expectation: 60,
  timeline: 50,
  materials: 40,
  design_preferences: 30,
};

/**
 * Field-specific question templates.
 */
const QUESTION_TEMPLATES: Record<string, {
  question: string;
  context: string;
  options: string[] | null;
}> = {
  target_price: {
    question: 'What price range are you targeting for this product?',
    context: 'This helps position against competitors and ensure viable margins.',
    options: ['Under $100', '$100-$250', '$250-$500', '$500-$1000', 'Over $1000', 'Need recommendation'],
  },
  volume_expectation: {
    question: "What's the expected annual volume for this product?",
    context: 'Volume impacts tooling decisions and unit economics.',
    options: ['Under 500 units', '500-2,000 units', '2,000-10,000 units', 'Over 10,000 units'],
  },
  target_markets: {
    question: 'Which market verticals are you targeting?',
    context: 'Different verticals have different requirements and price sensitivities.',
    options: ['Retail', 'Hospitality', 'Healthcare', 'Corporate', 'Education', 'Multiple'],
  },
  use_cases: {
    question: 'What are the primary use cases for this product?',
    context: 'Understanding use cases helps define key features and requirements.',
    options: null,
  },
  timeline: {
    question: 'What is your target launch timeline?',
    context: 'Timeline affects development approach and resource allocation.',
    options: ['ASAP (1-2 months)', 'Standard (3-6 months)', 'Flexible (6+ months)', 'Specific date'],
  },
  device_compatibility: {
    question: 'Which devices should this product support?',
    context: 'Device compatibility affects design constraints and manufacturing.',
    options: null,
  },
  materials: {
    question: 'Do you have specific material requirements?',
    context: 'Materials affect durability, aesthetics, and cost.',
    options: ['Aluminum', 'Steel', 'Plastic', 'Wood', 'No preference'],
  },
};

/**
 * Analyzes request data and determines if clarification is needed.
 *
 * @param requestData - Parsed request data from stage 1.
 * @param clarificationRound - Current clarification round (0-based).
 * @param previousQuestions - Questions asked in previous rounds.
 * @returns Gap assessment with decision and optional questions.
 */
export function analyzeGaps(
  requestData: RequestData,
  clarificationRound: number = 0,
  previousQuestions: string[] = []
): GapAssessment {
  // Categorize gaps by severity
  const blocking: GapInfo[] = [];
  const important: GapInfo[] = [];
  const minor: GapInfo[] = [];

  // Check for blocking gaps
  if (requestData.extractedData.targetMarkets.length === 0) {
    blocking.push({
      field: 'target_markets',
      reason: 'No target market identified - required for research and positioning',
    });
  }

  if (requestData.extractedData.useCases.length === 0) {
    blocking.push({
      field: 'use_cases',
      reason: 'No use cases described - needed to define requirements',
    });
  }

  if (!requestData.productConcept.summary || requestData.productConcept.summary.length < 20) {
    blocking.push({
      field: 'product_concept',
      reason: 'Product concept too vague to research effectively',
    });
  }

  // Check for important gaps
  if (!requestData.extractedData.targetPrice) {
    important.push({
      field: 'target_price',
      reason: 'No price target - required for competitive positioning and margin analysis',
    });
  }

  if (!requestData.extractedData.volumeExpectation) {
    important.push({
      field: 'volume_expectation',
      reason: 'No volume indicated - needed for manufacturing assessment',
    });
  }

  if (requestData.extractedData.technicalRequirements.deviceCompatibility.length === 0) {
    important.push({
      field: 'device_compatibility',
      reason: 'No device compatibility specified - affects design constraints',
    });
  }

  // Check for minor gaps
  if (requestData.extractedData.timeline.urgency === 'medium' && !requestData.extractedData.timeline.targetDate) {
    minor.push({
      field: 'timeline',
      reason: 'No specific deadline - can assume standard timeline',
    });
  }

  if (requestData.extractedData.technicalRequirements.materials.length === 0) {
    minor.push({
      field: 'materials',
      reason: 'Materials not specified - can recommend based on use case',
    });
  }

  // Make decision
  const decision = makeDecision(blocking, important, clarificationRound);

  // Build response based on decision
  if (decision === 'clarify') {
    const questions = generateQuestions(
      [...blocking, ...important],
      previousQuestions,
      MAX_QUESTIONS_PER_ROUND
    );

    return {
      decision: 'clarify',
      reasoning: buildClarifyReasoning(blocking, important, clarificationRound),
      gapAssessment: { blocking, important, minor },
      clarification: { questions },
      proceedNotes: null,
      escalateReason: null,
    };
  }

  if (decision === 'proceed') {
    return {
      decision: 'proceed',
      reasoning: buildProceedReasoning(blocking, important, minor),
      gapAssessment: { blocking, important, minor },
      clarification: null,
      proceedNotes: {
        gapsToFlag: buildGapsToFlag(important, minor),
        assumptionsToMake: buildAssumptions(important, minor),
      },
      escalateReason: null,
    };
  }

  // Escalate (rare)
  return {
    decision: 'escalate',
    reasoning: 'Multiple critical issues require human review.',
    gapAssessment: { blocking, important, minor },
    clarification: null,
    proceedNotes: null,
    escalateReason: 'Request contains issues that cannot be resolved through automated clarification.',
  };
}

/**
 * Determines the workflow decision based on gap analysis.
 */
function makeDecision(
  blocking: GapInfo[],
  important: GapInfo[],
  round: number
): WorkflowDecision {
  // If we've reached max rounds, proceed regardless
  if (round >= MAX_CLARIFICATION_ROUNDS) {
    return 'proceed';
  }

  // If blocking gaps exist and we haven't maxed out rounds, clarify
  if (blocking.length > 0 && round < MAX_CLARIFICATION_ROUNDS) {
    return 'clarify';
  }

  // If no blocking gaps and few important gaps, proceed
  if (blocking.length === 0 && important.length <= 2) {
    return 'proceed';
  }

  // If many important gaps in early rounds, clarify
  if (important.length > 2 && round < MAX_CLARIFICATION_ROUNDS) {
    return 'clarify';
  }

  return 'proceed';
}

/**
 * Generates clarification questions based on gaps.
 */
function generateQuestions(
  gaps: GapInfo[],
  previousQuestions: string[],
  maxQuestions: number
): ClarificationQuestion[] {
  // Sort gaps by priority
  const sortedGaps = [...gaps].sort((a, b) => {
    const priorityA = FIELD_PRIORITY[a.field] || 0;
    const priorityB = FIELD_PRIORITY[b.field] || 0;
    return priorityB - priorityA;
  });

  const questions: ClarificationQuestion[] = [];

  for (const gap of sortedGaps) {
    if (questions.length >= maxQuestions) break;

    const template = QUESTION_TEMPLATES[gap.field];
    if (!template) continue;

    // Skip if already asked
    if (previousQuestions.includes(template.question)) continue;

    questions.push({
      number: questions.length + 1,
      field: gap.field,
      question: template.question,
      context: template.context,
      options: template.options,
    });
  }

  return questions;
}

/**
 * Builds reasoning string for clarify decision.
 */
function buildClarifyReasoning(
  blocking: GapInfo[],
  important: GapInfo[],
  round: number
): string {
  const parts: string[] = [];

  if (blocking.length > 0) {
    parts.push(`${blocking.length} blocking gap${blocking.length > 1 ? 's' : ''} identified`);
  }

  if (important.length > 0) {
    parts.push(`${important.length} important gap${important.length > 1 ? 's' : ''} found`);
  }

  parts.push(`Round ${round + 1} of ${MAX_CLARIFICATION_ROUNDS}`);

  return parts.join('. ') + '. Clarification needed before proceeding.';
}

/**
 * Builds reasoning string for proceed decision.
 */
function buildProceedReasoning(
  blocking: GapInfo[],
  important: GapInfo[],
  minor: GapInfo[]
): string {
  if (blocking.length === 0 && important.length === 0) {
    return 'All critical information available. Ready for research.';
  }

  const parts: string[] = [];

  if (important.length > 0) {
    parts.push(`${important.length} important gap${important.length > 1 ? 's' : ''} will be noted`);
  }

  if (minor.length > 0) {
    parts.push(`${minor.length} minor gap${minor.length > 1 ? 's' : ''} can be addressed in MRD`);
  }

  return parts.join('. ') + '. Proceeding with research.';
}

/**
 * Builds list of gaps to flag in final document.
 */
function buildGapsToFlag(important: GapInfo[], minor: GapInfo[]): string[] {
  const flags: string[] = [];

  for (const gap of important) {
    flags.push(`${gap.field}: ${gap.reason}`);
  }

  for (const gap of minor) {
    flags.push(`${gap.field}: ${gap.reason}`);
  }

  return flags;
}

/**
 * Builds list of assumptions to make during research.
 */
function buildAssumptions(important: GapInfo[], minor: GapInfo[]): string[] {
  const assumptions: string[] = [];

  for (const gap of [...important, ...minor]) {
    switch (gap.field) {
      case 'target_price':
        assumptions.push('Will research market pricing to recommend target');
        break;
      case 'volume_expectation':
        assumptions.push('Assuming moderate volume (1,000-5,000 units annually)');
        break;
      case 'timeline':
        assumptions.push('Assuming standard development timeline (3-6 months)');
        break;
      case 'materials':
        assumptions.push('Will recommend materials based on use case and market');
        break;
      case 'device_compatibility':
        assumptions.push('Will research common device compatibility in target market');
        break;
    }
  }

  return [...new Set(assumptions)]; // Remove duplicates
}

/**
 * Merges clarification answers into request data.
 *
 * @param requestData - Original request data.
 * @param answers - User's answers to clarification questions.
 * @returns Updated request data with answers incorporated.
 */
export function mergeClarificationAnswers(
  requestData: RequestData,
  answers: ClarificationAnswers
): RequestData {
  const updated = { ...requestData };
  updated.extractedData = { ...requestData.extractedData };

  for (const { question, answer } of answers.answers) {
    // Find the field this question relates to
    const template = Object.entries(QUESTION_TEMPLATES).find(
      ([, t]) => t.question === question
    );

    if (!template) continue;

    const [field] = template;

    // Update extracted data based on field
    switch (field) {
      case 'target_price':
        updated.extractedData.targetPrice = parseTargetPrice(answer);
        break;
      case 'volume_expectation':
        updated.extractedData.volumeExpectation = parseVolumeExpectation(answer);
        break;
      case 'target_markets':
        updated.extractedData.targetMarkets = parseTargetMarkets(answer);
        break;
      case 'timeline':
        updated.extractedData.timeline = parseTimeline(answer, updated.extractedData.timeline);
        break;
      case 'use_cases':
        updated.extractedData.useCases = [answer, ...updated.extractedData.useCases];
        break;
      case 'device_compatibility':
        updated.extractedData.technicalRequirements = {
          ...updated.extractedData.technicalRequirements,
          deviceCompatibility: [answer, ...updated.extractedData.technicalRequirements.deviceCompatibility],
        };
        break;
      case 'materials':
        updated.extractedData.technicalRequirements = {
          ...updated.extractedData.technicalRequirements,
          materials: answer !== 'No preference' ? [answer] : [],
        };
        break;
    }
  }

  // Re-assess gaps
  updated.gaps = reassessGaps(updated);

  return updated;
}

/**
 * Parses target price from answer string.
 */
function parseTargetPrice(answer: string): RequestData['extractedData']['targetPrice'] {
  const priceMatch = answer.match(/\$?([\d,]+)/);
  if (!priceMatch) {
    return { value: null, type: null, min: null, max: null, currency: 'USD' };
  }

  const value = parseInt(priceMatch[1].replace(/,/g, ''), 10);

  if (answer.includes('-')) {
    const rangeMatch = answer.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
    if (rangeMatch) {
      return {
        value: null,
        type: 'range',
        min: parseInt(rangeMatch[1].replace(/,/g, ''), 10),
        max: parseInt(rangeMatch[2].replace(/,/g, ''), 10),
        currency: 'USD',
      };
    }
  }

  if (answer.toLowerCase().includes('under') || answer.toLowerCase().includes('less than')) {
    return { value, type: 'maximum', min: null, max: value, currency: 'USD' };
  }

  return { value, type: 'approximate', min: null, max: null, currency: 'USD' };
}

/**
 * Parses volume expectation from answer string.
 */
function parseVolumeExpectation(answer: string): RequestData['extractedData']['volumeExpectation'] {
  const match = answer.match(/([\d,]+)/);
  if (!match) {
    return { quantity: null, period: 'annual', notes: answer };
  }

  return {
    quantity: parseInt(match[1].replace(/,/g, ''), 10),
    period: 'annual',
    notes: answer,
  };
}

/**
 * Parses target markets from answer string.
 */
function parseTargetMarkets(answer: string): RequestData['extractedData']['targetMarkets'] {
  const markets: RequestData['extractedData']['targetMarkets'] = [];
  const validMarkets = ['Retail', 'Hospitality', 'Healthcare', 'Corporate', 'Education', 'Government'] as const;

  for (const market of validMarkets) {
    if (answer.includes(market)) {
      markets.push(market);
    }
  }

  if (markets.length === 0) {
    markets.push('Other');
  }

  return markets;
}

/**
 * Parses timeline from answer string.
 */
function parseTimeline(answer: string, existing: RequestData['extractedData']['timeline']): RequestData['extractedData']['timeline'] {
  if (answer.toLowerCase().includes('asap') || answer.includes('1-2')) {
    return { ...existing, urgency: 'critical', notes: answer };
  }
  if (answer.toLowerCase().includes('flexible') || answer.includes('6+')) {
    return { ...existing, urgency: 'low', notes: answer };
  }
  if (answer.includes('3-6')) {
    return { ...existing, urgency: 'medium', notes: answer };
  }

  return { ...existing, notes: answer };
}

/**
 * Re-assesses gaps after merging clarification answers.
 */
function reassessGaps(data: RequestData): RequestData['gaps'] {
  const critical: GapInfo[] = [];
  const optional: GapInfo[] = [];

  if (data.extractedData.targetMarkets.length === 0) {
    critical.push({ field: 'target_markets', reason: 'No target market identified' });
  }

  if (data.extractedData.useCases.length === 0) {
    critical.push({ field: 'use_cases', reason: 'No use cases described' });
  }

  if (!data.extractedData.targetPrice) {
    optional.push({ field: 'target_price', reason: 'No price target specified' });
  }

  if (!data.extractedData.volumeExpectation) {
    optional.push({ field: 'volume_expectation', reason: 'No volume expectation specified' });
  }

  return { critical, optional };
}
