# AI Providers Guide

This document explains how to implement, configure, and use AI providers in the MRD Producer multi-agent system.

---

## Overview

The MRD Producer uses a **provider abstraction layer** that allows agents to work with multiple AI services (Gemini, Claude, OpenAI) without code changes. The system includes automatic fallback, retry logic, and capability detection.

### Key Benefits

1. **Provider Agnostic**: Agents don't depend on specific AI services
2. **Automatic Fallback**: Failed requests automatically retry with alternate providers
3. **Capability-Based Selection**: Choose providers based on required features
4. **Unified Interface**: Consistent API across all providers
5. **Easy Extension**: Add new providers by implementing a single interface

---

## Provider Interface

All providers must implement the `AIProvider` interface from `lib/providers/types.ts`:

```typescript
interface AIProvider {
  // Identity
  readonly name: string;           // e.g., 'gemini', 'claude', 'openai'
  readonly version: string;        // e.g., '1.0.0'
  readonly capabilities: ProviderCapabilities;

  // Availability check
  isAvailable(): boolean;

  // Core method: text generation
  generateText(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse>;

  // Optional: search-grounded generation
  generateWithSearch?(
    prompt: string,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<GenerationResponse>;

  // Optional: structured JSON output
  generateStructured?<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<T>;
}
```

### Capabilities

Providers declare their capabilities:

```typescript
interface ProviderCapabilities {
  textGeneration: boolean;      // Basic text generation
  searchGrounding: boolean;     // Built-in web search (e.g., Gemini)
  structuredOutput: boolean;    // JSON/structured output mode
  streaming: boolean;           // Streaming responses
  functionCalling: boolean;     // Function/tool calling
}
```

### Generation Options

Standard options supported across providers:

```typescript
interface GenerationOptions {
  maxTokens?: number;          // Maximum tokens to generate
  temperature?: number;        // Randomness (0-2)
  topP?: number;              // Nucleus sampling
  stopSequences?: string[];   // Stop generation at these sequences
  responseFormat?: 'text' | 'json';  // Response format hint
  model?: string;             // Override default model
}
```

### Generation Response

Standardized response format:

```typescript
interface GenerationResponse {
  text: string;                    // Generated text content
  usage?: TokenUsage;              // Token consumption stats
  sources?: GroundedSource[];      // Citations (if search grounding used)
  searchQueries?: string[];        // Search queries executed
  metadata?: Record<string, unknown>;  // Provider-specific data
}
```

---

## Current Providers

### Gemini Provider

Google's Gemini with built-in Google Search grounding.

**File**: `lib/providers/gemini-provider.ts`

**Capabilities**:
- Text generation: ✅
- Search grounding: ✅ (Google Search)
- Structured output: ✅
- Streaming: ✅
- Function calling: ✅

**Configuration**:
```typescript
// Environment variable
GOOGLE_API_KEY=your-api-key

// Default model
const DEFAULT_MODEL = 'gemini-2.5-flash';
```

**Example**:
```typescript
import { getGeminiProvider } from '@/lib/providers/gemini-provider';

const gemini = getGeminiProvider();

if (gemini.isAvailable()) {
  const response = await gemini.generateText(
    'What are the latest smart home trends?',
    'You are a market research analyst',
    { maxTokens: 2048, temperature: 0.7 }
  );

  console.log(response.text);
  console.log('Sources:', response.sources);
}
```

### Claude Provider

Anthropic's Claude models.

**File**: `lib/providers/anthropic-provider.ts`

**Capabilities**:
- Text generation: ✅
- Search grounding: ❌
- Structured output: ✅
- Streaming: ✅
- Function calling: ✅

**Configuration**:
```typescript
// Environment variable
ANTHROPIC_API_KEY=your-api-key

// Default model
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
```

**Example**:
```typescript
import { getAnthropicProvider } from '@/lib/providers/anthropic-provider';

const claude = getAnthropicProvider();

if (claude.isAvailable()) {
  const response = await claude.generateText(
    'Analyze this product concept',
    'You are a product strategist'
  );

  console.log(response.text);
  console.log('Tokens used:', response.usage?.totalTokens);
}
```

### OpenAI Provider

OpenAI's GPT models.

**File**: `lib/providers/openai-provider.ts`

**Capabilities**:
- Text generation: ✅
- Search grounding: ❌
- Structured output: ✅
- Streaming: ✅
- Function calling: ✅

**Configuration**:
```typescript
// Environment variable
OPENAI_API_KEY=your-api-key

// Default model
const DEFAULT_MODEL = 'gpt-4o';
```

**Example**:
```typescript
import { getOpenAIProvider } from '@/lib/providers/openai-provider';

const openai = getOpenAIProvider();

if (openai.isAvailable()) {
  const response = await openai.generateText(
    'Generate a market analysis',
    'You are a market analyst'
  );

  console.log(response.text);
}
```

---

## Provider Chain

The **Provider Chain** enables automatic fallback between providers.

**File**: `lib/providers/provider-chain.ts`

### Basic Usage

