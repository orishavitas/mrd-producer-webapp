/**
 * AI Provider Type Definitions
 *
 * Provider-agnostic interfaces for AI text generation.
 * All AI providers (Gemini, Claude, OpenAI) must implement these contracts.
 */

/**
 * Capability flags indicating what an AI provider supports.
 */
export interface ProviderCapabilities {
  /** Basic text generation */
  textGeneration: boolean;
  /** Built-in web search grounding (e.g., Gemini's Google Search) */
  searchGrounding: boolean;
  /** JSON/structured output mode */
  structuredOutput: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Function/tool calling */
  functionCalling: boolean;
}

/**
 * Standard options for AI generation requests.
 */
export interface GenerationOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for randomness (0-2) */
  temperature?: number;
  /** Top-p nucleus sampling */
  topP?: number;
  /** Stop sequences to end generation */
  stopSequences?: string[];
  /** Response format hint */
  responseFormat?: 'text' | 'json';
  /** Model override (provider-specific) */
  model?: string;
}

/**
 * Source citation from grounded search.
 */
export interface GroundedSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Token usage information.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

/**
 * Standard response from AI generation.
 */
export interface GenerationResponse {
  /** Generated text content */
  text: string;
  /** Token usage statistics (if available) */
  usage?: TokenUsage;
  /** Source citations from grounded search */
  sources?: GroundedSource[];
  /** Search queries used (for grounded search) */
  searchQueries?: string[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provider-agnostic AI interface.
 * All AI providers must implement this contract.
 */
export interface AIProvider {
  /** Provider identifier (e.g., 'gemini', 'claude', 'openai') */
  readonly name: string;
  /** Provider implementation version */
  readonly version: string;
  /** Supported capabilities */
  readonly capabilities: ProviderCapabilities;

  /**
   * Check if the provider is configured and available.
   * Typically checks for required environment variables.
   */
  isAvailable(): boolean;

  /**
   * Generate text completion.
   *
   * @param prompt - User prompt
   * @param systemPrompt - Optional system instructions
   * @param options - Generation options
   * @returns Generated response
   */
  generateText(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse>;

  /**
   * Generate text with web search grounding (if supported).
   * The model will automatically search the web for relevant information.
   *
   * Falls back to generateText if not supported.
   *
   * @param prompt - User prompt
   * @param systemPrompt - Optional system instructions
   * @param options - Generation options
   * @returns Generated response with sources
   */
  generateWithSearch?(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse>;

  /**
   * Generate structured JSON output (if supported).
   *
   * @param prompt - User prompt
   * @param schema - JSON schema for validation
   * @param systemPrompt - Optional system instructions
   * @param options - Generation options
   * @returns Parsed JSON matching schema
   */
  generateStructured?<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<T>;
}

/**
 * Provider registration entry.
 */
export interface ProviderEntry {
  provider: AIProvider;
  priority: number;
  enabled: boolean;
}

/**
 * Provider chain configuration.
 */
export interface ProviderChainConfig {
  /** Provider priority order (first = highest priority) */
  priority: string[];
  /** Maximum fallback attempts */
  maxAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Callback when falling back to another provider */
  onFallback?: (fromProvider: string, toProvider: string, error: Error) => void;
}
