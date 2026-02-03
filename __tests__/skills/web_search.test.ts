import { searchWeb, isSearchAvailable, SearchResult } from '@/skills/web_search';

// Mock fetch for API tests
global.fetch = jest.fn();

describe('web_search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSearchAvailable', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true when both API keys are set', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-id';
      expect(isSearchAvailable()).toBe(true);
    });

    it('should return false when GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY;
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-id';
      expect(isSearchAvailable()).toBe(false);
    });

    it('should return false when GOOGLE_SEARCH_ENGINE_ID is missing', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      delete process.env.GOOGLE_SEARCH_ENGINE_ID;
      expect(isSearchAvailable()).toBe(false);
    });
  });

  describe('searchWeb', () => {
    it('should return mock results when API is not configured', async () => {
      // Temporarily remove API keys
      const originalApiKey = process.env.GOOGLE_API_KEY;
      const originalSearchId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_SEARCH_ENGINE_ID;

      const results = await searchWeb('test query');

      expect(results).toHaveLength(4);
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('url');
      expect(results[0]).toHaveProperty('snippet');
      expect(results[0].title).toContain('test query');

      // Restore API keys
      process.env.GOOGLE_API_KEY = originalApiKey;
      process.env.GOOGLE_SEARCH_ENGINE_ID = originalSearchId;
    });

    it('should call Google API when configured', async () => {
      const mockResponse = {
        items: [
          {
            title: 'Test Result 1',
            link: 'https://example.com/1',
            snippet: 'This is a test snippet',
          },
          {
            title: 'Test Result 2',
            link: 'https://example.com/2',
            snippet: 'Another test snippet',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await searchWeb('test query');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com/customsearch')
      );
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Test Result 1');
      expect(results[0].url).toBe('https://example.com/1');
    });

    it('should respect maxResults option', async () => {
      const mockResponse = {
        items: [
          { title: 'Result 1', link: 'https://example.com/1', snippet: 'Snippet 1' },
          { title: 'Result 2', link: 'https://example.com/2', snippet: 'Snippet 2' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await searchWeb('test query', { maxResults: 2 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('num=2')
      );
    });

    it('should fall back to mock results on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const results = await searchWeb('test query');

      // Should return mock results
      expect(results).toHaveLength(4);
      expect(results[0].url).toBe('https://example.com/market-research');
    });

    it('should handle empty API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const results = await searchWeb('test query');

      expect(results).toHaveLength(0);
    });

    it('should handle missing items in API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const results = await searchWeb('test query');

      expect(results).toHaveLength(0);
    });
  });
});