```typescript
import { getProviderChain } from '@/lib/providers/provider-chain';

const chain = getProviderChain();

// Execute with automatic fallback
const { result, providerUsed } = await chain.executeWithFallback(
  async (provider) => {
    return await provider.generateText(
      'Your prompt here',
      'Your system prompt'
    );
  }
);

console.log(`Used provider: ${providerUsed}`);
console.log(`Result: ${result.text}`);
```

### Custom Configuration

```typescript
import { ProviderChain } from '@/lib/providers/provider-chain';
import { getGeminiProvider } from '@/lib/providers/gemini-provider';
import { getAnthropicProvider } from '@/lib/providers/anthropic-provider';

const chain = new ProviderChain({
  priority: ['gemini', 'claude', 'openai'],
  maxAttempts: 3,
  retryDelayMs: 1000,
  onFallback: (from, to, error) => {
    console.log(`Falling back from ${from} to ${to}: ${error.message}`);
  },
});

// Register providers
chain.registerProvider(getGeminiProvider(), 1);
chain.registerProvider(getAnthropicProvider(), 2);

// Execute
const { result, providerUsed } = await chain.executeWithFallback(
  (provider) => provider.generateText('Your prompt')
);
```

### Priority Configuration

Providers are tried in priority order (lower number = higher priority):

```typescript
chain.registerProvider(geminiProvider, 1);   // Tried first
chain.registerProvider(claudeProvider, 2);   // Tried second
chain.registerProvider(openaiProvider, 3);   // Tried third
```

### Capability-Based Selection

Select providers based on required capabilities:

```typescript
// Get provider with search grounding
const provider = chain.getProvider({ searchGrounding: true });

// Get any available provider with structured output
const provider = chain.getProvider({ structuredOutput: true });
```

---

## Provider Comparison

| Feature | Gemini | Claude | OpenAI |
|---------|--------|--------|--------|
| **Search Grounding** | ✅ Google Search | ❌ | ❌ |
| **Context Window** | 1M tokens | 200K tokens | 128K tokens |
| **Structured Output** | ✅ | ✅ | ✅ |
| **Streaming** | ✅ | ✅ | ✅ |
| **Function Calling** | ✅ | ✅ | ✅ |
| **Best For** | Research with sources | Long reasoning tasks | General purpose |
| **Cost** | Low | Medium | Medium-High |

### When to Use Each Provider

**Gemini**:
- Research tasks requiring web search
- MRD generation with citations
- Cost-sensitive applications
- Large context requirements

**Claude**:
- Complex reasoning tasks
- Long-form content generation
- Detailed analysis
- Fallback when Gemini unavailable

**OpenAI**:
- Structured output tasks
- JSON generation
- General purpose generation
- Fallback provider

---

## Adding a New Provider

### Step 1: Implement the Interface

Create a new file in `lib/providers/`:

```typescript
// lib/providers/my-provider.ts

import {
  AIProvider,
  ProviderCapabilities,
  GenerationOptions,
  GenerationResponse,
} from './types';

export class MyProvider implements AIProvider {
  readonly name = 'my-provider';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    textGeneration: true,
    searchGrounding: false,
    structuredOutput: true,
    streaming: true,
    functionCalling: false,
  };

  private client: any = null;

  isAvailable(): boolean {
    return !!process.env.MY_PROVIDER_API_KEY;
  }

  private getClient() {
    if (!this.client) {
      const apiKey = process.env.MY_PROVIDER_API_KEY;
      if (!apiKey) {
        throw new Error('MY_PROVIDER_API_KEY is not configured');
      }
      // Initialize your provider's client
      this.client = new MyProviderClient({ apiKey });
    }
    return this.client;
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    const client = this.getClient();

    // Call your provider's API
    const response = await client.generate({
      prompt,
      systemPrompt,
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    });

    // Map response to standard format
    return {
      text: response.output,
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
      },
      metadata: {
        model: response.model,
        provider: this.name,
      },
    };
  }
}

// Singleton instance
let defaultInstance: MyProvider | null = null;

export function getMyProvider(): MyProvider {
  if (!defaultInstance) {
    defaultInstance = new MyProvider();
  }
  return defaultInstance;
}
```

### Step 2: Register in Provider Chain

Update `lib/providers/provider-chain.ts`:

```typescript
import { getMyProvider } from './my-provider';

export function getProviderChain(config?: ProviderChainConfig): ProviderChain {
  const chain = new ProviderChain(config);

  // Register all available providers
  if (getGeminiProvider().isAvailable()) {
    chain.registerProvider(getGeminiProvider(), 1);
  }
  if (getAnthropicProvider().isAvailable()) {
    chain.registerProvider(getAnthropicProvider(), 2);
  }
  if (getOpenAIProvider().isAvailable()) {
    chain.registerProvider(getOpenAIProvider(), 3);
  }
  // Add your provider
  if (getMyProvider().isAvailable()) {
    chain.registerProvider(getMyProvider(), 4);
  }

  return chain;
}
```

### Step 3: Update Configuration

Add to `config/agents/default.yaml`:

```yaml
providers:
  priority:
    - gemini
    - claude
    - openai
    - my-provider  # Add here

  my-provider:
    model: "my-model-v1"
    temperature: 0.7
    maxTokens: 4096
```

