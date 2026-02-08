/**
 * Competitor Researcher Agent
 *
 * Conducts competitive analysis research using web search grounding.
 * Focuses on identifying competitor products, their pricing, features,
 * market positioning, strengths, and weaknesses.
 *
 * Requires at least 3 competitor products for quality research.
 */

import {
  BaseResearcherAgent,
  ResearchInput,
  ResearchOutput,
} from './base-researcher';
import { ExecutionContext } from '@/agent/core/types';
import { GroundedSource } from '@/lib/providers/types';

/**
 * Competitor product information.
 */
export interface CompetitorInfo {
  /** Company/brand name */
  company: string;
  /** Product name */
  productName: string;
  /** Product URL (if available) */
  url?: string;
  /** Pricing information */
  pricing: {
    /** Price value */
    value?: number;
    /** Currency code */
    currency?: string;
    /** Price type (msrp, estimated, range) */
    type?: 'msrp' | 'estimated' | 'range';
    /** Price range if applicable */
    range?: { min: number; max: number };
    /** Notes about pricing */
    notes?: string;
  };
  /** Key product features */
  features: string[];
  /** Market positioning (premium, mid-range, budget, etc.) */
  marketPosition: string;
  /** Competitive strengths */
  strengths: string[];
  /** Competitive weaknesses */
  weaknesses: string[];
  /** Relevance score (0-1) */
  relevanceScore?: number;
  /** Additional notes */
  notes?: string;
}

/**
 * Structured competitor research data.
 */
export interface CompetitorResearchData {
  /** List of identified competitors */
  competitors: CompetitorInfo[];
  /** Market overview */
  marketOverview: {
    /** Total competitors identified */
    totalCompetitors: number;
    /** Observed price range */
    priceRange?: { min: number; max: number; median: number };
    /** Common features across competitors */
    commonFeatures: string[];
    /** Market gaps or opportunities */
    marketGaps: string[];
  };
  /** Competitive positioning insights */
  positioning: {
    /** Premium tier competitors */
    premiumTier: string[];
    /** Mid-range tier competitors */
    midRangeTier: string[];
    /** Budget tier competitors */
    budgetTier: string[];
    /** Differentiation opportunities */
    differentiationOpportunities: string[];
  };
  /** Competitive threats */
  threats: string[];
  /** Raw analysis text */
  rawAnalysis: string;
}

/**
 * Competitor Researcher Agent.
 */
export class CompetitorResearcherAgent extends BaseResearcherAgent<CompetitorResearchData> {
  readonly id = 'competitor-researcher';
  readonly name = 'Competitor Researcher Agent';
  readonly version = '1.0.0';
  readonly description =
    'Conducts competitive analysis research to identify competitor products, pricing, features, and market positioning';

  readonly researchType = 'competitor';
  readonly focusAreas = [
    'pricing',
    'features',
    'market_position',
    'strengths_weaknesses',
  ];
  readonly minSourcesRequired = 3;

  // -----------------------------------------------------------------------
  // Prompt building
  // -----------------------------------------------------------------------

  protected buildResearchPrompt(input: ResearchInput): string {
    let prompt = `Conduct a comprehensive competitive analysis for the following product concept:

**Product Concept:** ${input.productConcept}

**Target Market:** ${input.targetMarket}
`;

    if (input.additionalContext) {
      prompt += `\n**Additional Context:** ${input.additionalContext}\n`;
    }

    prompt += `
**Research Requirements:**

1. Identify at least 3-5 direct competitor products in the ${input.targetMarket} market
2. For each competitor, provide:
   - Company/brand name
   - Product name and URL
   - Pricing (MSRP, estimated retail price, or price range)
   - Key features and specifications
   - Market positioning (premium, mid-range, budget)
   - Competitive strengths
   - Competitive weaknesses
   - Relevance to our product concept (score 1-10)

3. Provide market analysis including:
   - Price range analysis (min, max, median)
   - Common features across competitors
   - Identified market gaps or unmet needs
   - Differentiation opportunities for our product

4. Assess competitive threats and positioning strategy

**Output Format:**
Provide your analysis in the following JSON structure:

\`\`\`json
{
  "competitors": [
    {
      "company": "Company Name",
      "productName": "Product Name",
      "url": "https://...",
      "pricing": {
        "value": 99.99,
        "currency": "USD",
        "type": "msrp",
        "notes": "Optional pricing notes"
      },
      "features": ["Feature 1", "Feature 2"],
      "marketPosition": "premium|mid-range|budget",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "relevanceScore": 8,
      "notes": "Additional context"
    }
  ],
  "marketOverview": {
    "totalCompetitors": 5,
    "priceRange": { "min": 50, "max": 200, "median": 120 },
    "commonFeatures": ["Feature 1", "Feature 2"],
    "marketGaps": ["Gap 1", "Gap 2"]
  },
  "positioning": {
    "premiumTier": ["Company A"],
    "midRangeTier": ["Company B", "Company C"],
    "budgetTier": ["Company D"],
    "differentiationOpportunities": ["Opportunity 1", "Opportunity 2"]
  },
  "threats": ["Threat 1", "Threat 2"]
}
\`\`\`

Followed by a narrative analysis explaining your findings.
`;

    if (input.guidingQueries && input.guidingQueries.length > 0) {
      prompt += `\n**Specific Areas to Investigate:**\n`;
      input.guidingQueries.forEach((query, idx) => {
        prompt += `${idx + 1}. ${query}\n`;
      });
    }

    return prompt;
  }

