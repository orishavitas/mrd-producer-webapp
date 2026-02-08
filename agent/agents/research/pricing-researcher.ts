/**
 * Pricing Researcher Agent
 *
 * Conducts pricing strategy research using web search grounding.
 * Focuses on identifying:
 * - Pricing models and strategies in the market
 * - Cost structures and components
 * - Margin analysis and profitability insights
 * - Competitive pricing benchmarks
 * - Value-based pricing opportunities
 *
 * Provides data-driven pricing recommendations.
 */

import {
  BaseResearcherAgent,
  ResearchInput,
  ResearchOutput,
} from './base-researcher';
import { ExecutionContext } from '@/agent/core/types';
import { GroundedSource } from '@/lib/providers/types';

/**
 * Pricing model information.
 */
export interface PricingModel {
  /** Model name (e.g., "tiered", "subscription", "one-time", "freemium") */
  name: string;
  /** Description of the model */
  description: string;
  /** Prevalence in market (high, medium, low) */
  prevalence: 'high' | 'medium' | 'low';
  /** Examples of companies using this model */
  examples: string[];
  /** Advantages of this model */
  advantages: string[];
  /** Disadvantages of this model */
  disadvantages: string[];
  /** Typical price points or ranges */
  typicalPricing?: string;
  /** Applicability to product concept */
  applicability: string;
}

/**
 * Cost structure component.
 */
export interface CostComponent {
  /** Component name (e.g., "materials", "manufacturing", "shipping") */
  component: string;
  /** Estimated percentage of total cost */
  percentage?: number;
  /** Estimated dollar amount (if available) */
  estimatedAmount?: number;
  /** Factors affecting this cost */
  factors: string[];
  /** Optimization opportunities */
  optimizationOpportunities: string[];
}

/**
 * Margin analysis insights.
 */
export interface MarginAnalysis {
  /** Industry standard gross margins */
  industryGrossMargin?: { min: number; max: number; average: number };
  /** Typical MSRP to cost multipliers */
  msrpMultipliers?: { low: number; average: number; high: number };
  /** Margin drivers */
  marginDrivers: string[];
  /** Margin pressures */
  marginPressures: string[];
  /** Recommendations for margin optimization */
  recommendations: string[];
}

/**
 * Competitive pricing benchmark.
 */
export interface CompetitivePricingBenchmark {
  /** Price tier (budget, mid-range, premium, luxury) */
  tier: 'budget' | 'mid-range' | 'premium' | 'luxury';
  /** Price range for this tier */
  priceRange: { min: number; max: number; currency: string };
  /** Typical features at this tier */
  features: string[];
  /** Market share of this tier (if available) */
  marketShare?: string;
  /** Target customer segment */
  targetSegment: string;
  /** Example products in this tier */
  examples: string[];
}

/**
 * Value-based pricing insight.
 */
export interface ValueBasedPricingInsight {
  /** Value proposition or benefit */
  valueProposition: string;
  /** Quantified customer value (if possible) */
  customerValue?: string;
  /** Willingness to pay indicators */
  willingnessToPay: string[];
  /** Price sensitivity factors */
  priceSensitivity: string[];
  /** Recommended pricing approach */
  recommendedApproach: string;
}

/**
 * Structured pricing research data.
 */
export interface PricingResearchData {
  /** Identified pricing models */
  pricingModels: PricingModel[];
  /** Cost structure analysis */
  costStructure: {
    /** Cost components */
    components: CostComponent[];
    /** Estimated total cost range (if available) */
    totalCostRange?: { min: number; max: number; currency: string };
    /** Cost drivers */
    costDrivers: string[];
  };
  /** Margin analysis */
  marginAnalysis: MarginAnalysis;
  /** Competitive pricing benchmarks */
  competitivePricing: {
    /** Benchmarks by tier */
    benchmarks: CompetitivePricingBenchmark[];
    /** Overall market price range */
    marketPriceRange?: { min: number; max: number; median: number; currency: string };
  };
  /** Value-based pricing insights */
  valuePricing: {
    /** Key insights */
    insights: ValueBasedPricingInsight[];
    /** Price elasticity indicators */
    priceElasticity?: string;
  };
  /** Pricing recommendations */
  recommendations: {
    /** Recommended pricing model */
    recommendedModel: string;
    /** Recommended price range */
    recommendedRange?: { min: number; max: number; target: number; currency: string };
    /** Pricing strategy */
    strategy: string;
    /** Key considerations */
    considerations: string[];
  };
  /** Raw analysis text */
  rawAnalysis: string;
}

/**
 * Pricing Researcher Agent.
 */
export class PricingResearcherAgent extends BaseResearcherAgent<PricingResearchData> {
  readonly id = 'pricing-researcher';
  readonly name = 'Pricing Researcher Agent';
  readonly version = '1.0.0';
  readonly description =
    'Conducts pricing strategy research to identify optimal pricing models, cost structures, and competitive positioning';

