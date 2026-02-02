/**
 * Gemini Pro API Client
 *
 * Handles AI-powered text generation using Google's Gemini Pro model.
 * Used for intelligent MRD synthesis and analysis.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Gets or creates the Gemini AI client instance.
 * Throws an error if GOOGLE_API_KEY is not configured.
 */
function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not configured');
    }
    genAI = new GoogleGenerativeAI(apiKey);
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

/**
 * Generates text using Gemini Pro.
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

  const model = client.getGenerativeModel({
    model: options.model || 'gemini-pro',
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    },
  });

  // Combine system prompt and user prompt
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('No text response received from Gemini');
  }

  return text;
}

/**
 * Generates text with streaming support.
 * Useful for long-form content generation with progress updates.
 */
export async function generateTextStream(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void,
  options: GenerateOptions = {}
): Promise<string> {
  const client = getClient();

  const model = client.getGenerativeModel({
    model: options.model || 'gemini-pro',
    generationConfig: {
      maxOutputTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    },
  });

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  const result = await model.generateContentStream(fullPrompt);

  let fullText = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onChunk) {
      onChunk(chunkText);
    }
  }

  return fullText;
}