  protected buildSystemPrompt(): string {
    return `You are a senior competitive intelligence analyst with expertise in market research and competitive analysis.

Your task is to conduct thorough competitive research using web searches to find current, accurate information about competitor products.

Focus areas:
- Pricing strategies and price positioning
- Product features and specifications
- Market positioning and brand perception
- Competitive strengths and weaknesses

Requirements:
1. Find at least 3 direct competitors (minimum), ideally 5+
2. Provide specific pricing data with sources
3. Identify concrete features and specifications
4. Assess market positioning based on evidence
5. Provide balanced analysis of strengths and weaknesses
6. Cite all sources with URLs
7. Focus on products currently available in the market
8. Be objective and evidence-based

Output your findings in the requested JSON format followed by a narrative analysis.`;
  }

  // -----------------------------------------------------------------------
  // Data parsing
  // -----------------------------------------------------------------------

  protected parseResearchData(
    responseText: string,
    sources: GroundedSource[]
  ): CompetitorResearchData {
    // Try to parse JSON structure from response
    const jsonData = this.parseJsonFromText<Partial<CompetitorResearchData>>(
      responseText
    );

    // Extract narrative analysis (text after JSON block or entire response)
    let rawAnalysis = responseText;
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n[\s\S]*?\n```/);
    if (jsonBlockMatch) {
      rawAnalysis = responseText
        .substring(jsonBlockMatch.index! + jsonBlockMatch[0].length)
        .trim();
    }

    // Build structured data with fallbacks
    const competitors: CompetitorInfo[] = jsonData?.competitors || [];

    // Calculate market overview from competitors
    const prices = competitors
      .map((c) => c.pricing.value)
      .filter((p): p is number => p !== undefined && p !== null);

    const priceRange =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
          }
        : undefined;

    const marketOverview = jsonData?.marketOverview || {
      totalCompetitors: competitors.length,
      priceRange,
      commonFeatures: [],
      marketGaps: [],
    };

    const positioning = jsonData?.positioning || {
      premiumTier: competitors
        .filter((c) => c.marketPosition === 'premium')
        .map((c) => c.company),
      midRangeTier: competitors
        .filter((c) => c.marketPosition === 'mid-range')
        .map((c) => c.company),
      budgetTier: competitors
        .filter((c) => c.marketPosition === 'budget')
        .map((c) => c.company),
      differentiationOpportunities: [],
    };

    const threats = jsonData?.threats || [];

    return {
      competitors,
      marketOverview,
      positioning,
      threats,
      rawAnalysis,
    };
  }

  // -----------------------------------------------------------------------
  // Quality assessment
  // -----------------------------------------------------------------------

  protected assessQuality(
    data: CompetitorResearchData,
    sources: GroundedSource[]
  ): {
    confidence: number;
    meetsMinimum: boolean;
    gaps: string[];
  } {
    const gaps: string[] = [];
    const competitorCount = data.competitors.length;

    // Check minimum competitors requirement
    if (competitorCount < this.minSourcesRequired) {
      gaps.push(
        `Only ${competitorCount} competitors found (minimum ${this.minSourcesRequired} required)`
      );
    }

    // Check for pricing data
    const competitorsWithPricing = data.competitors.filter(
      (c) => c.pricing.value !== undefined && c.pricing.value !== null
    ).length;
    if (competitorsWithPricing === 0) {
      gaps.push('No pricing data found for any competitors');
    } else if (competitorsWithPricing < competitorCount) {
      gaps.push(
        `Pricing data missing for ${competitorCount - competitorsWithPricing} competitors`
      );
    }

    // Check for feature data
    const competitorsWithFeatures = data.competitors.filter(
      (c) => c.features && c.features.length > 0
    ).length;
    if (competitorsWithFeatures < competitorCount * 0.5) {
      gaps.push('Limited feature information for many competitors');
    }

    // Check for strengths/weaknesses analysis
    const competitorsWithAnalysis = data.competitors.filter(
      (c) =>
        c.strengths &&
        c.strengths.length > 0 &&
        c.weaknesses &&
        c.weaknesses.length > 0
    ).length;
    if (competitorsWithAnalysis < competitorCount * 0.5) {
      gaps.push(
        'Strengths/weaknesses analysis missing for many competitors'
      );
    }

    // Check for market gaps and opportunities
    if (
      !data.marketOverview.marketGaps ||
      data.marketOverview.marketGaps.length === 0
    ) {
      gaps.push('No market gaps identified');
    }

    if (
      !data.positioning.differentiationOpportunities ||
      data.positioning.differentiationOpportunities.length === 0
    ) {
      gaps.push('No differentiation opportunities identified');
    }

    // Calculate confidence
    const hasQuantitativeData = competitorsWithPricing > 0;
    const hasRecentData = sources.length >= this.minSourcesRequired;
    const confidence = this.calculateConfidence(
      competitorCount,
      hasQuantitativeData,
      hasRecentData
    );

    const meetsMinimum =
      competitorCount >= this.minSourcesRequired &&
      competitorsWithPricing > 0 &&
      sources.length > 0;

    return {
      confidence,
      meetsMinimum,
      gaps,
    };
  }
}
