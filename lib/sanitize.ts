/**
 * Input Sanitization Utilities
 *
 * Provides sanitization functions to prevent prompt injection attacks
 * when user input is passed to AI models.
 */

/**
 * Characters and patterns that could be used for prompt injection.
 * These are escaped or removed to prevent manipulation of AI prompts.
 */
const INJECTION_PATTERNS = [
  // XML/HTML-like tags that could interfere with structured prompts
  /<\/?[a-zA-Z][^>]*>/g,
  // System-level prompt markers
  /\b(system|assistant|user|human):\s*/gi,
  // Common prompt injection phrases
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)/gi,
  /forget\s+(everything|all|your)\s+(instructions?|rules?|guidelines?)/gi,
  // Delimiter manipulation
  /---+/g,
  /===+/g,
  /\*\*\*+/g,
];

/**
 * Characters to escape in user input.
 */
const ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '{': '&#123;',
  '}': '&#125;',
};

/**
 * Sanitizes a single string input for safe use in AI prompts.
 *
 * @param input - The raw user input string.
 * @param options - Sanitization options.
 * @returns The sanitized string.
 */
export function sanitizeInput(
  input: string,
  options: { maxLength?: number; allowMarkdown?: boolean } = {}
): string {
  const { maxLength = 10000, allowMarkdown = true } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength);

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape potentially dangerous characters
  sanitized = sanitized.replace(/[<>{}]/g, (char) => ESCAPE_MAP[char] || char);

  // Remove or neutralize injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Replace with bracketed version to neutralize but preserve intent
      return `[${match.replace(/[<>]/g, '')}]`;
    });
  }

  // If markdown is not allowed, escape markdown syntax
  if (!allowMarkdown) {
    sanitized = sanitized
      .replace(/[#*_`~\[\]]/g, '\\$&')
      .replace(/!\[/g, '\\!\\[');
  }

  return sanitized;
}

/**
 * Sanitizes an object containing user inputs.
 *
 * @param obj - Object with string values to sanitize.
 * @returns Object with sanitized string values.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeInput(item);
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validates and sanitizes clarification Q&A pairs.
 *
 * @param clarifications - Array of question/answer objects.
 * @returns Sanitized clarifications array.
 */
export function sanitizeClarifications(
  clarifications?: { question: string; answer: string }[]
): { question: string; answer: string }[] | undefined {
  if (!clarifications || !Array.isArray(clarifications)) {
    return undefined;
  }

  return clarifications
    .filter(
      (c) =>
        c &&
        typeof c.question === 'string' &&
        typeof c.answer === 'string' &&
        c.question.trim() &&
        c.answer.trim()
    )
    .map((c) => ({
      question: sanitizeInput(c.question, { maxLength: 500 }),
      answer: sanitizeInput(c.answer, { maxLength: 2000 }),
    }));
}

/**
 * Sanitizes MRD generation input.
 *
 * @param input - Raw input from API request.
 * @returns Sanitized input object.
 */
export function sanitizeMRDInput(input: {
  productConcept?: string;
  targetMarket?: string;
  additionalDetails?: string;
  clarifications?: { question: string; answer: string }[];
}): {
  productConcept: string;
  targetMarket: string;
  additionalDetails?: string;
  clarifications?: { question: string; answer: string }[];
} {
  return {
    productConcept: sanitizeInput(input.productConcept || '', { maxLength: 1000 }),
    targetMarket: sanitizeInput(input.targetMarket || '', { maxLength: 500 }),
    additionalDetails: input.additionalDetails
      ? sanitizeInput(input.additionalDetails, { maxLength: 5000 })
      : undefined,
    clarifications: sanitizeClarifications(input.clarifications),
  };
}