  readonly researchType = 'pricing';
  readonly focusAreas = [
    'pricing_models',
    'cost_structures',
    'margin_analysis',
    'competitive_pricing',
  ];
  readonly minSourcesRequired = 3;

  // -----------------------------------------------------------------------
  // Prompt building
  // -----------------------------------------------------------------------

  protected buildResearchPrompt(input: ResearchInput): string {
    let prompt = `Conduct comprehensive pricing strategy research for the following product concept:

**Product Concept:** ${input.productConcept}

**Target Market:** ${input.targetMarket}
`;

    if (input.additionalContext) {
      prompt += `\n**Additional Context:** ${input.additionalContext}\n`;
    }

    prompt += `
**Research Requirements:**

1. **Pricing Models** - Identify 2-4 pricing models used in this market:
   - Model name and description
   - Prevalence and examples
   - Advantages and disadvantages
   - Typical pricing and applicability

2. **Cost Structure Analysis** - Research cost components:
   - Key cost components (materials, manufacturing, distribution, etc.)
   - Percentage breakdown (if available)
   - Cost drivers and optimization opportunities
   - Estimated total cost range

3. **Margin Analysis** - Analyze profitability:
   - Industry standard gross margins
   - Typical MSRP to cost multipliers
   - Margin drivers and pressures
   - Optimization recommendations

4. **Competitive Pricing** - Benchmark pricing tiers:
   - Budget, mid-range, premium, luxury tiers
   - Price ranges for each tier
   - Features and target segments
   - Market share distribution (if available)

5. **Value-Based Pricing** - Assess customer value:
   - Key value propositions
   - Willingness to pay indicators
   - Price sensitivity factors
   - Recommended pricing approach

6. **Pricing Recommendations**:
   - Recommended pricing model
   - Recommended price range and target price
   - Pricing strategy
   - Key considerations

**Output Format:**
Provide your analysis in the following JSON structure:

\`\`\`json
{
  "pricingModels": [
    {
      "name": "Model Name",
      "description": "Description",
      "prevalence": "high|medium|low",
      "examples": ["Company 1", "Company 2"],
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Disadvantage 1", "Disadvantage 2"],
      "typicalPricing": "$X-$Y",
      "applicability": "How applicable to our product"
    }
  ],
  "costStructure": {
    "components": [
      {
        "component": "Component Name",
        "percentage": 30,
        "estimatedAmount": 15.00,
        "factors": ["Factor 1", "Factor 2"],
        "optimizationOpportunities": ["Opportunity 1", "Opportunity 2"]
      }
    ],
    "totalCostRange": { "min": 50, "max": 100, "currency": "USD" },
    "costDrivers": ["Driver 1", "Driver 2"]
  },
  "marginAnalysis": {
    "industryGrossMargin": { "min": 30, "max": 60, "average": 45 },
    "msrpMultipliers": { "low": 2.0, "average": 3.0, "high": 5.0 },
    "marginDrivers": ["Driver 1", "Driver 2"],
    "marginPressures": ["Pressure 1", "Pressure 2"],
    "recommendations": ["Recommendation 1", "Recommendation 2"]
  },
  "competitivePricing": {
    "benchmarks": [
      {
        "tier": "budget|mid-range|premium|luxury",
        "priceRange": { "min": 50, "max": 100, "currency": "USD" },
        "features": ["Feature 1", "Feature 2"],
        "marketShare": "X%",
        "targetSegment": "Segment description",
        "examples": ["Product 1", "Product 2"]
      }
    ],
    "marketPriceRange": { "min": 50, "max": 500, "median": 150, "currency": "USD" }
  },
  "valuePricing": {
    "insights": [
      {
        "valueProposition": "Value prop description",
        "customerValue": "Quantified value",
        "willingnessToPay": ["Indicator 1", "Indicator 2"],
        "priceSensitivity": ["Factor 1", "Factor 2"],
        "recommendedApproach": "Approach description"
      }
    ],
    "priceElasticity": "High/Medium/Low with explanation"
  },
  "recommendations": {
    "recommendedModel": "Model name",
    "recommendedRange": { "min": 100, "max": 150, "target": 125, "currency": "USD" },
    "strategy": "Strategy description",
    "considerations": ["Consideration 1", "Consideration 2"]
  }
}
\`\`\`

Followed by a detailed narrative analysis explaining your findings and pricing recommendations.
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
    return `You are a pricing strategy consultant and financial analyst with expertise in product pricing, cost analysis, and competitive benchmarking.

Your task is to conduct thorough pricing research to inform optimal pricing strategy for the product concept.

Focus areas:
- Pricing models and strategies used in the market
- Cost structures and component analysis
- Margin analysis and profitability metrics
- Competitive pricing benchmarks across tiers
- Value-based pricing opportunities

Requirements:
1. Provide specific, quantitative pricing data with sources
2. Analyze multiple pricing models and their trade-offs
3. Research cost structures with percentage breakdowns
4. Benchmark competitive pricing across different tiers
5. Assess customer value and willingness to pay
6. Provide data-driven pricing recommendations
7. Consider both financial and strategic factors
8. Cite all sources with URLs

Output your findings in the requested JSON format followed by a comprehensive pricing analysis and recommendations.`;
  }

  // -----------------------------------------------------------------------
  // Data parsing
  // -----------------------------------------------------------------------

  protected parseResearchData(
    responseText: string,
    sources: GroundedSource[]
  ): PricingResearchData {
    // Try to parse JSON structure from response
    const jsonData = this.parseJsonFromText<Partial<PricingResearchData>>(
      responseText
    );

    // Extract narrative analysis
    let rawAnalysis = responseText;
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n[\s\S]*?\n```/);
    if (jsonBlockMatch) {
      rawAnalysis = responseText
        .substring(jsonBlockMatch.index! + jsonBlockMatch[0].length)
        .trim();
    }

