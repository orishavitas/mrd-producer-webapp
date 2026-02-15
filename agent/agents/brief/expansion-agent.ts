/**
 * Expansion Agent
 *
 * AI-powered conversational agent that helps users expand and refine
 * their brief fields through natural language interaction.
 *
 * Takes current bullet points, identified gaps, and user messages to:
 * - Suggest improvements and additions
 * - Answer clarifying questions
 * - Generate professional, detailed descriptions
 * - Fill in missing information based on context
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { BriefField } from '@/app/brief-helper/lib/brief-state';

// ============================================================================
// Types
// ============================================================================

export interface ExpansionInput {
  /** Field type being expanded */
  fieldType: BriefField;
  /** Current bullet points in the field */
  currentBullets: string[];
  /** Identified gaps (optional) */
  gaps?: Array<{
    category: string;
    suggestedQuestion: string;
    exampleAnswer?: string;
  }>;
  /** User's message or question */
  userMessage?: string;
  /** Conversation history (for context) */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Original product description from start page (V2) - provides context for suggestions */
  initialDescription?: string;
}

export interface ExpansionOutput {
  /** AI's response message */
  message: string;
  /** Suggested bullet points to add/update */
  suggestedBullets?: string[];
  /** Whether the AI is offering final suggestions */
  isFinalSuggestion: boolean;
}

// ============================================================================
// Field-Specific Expansion Contexts
// ============================================================================

const FIELD_CONTEXTS: Record<BriefField, string> = {
  what: `You are helping expand the PRODUCT DESCRIPTION (What field).
Focus on physical attributes, features, specifications, and capabilities.
Be specific about dimensions, materials, standards, and technical details.
Use clear, concise bullet points.`,

  who: `You are helping expand the TARGET USERS/CUSTOMERS (Who field).
Focus on personas, industries, roles, and use cases.
Be specific about user needs, pain points, and customer segments.
Use clear, concise bullet points.`,

  where: `You are helping expand the USE ENVIRONMENT (Where field).
Focus on physical locations, mounting, environmental conditions.
Be specific about placement, installation requirements, and space constraints.
Use clear, concise bullet points.`,

  moq: `You are helping expand the MINIMUM ORDER QUANTITY (MOQ field).
Focus on quantity requirements, volume tiers, and order expectations.
Be specific about minimums, ranges, and pricing tiers if applicable.
Use clear, concise bullet points.`,

  'must-have': `You are helping expand the MUST-HAVE FEATURES (non-negotiable requirements).
Focus on critical features, mandatory capabilities, and deal-breaker requirements.
Be specific about what is absolutely required vs nice-to-have.
Use clear, concise bullet points.`,

  'nice-to-have': `You are helping expand the NICE-TO-HAVE FEATURES (optional enhancements).
Focus on optional features, future possibilities, and upgrade options.
Be specific about enhancements that would add value but aren't critical.
Use clear, concise bullet points.`,
};

// ============================================================================
// Agent Implementation
// ============================================================================

