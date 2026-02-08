/**
 * Mock utilities for agent testing
 */

import { ExecutionContext, LogLevel, AgentConfig, DEFAULT_AGENT_CONFIG } from '@/agent/core/types';
import { AIProvider, ProviderCapabilities } from '@/lib/providers/types';

/**
 * Create a mock AI provider for testing.
 */
export function createMockProvider(overrides?: Partial<AIProvider>): AIProvider {
  return {
    name: 'mock-provider',
    version: '1.0.0',
    capabilities: {
      textGeneration: true,
      searchGrounding: false,
      streaming: false,
      functionCalling: false,
      imageAnalysis: false,
    },
    async generateText(prompt: string, systemPrompt?: string): Promise<string> {
      return JSON.stringify({
        sections: {
          1: '## 1. Test Section\n\nMock generated content\n\n---',
        },
        confidence: { 1: 75 },
        dataSources: { 1: ['user'] },
        gaps: [],
        domain: 'test',
      });
    },
    async healthCheck(): Promise<boolean> {
      return true;
    },
    ...overrides,
  };
}

/**
 * Create a mock execution context for testing.
 */
export function createMockExecutionContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  const logs: Array<{ level: LogLevel; message: string; data?: unknown }> = [];
  const events: Array<{ event: string; data: unknown }> = [];
  const provider = createMockProvider();

  return {
    requestId: 'TEST-001',
    traceId: 'TRACE-001',
    getProvider: () => provider,
    getFallbackChain: () => [provider],
    state: new Map(),
    log: (level: LogLevel, message: string, data?: unknown) => {
      logs.push({ level, message, data });
    },
    config: { ...DEFAULT_AGENT_CONFIG },
    emit: (event: string, data: unknown) => {
      events.push({ event, data });
    },
    ...overrides,
  };
}

/**
 * Get logs from mock context.
 */
export function getMockContextLogs(
  context: ExecutionContext
): Array<{ level: LogLevel; message: string; data?: unknown }> {
  const logs: Array<{ level: LogLevel; message: string; data?: unknown }> = [];
  const originalLog = context.log;

  context.log = (level: LogLevel, message: string, data?: unknown) => {
    logs.push({ level, message, data });
    originalLog(level, message, data);
  };

  return logs;
}