    // Build structured data with fallbacks
    const pricingModels: PricingModel[] = jsonData?.pricingModels || [];

    const costStructure = jsonData?.costStructure || {
      components: [],
      costDrivers: [],
    };

    const marginAnalysis: MarginAnalysis = jsonData?.marginAnalysis || {
      marginDrivers: [],
      marginPressures: [],
      recommendations: [],
    };

    const competitivePricing = jsonData?.competitivePricing || {
      benchmarks: [],
    };

    const valuePricing = jsonData?.valuePricing || {
      insights: [],
    };

    const recommendations = jsonData?.recommendations || {
      recommendedModel: '',
      strategy: '',
      considerations: [],
    };

    return {
      pricingModels,
      costStructure,
      marginAnalysis,
      competitivePricing,
      valuePricing,
      recommendations,
      rawAnalysis,
    };
  }

  // -----------------------------------------------------------------------
  // Quality assessment
  // -----------------------------------------------------------------------

  protected assessQuality(
    data: PricingResearchData,
    sources: GroundedSource[]
  ): {
    confidence: number;
    meetsMinimum: boolean;
    gaps: string[];
  } {
    const gaps: string[] = [];

    // Check for pricing models
    if (data.pricingModels.length === 0) {
      gaps.push('No pricing models identified');
    } else if (data.pricingModels.length < 2) {
      gaps.push('Only one pricing model identified (2+ recommended)');
    }

    // Check for cost structure data
    if (data.costStructure.components.length === 0) {
      gaps.push('No cost structure analysis provided');
    }

    // Check for margin analysis
    if (
      !data.marginAnalysis.industryGrossMargin &&
      !data.marginAnalysis.msrpMultipliers
    ) {
      gaps.push('No margin analysis data available');
    }

    // Check for competitive pricing benchmarks
    if (data.competitivePricing.benchmarks.length === 0) {
      gaps.push('No competitive pricing benchmarks identified');
    }

    // Check for value-based pricing insights
    if (data.valuePricing.insights.length === 0) {
      gaps.push('No value-based pricing insights provided');
    }

    // Check for recommendations
    if (!data.recommendations.recommendedModel) {
      gaps.push('No pricing model recommendation provided');
    }
    if (!data.recommendations.recommendedRange) {
      gaps.push('No price range recommendation provided');
    }

    // Check source quality
    if (sources.length < this.minSourcesRequired) {
      gaps.push(
        `Only ${sources.length} sources found (minimum ${this.minSourcesRequired} required)`
      );
    }

    // Calculate confidence
    const hasModels = data.pricingModels.length >= 2;
    const hasCostData = data.costStructure.components.length > 0;
    const hasMarginData =
      data.marginAnalysis.industryGrossMargin !== undefined ||
      data.marginAnalysis.msrpMultipliers !== undefined;
    const hasBenchmarks = data.competitivePricing.benchmarks.length > 0;
    const hasRecommendations =
      data.recommendations.recommendedModel !== '' &&
      data.recommendations.recommendedRange !== undefined;

    // Quantitative data check
    const hasQuantitativeData =
      hasCostData || hasMarginData || hasBenchmarks;

    const hasRecentData = sources.length >= this.minSourcesRequired;

    let confidence = this.calculateConfidence(
      data.pricingModels.length * 2, // Weight models higher
      hasQuantitativeData,
      hasRecentData
    );

    // Adjust confidence based on completeness
    if (hasBenchmarks) confidence += 0.1;
    if (hasRecommendations) confidence += 0.1;
    confidence = Math.min(confidence, 1.0);

    const meetsMinimum =
      hasModels &&
      (hasCostData || hasMarginData || hasBenchmarks) &&
      sources.length >= this.minSourcesRequired;

    return {
      confidence,
      meetsMinimum,
      gaps,
    };
  }
}
