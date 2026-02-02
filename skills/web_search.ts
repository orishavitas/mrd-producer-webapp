/**
 * Web Search Skill
 *
 * Performs web searches using Google Custom Search API.
 * Falls back to mock data when API keys are not configured.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface SearchOptions {
  maxResults?: number;
}

/**
 * Checks if Google Custom Search is configured and available.
 */
export function isSearchAvailable(): boolean {
  return !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
}

/**
 * Performs a web search using Google Custom Search API.
 * Falls back to mock results if API is not configured.
 *
 * @param query - The search query string.
 * @param options - Search configuration options.
 * @returns A promise that resolves to an array of SearchResult objects.
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  console.log(`[WebSearch] Searching for: "${query}"`);

  // Fall back to mock data if API is not configured
  if (!apiKey || !searchEngineId) {
    console.warn('[WebSearch] Google API not configured, using mock data');
    await new Promise(resolve => setTimeout(resolve, 300));
    return getMockResults(query);
  }

  try {
    const maxResults = options.maxResults || 5;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebSearch] API error:', response.status, errorText);
      throw new Error(`Search API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log('[WebSearch] No results found');
      return [];
    }

    return data.items.map((item: { title: string; link: string; snippet: string }) => ({
      title: item.title || 'Untitled',
      url: item.link || '',
      snippet: item.snippet || '',
    }));
  } catch (error) {
    console.error('[WebSearch] Error performing search:', error);
    // Fall back to mock data on error
    return getMockResults(query);
  }
}

/**
 * Returns mock search results for development/testing.
 */
function getMockResults(query: string): SearchResult[] {
  return [
    {
      title: `Market Research: ${query}`,
      url: 'https://example.com/market-research',
      snippet: `Comprehensive market research report on "${query}". Covers key trends, market size, and growth projections for the upcoming year.`,
    },
    {
      title: `Top Competitors in ${query} Space`,
      url: 'https://example.com/competitors',
      snippet: `Analysis of top competitors in the "${query}" space. Includes market share data, strengths, weaknesses, and strategic positioning.`,
    },
    {
      title: `User Reviews and Feedback for ${query} Solutions`,
      url: 'https://example.com/reviews',
      snippet: `Aggregated user reviews for "${query}" products. Common pain points, feature requests, and satisfaction metrics identified.`,
    },
    {
      title: `Emerging Technologies in ${query}`,
      url: 'https://example.com/tech-trends',
      snippet: `Overview of emerging technologies shaping the future of "${query}". AI integration, automation trends, and innovation opportunities.`,
    },
  ];
}
