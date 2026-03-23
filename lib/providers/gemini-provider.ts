/**
 * Gemini AI Provider
 *
 * Implements the AIProvider interface for Google's Gemini model.
 * Wraps the existing lib/gemini.ts functionality with the new provider abstraction.
 */

import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  AIProvider,
  ProviderCapabilities,
  GenerationOptions,
  GenerationResponse,
  GroundedSource,
} from './types';

/**
 * Default model to use for Gemini requests.
 */
const DEFAULT_MODEL = 'gemini-2.5-pro';

/**
 * Gemini provider implementation.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    textGeneration: true,
    searchGrounding: true,
    structuredOutput: true,
    streaming: true,
    functionCalling: true,
  };

  private client: GoogleGenAI | null = null;

  /**
   * Check if Gemini is available (API key configured).
   */
  isAvailable(): boolean {
    return !!process.env.GOOGLE_API_KEY;
  }

  /**
   * Get or create the Gemini client instance.
   */
  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not configured');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate text using Gemini.
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const client = this.getClient();

    // Combine system prompt and user prompt
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${prompt}`
      : prompt;

    const response = await client.models.generateContent({
      model: options.model || DEFAULT_MODEL,
      contents: fullPrompt,
      config: {
        maxOutputTokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text response received from Gemini');
    }

    return {
      text,
      metadata: {
        model: options.model || DEFAULT_MODEL,
        provider: this.name,
      },
    };
  }

  /**
   * Generate text with Google Search grounding.
   * The model will automatically search the web for relevant information.
   */
  async generateWithSearch(
    prompt: string,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const client = this.getClient();

    // Combine system prompt and user prompt
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${prompt}`
      : prompt;

    console.log('[GeminiProvider] Generating with Google Search grounding...');

    const response = await client.models.generateContent({
      model: options.model || DEFAULT_MODEL,
      contents: fullPrompt,
      config: {
        maxOutputTokens: options.maxTokens || 8192,
        temperature: options.temperature ?? 1.0, // Recommended for grounding
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text response received from Gemini');
    }

    // Extract sources from grounding metadata
    const sources = this.extractSources(response);
    const searchQueries = this.extractSearchQueries(response);

    console.log(
      `[GeminiProvider] Generated response with ${sources.length} sources from ${searchQueries.length} searches`
    );

    return {
      text,
      sources,
      searchQueries,
      metadata: {
        model: options.model || DEFAULT_MODEL,
        provider: this.name,
        grounded: true,
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
    const structuredPrompt = `${prompt}

Respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY the JSON object, no markdown or explanation.`;

    const response = await this.generateText(structuredPrompt, systemPrompt, {
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
        `Failed to parse structured response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract source citations from the grounding metadata.
   */
  private extractSources(response: GenerateContentResponse): GroundedSource[] {
    const sources: GroundedSource[] = [];

    try {
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (!metadata) {
        return sources;
      }

      // Extract from grounding chunks
      const chunks = metadata.groundingChunks || [];
      for (const chunk of chunks) {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || 'Web Source',
            url: chunk.web.uri || '',
          });
        }
      }

      // Extract from grounding supports if available
      const supports = metadata.groundingSupports || [];
      for (const support of supports) {
        if (support.groundingChunkIndices) {
          for (const idx of support.groundingChunkIndices) {
            const chunk = chunks[idx];
            if (chunk?.web && !sources.find((s) => s.url === chunk.web?.uri)) {
              sources.push({
                title: chunk.web.title || 'Web Source',
                url: chunk.web.uri || '',
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('[GeminiProvider] Error extracting sources:', error);
    }

    // Deduplicate by URL
    const uniqueSources = new Map<string, GroundedSource>();
    for (const source of sources) {
      if (source.url && !uniqueSources.has(source.url)) {
        uniqueSources.set(source.url, source);
      }
    }

    return Array.from(uniqueSources.values());
  }

  /**
   * Extract search queries used by the model.
   */
  private extractSearchQueries(response: GenerateContentResponse): string[] {
    const queries: string[] = [];

    try {
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (!metadata) {
        return queries;
      }

      if (metadata.webSearchQueries) {
        queries.push(...metadata.webSearchQueries);
      }
    } catch (error) {
      console.warn('[GeminiProvider] Error extracting search queries:', error);
    }

    return queries;
  }
}

/**
 * Singleton instance for convenience.
 */
let defaultInstance: GeminiProvider | null = null;

/**
 * Get the default Gemini provider instance.
 */
export function getGeminiProvider(): GeminiProvider {
  if (!defaultInstance) {
    defaultInstance = new GeminiProvider();
  }
  return defaultInstance;
}
