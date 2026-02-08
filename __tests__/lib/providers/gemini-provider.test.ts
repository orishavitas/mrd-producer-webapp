/**
 * Tests for Gemini AI Provider
 */

import { GeminiProvider } from '@/lib/providers/gemini-provider';
import { GoogleGenAI } from '@google/genai';

// Mock the Google GenAI SDK
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockClient: jest.Mocked<any>;

  beforeEach(() => {
    // Reset environment
    delete process.env.GOOGLE_API_KEY;

    // Create mock client
    mockClient = {
      models: {
        generateContent: jest.fn(),
      },
    };

    // Mock GoogleGenAI constructor
    (GoogleGenAI as jest.Mock).mockImplementation(() => mockClient);

    provider = new GeminiProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Identity', () => {
    it('should have correct name and version', () => {
      expect(provider.name).toBe('gemini');
      expect(provider.version).toBe('1.0.0');
    });

    it('should declare all capabilities', () => {
      expect(provider.capabilities).toEqual({
        textGeneration: true,
        searchGrounding: true,
        structuredOutput: true,
        streaming: true,
        functionCalling: true,
      });
    });
  });

  describe('isAvailable', () => {
    it('should return false when GOOGLE_API_KEY is not set', () => {
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return true when GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false for empty GOOGLE_API_KEY', () => {
      process.env.GOOGLE_API_KEY = '';
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('generateText', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
    });

    it('should throw error if API key not configured', async () => {
      delete process.env.GOOGLE_API_KEY;
      const newProvider = new GeminiProvider();

      await expect(
        newProvider.generateText('Test prompt')
      ).rejects.toThrow('GOOGLE_API_KEY environment variable is not configured');
    });

    it('should generate text successfully', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Generated response',
      });

      const response = await provider.generateText('Test prompt');

      expect(response.text).toBe('Generated response');
      expect(response.metadata?.provider).toBe('gemini');
      expect(mockClient.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: 'Test prompt',
        config: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      });
    });

    it('should combine system and user prompts', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response',
      });

      await provider.generateText(
        'User prompt',
        'System instructions'
      );

      expect(mockClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('System instructions'),
        })
      );
      expect(mockClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('User prompt'),
        })
      );
    });

    it('should pass custom options', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response',
      });

      await provider.generateText('Prompt', undefined, {
        maxTokens: 2048,
        temperature: 0.5,
        model: 'gemini-pro',
      });

      expect(mockClient.models.generateContent).toHaveBeenCalledWith({
        model: 'gemini-pro',
        contents: 'Prompt',
        config: {
          maxOutputTokens: 2048,
          temperature: 0.5,
        },
      });
    });

    it('should throw error if no text in response', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: null,
      });

      await expect(
        provider.generateText('Prompt')
      ).rejects.toThrow('No text response received from Gemini');
    });

    it('should propagate API errors', async () => {
      mockClient.models.generateContent.mockRejectedValueOnce(
        new Error('API Error: Rate limit exceeded')
      );

      await expect(
        provider.generateText('Prompt')
      ).rejects.toThrow('API Error: Rate limit exceeded');
    });
  });

  describe('generateWithSearch', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
    });

    it('should enable Google Search grounding', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Search-grounded response',
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [],
              webSearchQueries: [],
            },
          },
        ],
      });

      await provider.generateWithSearch('Research smart home market');

      expect(mockClient.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            tools: [{ googleSearch: {} }],
            temperature: 1.0,
          }),
        })
      );
    });

    it('should extract sources from grounding metadata', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response with sources',
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: 'Smart Home Market Report',
                    uri: 'https://example.com/report',
                  },
                },
                {
                  web: {
                    title: 'IoT Trends 2024',
                    uri: 'https://example.com/trends',
                  },
                },
              ],
              webSearchQueries: ['smart home market 2024'],
            },
          },
        ],
      });

      const response = await provider.generateWithSearch('Research market');

      expect(response.sources).toHaveLength(2);
      expect(response.sources?.[0]).toEqual({
        title: 'Smart Home Market Report',
        url: 'https://example.com/report',
      });
      expect(response.searchQueries).toEqual(['smart home market 2024']);
    });

    it('should deduplicate sources by URL', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response',
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                {
                  web: {
                    title: 'Source 1',
                    uri: 'https://example.com/same',
                  },
                },
                {
                  web: {
                    title: 'Source 2 (duplicate)',
                    uri: 'https://example.com/same',
                  },
                },
              ],
            },
          },
        ],
      });

      const response = await provider.generateWithSearch('Prompt');

      expect(response.sources).toHaveLength(1);
      expect(response.sources?.[0].title).toBe('Source 1');
    });

    it('should handle missing grounding metadata gracefully', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response without grounding',
        candidates: [],
      });

      const response = await provider.generateWithSearch('Prompt');

      expect(response.text).toBe('Response without grounding');
      expect(response.sources).toEqual([]);
      expect(response.searchQueries).toEqual([]);
    });

    it('should handle malformed grounding metadata', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Response',
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [
                { web: null }, // Invalid chunk
                { web: { uri: 'https://example.com' } }, // No title
              ],
            },
          },
        ],
      });

      const response = await provider.generateWithSearch('Prompt');

      expect(response.sources).toHaveLength(1);
      expect(response.sources?.[0].title).toBe('Web Source');
    });
  });

  describe('generateStructured', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-api-key';
    });

    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
      },
    };

    it('should parse valid JSON response', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: '{"name": "Product", "price": 99}',
      });

      const result = await provider.generateStructured<any>(
        'Extract data',
        schema
      );

      expect(result).toEqual({ name: 'Product', price: 99 });
    });

    it('should handle JSON in markdown code blocks', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: '```json\n{"name": "Product", "price": 99}\n```',
      });

      const result = await provider.generateStructured<any>(
        'Extract data',
        schema
      );

      expect(result).toEqual({ name: 'Product', price: 99 });
    });

    it('should handle JSON with ``` prefix only', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: '```\n{"name": "Product", "price": 99}\n```',
      });

      const result = await provider.generateStructured<any>(
        'Extract data',
        schema
      );

      expect(result).toEqual({ name: 'Product', price: 99 });
    });

    it('should include schema in prompt', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: '{"name": "Test"}',
      });

      await provider.generateStructured('Prompt', schema);

      const callArgs = mockClient.models.generateContent.mock.calls[0][0];
      expect(callArgs.contents).toContain('Respond with valid JSON');
      expect(callArgs.contents).toContain(JSON.stringify(schema, null, 2));
    });

    it('should throw error on invalid JSON', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: 'Not valid JSON',
      });

      await expect(
        provider.generateStructured('Prompt', schema)
      ).rejects.toThrow('Failed to parse structured response');
    });

    it('should throw error on malformed JSON', async () => {
      mockClient.models.generateContent.mockResolvedValueOnce({
        text: '{"name": "Product", "price":}',
      });

      await expect(
        provider.generateStructured('Prompt', schema)
      ).rejects.toThrow('Failed to parse structured response');
    });
  });

  describe('Client Singleton', () => {
    it('should reuse client instance across calls', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';

      mockClient.models.generateContent.mockResolvedValue({
        text: 'Response',
      });

      await provider.generateText('Prompt 1');
      await provider.generateText('Prompt 2');

      // GoogleGenAI constructor should only be called once
      expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
    });

    it('should handle network errors', async () => {
      mockClient.models.generateContent.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        provider.generateText('Prompt')
      ).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockClient.models.generateContent.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(
        provider.generateText('Prompt')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle rate limit errors', async () => {
      mockClient.models.generateContent.mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      );

      await expect(
        provider.generateText('Prompt')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
