/**
 * MRD Chat Agent
 *
 * Conversational refinement for a single MRD section. Uses section-specific
 * context from YAML. Returns narrative suggested content (not bullets).
 */

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities } from '@/lib/providers/types';
import { getSectionById } from '@/lib/mrd/section-definitions';
import type { MRDChatInput, MRDChatOutput } from './types';
import { MRD_SECTION_IDS } from '@/app/mrd-generator/lib/mrd-state';

export class MRDChatAgent extends BaseAgent<MRDChatInput, MRDChatOutput> {
  readonly id = 'mrd-chat-agent';
  readonly name = 'MRD Chat Agent';
  readonly version = '1.0.0';
  readonly description =
    'Conversational AI that refines MRD sections through natural language';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
  ];

  validateInput(input: MRDChatInput): ValidationResult {
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }
    if (!input.sectionId || !MRD_SECTION_IDS.includes(input.sectionId)) {
      return { valid: false, errors: ['sectionId must be a valid MRD section id'] };
    }
    if (typeof input.currentContent !== 'string') {
      return { valid: false, errors: ['currentContent must be a string'] };
    }
    if (!input.userMessage || typeof input.userMessage !== 'string') {
      return { valid: false, errors: ['userMessage must be a non-empty string'] };
    }
    if (input.userMessage.trim().length === 0) {
      return { valid: false, errors: ['userMessage cannot be empty'] };
    }
    return { valid: true };
  }

  protected async executeCore(
    input: MRDChatInput,
    context: ExecutionContext
  ): Promise<MRDChatOutput> {
    const {
      sectionId,
      currentContent,
      gaps,
      userMessage,
      conversationHistory,
      initialConcept,
    } = input;
    const provider = context.getProvider();
    const sectionDef = getSectionById(sectionId);

    context.log('info', `[${this.id}] Chat for section: ${sectionId}`);

    const systemPrompt = this.buildSystemPrompt(sectionDef?.chat_context ?? 'Refine this MRD section.');
    const userPrompt = this.buildUserPrompt({
      sectionId,
      currentContent,
      gaps,
      userMessage,
      conversationHistory,
      initialConcept,
    });

    const response = await provider.generateText(userPrompt, systemPrompt, {
      temperature: 0.6,
    });

    const parsed = this.parseResponse(response.text);

    return {
      message: parsed.message,
      suggestedContent: parsed.suggestedContent,
      isFinalSuggestion: parsed.isFinalSuggestion,
    };
  }

  private buildSystemPrompt(chatContext: string): string {
    return `${chatContext}

You are a helpful assistant refining a Market Requirements Document (MRD) section.
Use markdown: **bold** for key terms, * for bullets where appropriate.
When you have a concrete revision for the section, prefix it with SUGGESTED_CONTENT:
Then paste the revised section text (markdown).
Otherwise respond conversationally.`;
  }

  private buildUserPrompt(opts: {
    sectionId: string;
    currentContent: string;
    gaps?: MRDChatInput['gaps'];
    userMessage: string;
    conversationHistory: MRDChatInput['conversationHistory'];
    initialConcept?: string;
  }): string {
    const parts: string[] = [
      `Section: ${opts.sectionId}`,
      '',
    ];
    if (opts.initialConcept?.trim()) {
      parts.push('Product concept:');
      parts.push(`"""${opts.initialConcept}"""`);
      parts.push('');
    }
    parts.push('Current section content:');
    parts.push(opts.currentContent || '(empty)');
    parts.push('');
    if (opts.gaps?.length) {
      parts.push('Identified gaps:');
      opts.gaps.forEach((g) => parts.push(`- ${g.suggestedQuestion}`));
      parts.push('');
    }
    if (opts.conversationHistory?.length) {
      parts.push('Previous conversation:');
      opts.conversationHistory.forEach((m) => {
        parts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      });
      parts.push('');
    }
    parts.push(`User: ${opts.userMessage}`);
    return parts.join('\n');
  }

  private parseResponse(text: string): {
    message: string;
    suggestedContent?: string;
    isFinalSuggestion: boolean;
  } {
    const marker = 'SUGGESTED_CONTENT:';
    const idx = text.indexOf(marker);
    let message = text.trim();
    let suggestedContent: string | undefined;
    let isFinalSuggestion = false;

    if (idx >= 0) {
      message = text.substring(0, idx).trim();
      const after = text.substring(idx + marker.length).trim();
      if (after.length > 0) {
        suggestedContent = after;
        isFinalSuggestion = true;
      }
    }

    return { message, suggestedContent, isFinalSuggestion };
  }
}
