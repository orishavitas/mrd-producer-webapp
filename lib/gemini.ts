/**
 * Gemini API Client
 *
 * Handles AI-powered text generation using Google's Gemini model.
 * Supports Google Search grounding for real-time web research.
 */

import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

let genAI: GoogleGenAI | null = null;

/**
 * Gets or creates the Gemini AI client instance.
 * Throws an error if GOOGLE_API_KEY is not configured.
 */
function getClient(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not configured');
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

/**
 * Checks if the Gemini API is configured and available.
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface GroundedSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GroundedResponse {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
}

/**
 * Generates text using Gemini.
 *
 * @param prompt - The user prompt to send to the model.
 * @param systemPrompt - Optional system instructions to guide the model.
 * @param options - Configuration options for generation.
 * @returns The generated text response.
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {}
): Promise<string> {
  const client = getClient();

  // Combine system prompt and user prompt
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  const response = await client.models.generateContent({
    model: options.model || 'gemini-1.5-flash',
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

  return text;
}

/**
 * Generates text with Google Search grounding.
 * The model will automatically search the web for relevant information.
 *
 * @param prompt - The user prompt to send to the model.
 * @param systemPrompt - Optional system instructions to guide the model.
 * @param options - Configuration options for generation.
 * @returns Response with text, sources, and search queries used.
 */
export async function generateWithSearch(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {}
): Promise<GroundedResponse> {
  const client = getClient();

  // Combine system prompt and user prompt
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  console.log('[Gemini] Generating with Google Search grounding...');

  const response = await client.models.generateContent({
    model: options.model || 'gemini-1.5-flash',
    contents: fullPrompt,
    config: {
      maxOutputTokens: options.maxTokens || 8192,
      temperature: options.temperature || 1.0, // Recommended for grounding
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No text response received from Gemini');
  }

  // Extract sources from grounding metadata
  const sources = extractSources(response);
  const searchQueries = extractSearchQueries(response);

  console.log(`[Gemini] Generated response with ${sources.length} sources from ${searchQueries.length} searches`);

  return {
    text,
    sources,
    searchQueries,
  };
}

/**
 * Extracts source citations from the grounding metadata.
 */
function extractSources(response: GenerateContentResponse): GroundedSource[] {
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

    // Extract from search entry point if available
    const supports = metadata.groundingSupports || [];
    for (const support of supports) {
      if (support.groundingChunkIndices) {
        // These reference the chunks above
        for (const idx of support.groundingChunkIndices) {
          const chunk = chunks[idx];
          if (chunk?.web && !sources.find(s => s.url === chunk.web?.uri)) {
            sources.push({
              title: chunk.web.title || 'Web Source',
              url: chunk.web.uri || '',
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('[Gemini] Error extracting sources:', error);
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
 * Extracts search queries used by the model.
 */
function extractSearchQueries(response: GenerateContentResponse): string[] {
  const queries: string[] = [];

  try {
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (!metadata) {
      return queries;
    }

    // Web search queries are in webSearchQueries
    if (metadata.webSearchQueries) {
      queries.push(...metadata.webSearchQueries);
    }
  } catch (error) {
    console.warn('[Gemini] Error extracting search queries:', error);
  }

  return queries;
}

/**
 * Performs research on a topic using Gemini with Google Search grounding.
 * Returns structured research findings.
 *
 * @param topic - The topic to research.
 * @param context - Additional context to guide the research.
 * @returns Research findings with sources.
 */
export async function conductResearch(
  topic: string,
  context?: string
): Promise<GroundedResponse> {
  const researchPrompt = `Research the following topic thoroughly using current web sources:

Topic: ${topic}
${context ? `\nContext: ${context}` : ''}

Provide a comprehensive research summary including:
1. Market overview and current trends
2. Key competitors and their offerings
3. Target audience insights and pain points
4. Pricing information if available
5. Recent developments and news

Be specific and cite your sources. Focus on factual, verifiable information.`;

  return generateWithSearch(researchPrompt, undefined, {
    temperature: 1.0,
    maxTokens: 4096,
  });
}