### Step 4: Update Environment Variables

Add to `.env.local`:

```bash
MY_PROVIDER_API_KEY=your-api-key-here
```

Update documentation to include:
- `MY_PROVIDER_API_KEY` in environment variables table
- Provider capabilities in comparison tables

---

## Configuration Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_API_KEY` | Yes* | Google Gemini API key | `AIza...` |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key | `sk-ant-...` |
| `OPENAI_API_KEY` | No | OpenAI API key | `sk-...` |
| `USE_MULTI_AGENT` | No | Enable multi-agent system | `true` |

*At least one provider API key is required.

### YAML Configuration

Priority and settings in `config/agents/default.yaml`:

```yaml
providers:
  # Priority order (first = highest)
  priority:
    - gemini    # Try first
    - claude    # Then fallback to Claude
    - openai    # Then fallback to OpenAI

  # Provider-specific settings
  gemini:
    model: "gemini-2.5-flash"
    temperature: 0.7
    maxTokens: 8192
    searchGrounding: true

  claude:
    model: "claude-3-5-sonnet-20241022"
    temperature: 0.7
    maxTokens: 8192

  openai:
    model: "gpt-4o"
    temperature: 0.7
    maxTokens: 8192

# Fallback behavior
patterns:
  fallback:
    enabled: true
    maxAttempts: 3
    retryDelayMs: 1000
    exponentialBackoff: false
```

---

## Best Practices

### 1. Always Check Availability

```typescript
const provider = getGeminiProvider();
if (!provider.isAvailable()) {
  throw new Error('Gemini provider is not configured');
}
```

### 2. Use Provider Chain for Reliability

```typescript
// Good: Automatic fallback
const chain = getProviderChain();
const { result } = await chain.executeWithFallback(
  (provider) => provider.generateText(prompt)
);

// Avoid: Single provider without fallback
const gemini = getGeminiProvider();
const result = await gemini.generateText(prompt); // May fail
```

### 3. Prefer Search Grounding for Research

```typescript
const provider = chain.getProvider({ searchGrounding: true });
if (provider.capabilities.searchGrounding) {
  // Use search-enabled generation
  const result = await provider.generateWithSearch?.(
    'Research smart home market trends'
  );
}
```

### 4. Handle Token Limits

```typescript
const response = await provider.generateText(prompt, systemPrompt, {
  maxTokens: 4096, // Set appropriate limit
});

if (response.usage) {
  console.log(`Tokens used: ${response.usage.totalTokens}`);
}
```

### 5. Log Fallbacks for Monitoring

```typescript
const chain = new ProviderChain({
  onFallback: (from, to, error) => {
    logger.warn(`Provider fallback: ${from} -> ${to}`, { error });
    // Track metrics for alerting
  },
});
```

---

## Troubleshooting

### Provider Not Available

**Symptom**: `isAvailable()` returns `false`

**Solution**:
1. Check environment variable is set
2. Verify variable name matches (e.g., `GOOGLE_API_KEY` not `GEMINI_API_KEY`)
3. Restart development server after adding variables
4. Check `.env.local` is in project root

### Fallback Chain Not Working

**Symptom**: Requests fail instead of trying next provider

**Solution**:
1. Check `patterns.fallback.enabled` is `true` in config
2. Verify multiple providers are available
3. Check error type is retryable
4. Review `maxAttempts` setting

### Search Grounding Not Working

**Symptom**: No sources returned in response

**Solution**:
1. Verify provider supports search grounding (only Gemini)
2. Use `generateWithSearch()` method if available
3. Check prompt requests web research
4. Verify GOOGLE_API_KEY is for Gemini (not Custom Search)

### High Token Usage

**Symptom**: Requests consuming too many tokens

**Solution**:
1. Set appropriate `maxTokens` limits
2. Use more concise prompts
3. Consider using faster models (e.g., `gemini-1.5-flash`)
4. Implement caching for repeated queries

---

## Testing Providers

See `__tests__/lib/providers/` for test examples:

```typescript
// __tests__/lib/providers/my-provider.test.ts

import { MyProvider } from '@/lib/providers/my-provider';

describe('MyProvider', () => {
  let provider: MyProvider;

  beforeEach(() => {
    provider = new MyProvider();
    // Mock API calls
    jest.spyOn(provider as any, 'getClient').mockReturnValue({
      generate: jest.fn().mockResolvedValue({
        output: 'Test response',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      }),
    });
  });

  it('should generate text', async () => {
    const response = await provider.generateText('Test prompt');
    expect(response.text).toBe('Test response');
    expect(response.usage?.totalTokens).toBe(30);
  });

  it('should report correct capabilities', () => {
    expect(provider.capabilities.textGeneration).toBe(true);
  });
});
```

---

## Related Documentation

- [AGENT.md](./AGENT.md) - Agent behavioral contracts
- [CLAUDE.md](../CLAUDE.md) - Project overview
- [lib/providers/types.ts](../lib/providers/types.ts) - TypeScript interfaces
- [config/agents/default.yaml](../config/agents/default.yaml) - Configuration reference