export class ExpansionAgent extends BaseAgent<ExpansionInput, ExpansionOutput> {
  readonly id = 'expansion-agent';
  readonly name = 'Expansion Agent';
  readonly version = '1.0.0';
  readonly description =
    'Conversational AI agent that helps expand and refine brief fields through natural language';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
  ];

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateInput(input: ExpansionInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (!input.fieldType) {
      errors.push('fieldType is required');
    }

    const validFields: BriefField[] = [
      'what',
      'who',
      'where',
      'moq',
      'must-have',
      'nice-to-have',
    ];
    if (!validFields.includes(input.fieldType)) {
      errors.push(`fieldType must be one of: ${validFields.join(', ')}`);
    }

    if (!Array.isArray(input.currentBullets)) {
      errors.push('currentBullets must be an array');
    }

    if (
      input.conversationHistory &&
      !Array.isArray(input.conversationHistory)
    ) {
      errors.push('conversationHistory must be an array when provided');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  // --------------------------------------------------------------------------
  // Core Execution
  // --------------------------------------------------------------------------

  protected async executeCore(
    input: ExpansionInput,
    context: ExecutionContext
  ): Promise<ExpansionOutput> {
    const { fieldType, currentBullets, gaps, userMessage, conversationHistory, initialDescription } =
      input;
    const provider = context.getProvider();

    context.log('info', `[${this.id}] Expanding field: ${fieldType}`, {
      bulletCount: currentBullets.length,
      gapCount: gaps?.length || 0,
      hasUserMessage: !!userMessage,
      historyLength: conversationHistory?.length || 0,
    });

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(fieldType);

    // Build user prompt
    const userPrompt = this.buildUserPrompt(
      fieldType,
      currentBullets,
      gaps,
      userMessage,
      conversationHistory,
      initialDescription
    );

    // Call AI provider
    const response = await provider.generateText(userPrompt, systemPrompt, {
      temperature: 0.7, // Moderate creativity
    });

    // Parse response
    const parsed = this.parseResponse(response.text);

    context.log('info', `[${this.id}] Expansion complete`, {
      messageLength: parsed.message.length,
      suggestedBulletCount: parsed.suggestedBullets?.length || 0,
      isFinal: parsed.isFinalSuggestion,
    });

    return parsed;
  }

  // --------------------------------------------------------------------------
  // Prompt Building
  // --------------------------------------------------------------------------

  private buildSystemPrompt(fieldType: BriefField): string {
    return `${FIELD_CONTEXTS[fieldType]}

You are a helpful assistant specialized in creating product briefs for physical products
(stands, mounts, enclosures, kiosks, displays, accessories).

Guidelines:
- Be conversational and friendly
- Ask clarifying questions when needed
- Provide specific, actionable suggestions
- Use industry terminology appropriately
- When suggesting bullet points, format them clearly
- Mark final suggestions with "FINAL_SUGGESTIONS:" prefix
- Keep responses concise but thorough

Response Format:
1. If suggesting specific bullet points to add, use this format:
   SUGGESTED_BULLETS:
   - Bullet point 1
   - Bullet point 2
   - Bullet point 3

2. For final comprehensive suggestions, use:
   FINAL_SUGGESTIONS:
   - Complete bullet point 1
   - Complete bullet point 2

3. Otherwise, just provide conversational guidance and questions.`;
  }

  private buildUserPrompt(
    fieldType: BriefField,
    currentBullets: string[],
    gaps: ExpansionInput['gaps'],
    userMessage: string | undefined,
    conversationHistory: ExpansionInput['conversationHistory'],
    initialDescription?: string
  ): string {
    let prompt = `Field: ${fieldType.toUpperCase()}\n\n`;

    // Original product description (if provided)
    if (initialDescription && initialDescription.trim().length > 0) {
      prompt += `Original product description:\n"""${initialDescription}"""\n\n`;
    }

    // Current content
    if (currentBullets.length > 0) {
      prompt += `Current bullet points:\n`;
      currentBullets.forEach((bullet) => {
        prompt += `- ${bullet}\n`;
      });
      prompt += `\n`;
    } else {
      prompt += `Current bullet points: (none yet)\n\n`;
    }

    // Identified gaps
    if (gaps && gaps.length > 0) {
      prompt += `Missing information detected:\n`;
      gaps.forEach((gap) => {
        prompt += `- ${gap.suggestedQuestion}`;
        if (gap.exampleAnswer) {
          prompt += ` (e.g., ${gap.exampleAnswer})`;
        }
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    // Conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      prompt += `Previous conversation:\n`;
      conversationHistory.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n`;
      });
      prompt += `\n`;
    }

    // User message or initial request
    if (userMessage) {
      prompt += `User: ${userMessage}\n\n`;
    } else {
      // Initial expansion request (no user message)
      if (gaps && gaps.length > 0) {
        prompt += `User: Can you help me fill in the missing information?\n\n`;
      } else {
        prompt += `User: Can you help me expand this field with more details?\n\n`;
      }
    }

    prompt += `Please provide helpful guidance or suggestions.`;

    return prompt;
  }

  // --------------------------------------------------------------------------
  // Response Parsing
  // --------------------------------------------------------------------------

  private parseResponse(text: string): ExpansionOutput {
    // Check for final suggestions
    const isFinalSuggestion =
      text.includes('FINAL_SUGGESTIONS:') ||
      text.toLowerCase().includes('here are the complete') ||
      text.toLowerCase().includes('final bullet points');

    // Extract suggested bullets
    let suggestedBullets: string[] | undefined;

    // Look for SUGGESTED_BULLETS: or FINAL_SUGGESTIONS: markers
    const bulletRegex =
      /(?:SUGGESTED_BULLETS:|FINAL_SUGGESTIONS:)\s*([\s\S]*?)(?=\n\n|$)/;
    const match = text.match(bulletRegex);

    if (match && match[1]) {
      const bulletSection = match[1].trim();
      // Extract bullets (lines starting with -, *, or numbers)
      suggestedBullets = bulletSection
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/))
        .map((line) => line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, ''))
        .filter((line) => line.length > 0);

      // Remove the bullet section from the message
      text = text.replace(bulletRegex, '').trim();
    }

    // Clean up the message
    let message = text
      .replace(/SUGGESTED_BULLETS:/g, '')
      .replace(/FINAL_SUGGESTIONS:/g, '')
      .trim();

    // If message is empty but we have bullets, generate a default message
    if (!message && suggestedBullets && suggestedBullets.length > 0) {
      if (isFinalSuggestion) {
        message = `Based on your requirements, here are the complete bullet points:`;
      } else {
        message = `Here are some suggestions to add:`;
      }
    }

    return {
      message: message || 'How can I help you expand this field?',
      suggestedBullets,
      isFinalSuggestion,
    };
  }
}
