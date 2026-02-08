/**
 * Anthropic AI Provider
 *
 * Implements the AIProvider interface for Anthropic's Claude models.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  ProviderCapabilities,
  GenerationOptions,
  GenerationResponse,
  TokenUsage,
} from './types';

/**
 * Default model to use for Claude requests.
 */
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Anthropic provider implementation.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'claude';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    textGeneration: true,
    searchGrounding: false, // Claude doesn't have built-in search grounding
    structuredOutput: true,
    streaming: true,
    functionCalling: true,
  };

  private client: Anthropic | null = null;

  /**
   * Check if Claude is available (API key configured).
   */
  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Get or create the Anthropic client instance.
   */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not configured');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate text using Claude.
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const client = this.getClient();

    const response = await client.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP,
      stop_sequences: options.stopSequences,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response received from Claude');
    }

    // Extract token usage
    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      text: textContent.text,
      usage,
      metadata: {
        model: response.model,
        provider: this.name,
        stopReason: response.stop_reason,
      },
    };
  }

  /**
   * Generate structured JSON output.
   */
  async generateStructured<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<T> {
    // Build system prompt with JSON instructions
    const jsonSystemPrompt = `${systemPrompt || ''}

You must respond with valid JSON matching this exact schema:
${JSON.stringify(schema, null, 2)}

Return ONLY the JSON object, with no markdown code blocks, no explanation, and no additional text.`.trim();

    const response = await this.generateText(prompt, jsonSystemPrompt, {
      ...options,
      responseFormat: 'json',
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      return JSON.parse(jsonText.trim()) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse structured response: ${error instanceof Error ? error.message : 'Unknown error'}\nResponse: ${response.text}`
      );
    }
  }
}

/**
 * Singleton instance for convenience.
 */
let defaultInstance: AnthropicProvider | null = null;

/**
 * Get the default Anthropic provider instance.
 */
export function getAnthropicProvider(): AnthropicProvider {
  if (!defaultInstance) {
    defaultInstance = new AnthropicProvider();
  }
  return defaultInstance;
}
