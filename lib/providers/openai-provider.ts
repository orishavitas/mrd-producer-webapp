/**
 * OpenAI Provider
 *
 * Implements the AIProvider interface for OpenAI's GPT models.
 */

import OpenAI from 'openai';
import {
  AIProvider,
  ProviderCapabilities,
  GenerationOptions,
  GenerationResponse,
  TokenUsage,
} from './types';

/**
 * Default model to use for OpenAI requests.
 */
const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    textGeneration: true,
    searchGrounding: false, // OpenAI doesn't have built-in search grounding
    structuredOutput: true,
    streaming: true,
    functionCalling: true,
  };

  private client: OpenAI | null = null;

  /**
   * Check if OpenAI is available (API key configured).
   */
  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Get or create the OpenAI client instance.
   */
  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not configured');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate text using OpenAI.
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const client = this.getClient();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP,
      stop: options.stopSequences,
      response_format:
        options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    });

    // Extract text from response
    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('No text response received from OpenAI');
    }

    // Extract token usage
    const usage: TokenUsage | undefined = response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    return {
      text: choice.message.content,
      usage,
      metadata: {
        model: response.model,
        provider: this.name,
        finishReason: choice.finish_reason,
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
let defaultInstance: OpenAIProvider | null = null;

/**
 * Get the default OpenAI provider instance.
 */
export function getOpenAIProvider(): OpenAIProvider {
  if (!defaultInstance) {
    defaultInstance = new OpenAIProvider();
  }
  return defaultInstance;
}
