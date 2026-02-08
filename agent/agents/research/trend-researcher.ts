/**
 * Trend Researcher Agent
 *
 * Conducts market trend and technology evolution research using web search grounding.
 * Focuses on identifying:
 * - Current market trends and their trajectory
 * - Technology evolution and emerging technologies
 * - Regulatory changes and compliance requirements
 * - Consumer behavior shifts and preferences
 *
 * Provides forward-looking insights for strategic planning.
 */

import {
  BaseResearcherAgent,
  ResearchInput,
  ResearchOutput,
} from './base-researcher';
import { ExecutionContext } from '@/agent/core/types';
import { GroundedSource } from '@/lib/providers/types';

/**
 * Market trend information.
 */
export interface MarketTrend {
  /** Trend name/title */
  name: string;
  /** Description of the trend */
  description: string;
  /** Current stage (emerging, growing, mature, declining) */
  stage: 'emerging' | 'growing' | 'mature' | 'declining';
  /** Impact level (high, medium, low) */
  impact: 'high' | 'medium' | 'low';
  /** Timeframe for relevance (short-term, medium-term, long-term) */
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  /** Supporting evidence */
  evidence: string[];
  /** Relevance to product concept */
  relevance: string;
}

/**
 * Technology evolution information.
 */
export interface TechnologyEvolution {
  /** Technology name */
  technology: string;
  /** Current state description */
  currentState: string;
  /** Expected evolution/trajectory */
  expectedEvolution: string;
  /** Adoption rate (if available) */
  adoptionRate?: string;
  /** Key players/leaders */
  keyPlayers: string[];
  /** Implications for product design */
  implications: string[];
}

/**
 * Regulatory change information.
 */
export interface RegulatoryChange {
  /** Regulation name/identifier */
  name: string;
  /** Jurisdiction (region, country, international) */
  jurisdiction: string;
  /** Description of the change */
  description: string;
  /** Status (proposed, enacted, effective) */
  status: 'proposed' | 'enacted' | 'effective';
  /** Effective date (if known) */
  effectiveDate?: string;
  /** Impact on product requirements */
  impact: string[];
  /** Compliance requirements */
  complianceRequirements: string[];
}

/**
 * Consumer behavior insight.
 */
export interface ConsumerBehavior {
  /** Behavior pattern name */
  pattern: string;
  /** Description of the behavior */
  description: string;
  /** Target demographic */
  demographic: string;
  /** Drivers of this behavior */
  drivers: string[];
  /** Implications for product design/marketing */
  implications: string[];
  /** Trend direction (increasing, stable, decreasing) */
  direction: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Structured trend research data.
 */
export interface TrendResearchData {
  /** Identified market trends */
  marketTrends: MarketTrend[];
  /** Technology evolution insights */
  technologyEvolution: TechnologyEvolution[];
  /** Regulatory changes and compliance */
  regulatoryChanges: RegulatoryChange[];
  /** Consumer behavior insights */
  consumerBehavior: ConsumerBehavior[];
  /** Strategic recommendations */
  strategicRecommendations: {
    /** Opportunities to capitalize on */
    opportunities: string[];
    /** Risks to mitigate */
    risks: string[];
    /** Innovation areas to explore */
    innovationAreas: string[];
  };
  /** Raw analysis text */
  rawAnalysis: string;
}

/**
 * Trend Researcher Agent.
 */
export class TrendResearcherAgent extends BaseResearcherAgent<TrendResearchData> {
  readonly id = 'trend-researcher';
  readonly name = 'Trend Researcher Agent';
  readonly version = '1.0.0';
  readonly description =
    'Conducts market trend and technology evolution research to identify opportunities, risks, and strategic directions';

  readonly researchType = 'trend';
  readonly focusAreas = [
    'market_trends',
    'technology_evolution',
    'regulatory_changes',
    'consumer_behavior',
  ];
  readonly minSourcesRequired = 3;

  // -----------------------------------------------------------------------
  // Prompt building
  // -----------------------------------------------------------------------

  protected buildResearchPrompt(input: ResearchInput): string {
    let prompt = `Conduct comprehensive market trend and technology evolution research for the following product concept:

**Product Concept:** ${input.productConcept}

**Target Market:** ${input.targetMarket}
`;

    if (input.additionalContext) {
      prompt += `\n**Additional Context:** ${input.additionalContext}\n`;
    }

    prompt += `
**Research Requirements:**

1. **Market Trends** - Identify 3-5 key market trends relevant to this product:
   - Trend name and description
   - Current stage (emerging, growing, mature, declining)
   - Impact level and timeframe
   - Supporting evidence and statistics
   - Relevance to our product concept

2. **Technology Evolution** - Analyze relevant technology trends:
   - Current state of key technologies
   - Expected evolution and trajectory
   - Adoption rates and key players
   - Implications for product design and features

3. **Regulatory Changes** - Research regulatory environment:
   - Recent or upcoming regulations affecting this product category
   - Jurisdiction and effective dates
   - Compliance requirements
   - Impact on product design and go-to-market strategy

4. **Consumer Behavior** - Identify behavioral shifts and preferences:
   - Emerging behavior patterns in target market
   - Drivers and motivations
   - Demographic insights
   - Implications for product design and marketing

5. **Strategic Recommendations**:
   - Opportunities to capitalize on trends
   - Risks to mitigate
   - Innovation areas to explore

**Output Format:**
Provide your analysis in the following JSON structure:

\`\`\`json
{
  "marketTrends": [
    {
      "name": "Trend Name",
      "description": "Description of the trend",
      "stage": "emerging|growing|mature|declining",
      "impact": "high|medium|low",
      "timeframe": "short-term|medium-term|long-term",
      "evidence": ["Evidence 1", "Evidence 2"],
      "relevance": "Why this matters for our product"
    }
  ],
  "technologyEvolution": [
    {
      "technology": "Technology Name",
      "currentState": "Current state description",
      "expectedEvolution": "Future trajectory",
      "adoptionRate": "X% annual growth",
      "keyPlayers": ["Company 1", "Company 2"],
      "implications": ["Implication 1", "Implication 2"]
    }
  ],
  "regulatoryChanges": [
    {
      "name": "Regulation Name",
      "jurisdiction": "Region/Country",
      "description": "What changed",
      "status": "proposed|enacted|effective",
      "effectiveDate": "YYYY-MM-DD",
      "impact": ["Impact 1", "Impact 2"],
      "complianceRequirements": ["Requirement 1", "Requirement 2"]
    }
  ],
  "consumerBehavior": [
    {
      "pattern": "Behavior Pattern Name",
      "description": "Description of behavior",
      "demographic": "Target demographic",
      "drivers": ["Driver 1", "Driver 2"],
      "implications": ["Implication 1", "Implication 2"],
      "direction": "increasing|stable|decreasing"
    }
  ],
  "strategicRecommendations": {
    "opportunities": ["Opportunity 1", "Opportunity 2"],
    "risks": ["Risk 1", "Risk 2"],
    "innovationAreas": ["Innovation Area 1", "Innovation Area 2"]
  }
}
\`\`\`

Followed by a narrative analysis explaining your findings and their strategic implications.
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
    return `You are a strategic market analyst and futurist with expertise in trend analysis, technology forecasting, and consumer behavior research.

Your task is to conduct forward-looking research to identify trends, technologies, regulatory changes, and behavioral shifts that will impact the product's success.

Focus areas:
- Market trends and their trajectory
- Technology evolution and emerging technologies
- Regulatory changes and compliance requirements
- Consumer behavior shifts and preferences

Requirements:
1. Focus on current and emerging trends (last 1-2 years, next 2-5 years)
2. Provide evidence-based insights with statistics and data
3. Cite credible sources (industry reports, research firms, regulatory bodies)
4. Distinguish between hype and substantial trends
5. Assess both opportunities and risks
6. Provide actionable strategic recommendations
7. Be forward-looking but grounded in evidence
8. Consider global and regional variations

Output your findings in the requested JSON format followed by a strategic narrative analysis.`;
  }

  // -----------------------------------------------------------------------
  // Data parsing
  // -----------------------------------------------------------------------

  protected parseResearchData(
    responseText: string,
    sources: GroundedSource[]
  ): TrendResearchData {
    // Try to parse JSON structure from response
    const jsonData = this.parseJsonFromText<Partial<TrendResearchData>>(
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
    const marketTrends: MarketTrend[] = jsonData?.marketTrends || [];
    const technologyEvolution: TechnologyEvolution[] =
      jsonData?.technologyEvolution || [];
    const regulatoryChanges: RegulatoryChange[] =
      jsonData?.regulatoryChanges || [];
    const consumerBehavior: ConsumerBehavior[] =
      jsonData?.consumerBehavior || [];

    const strategicRecommendations = jsonData?.strategicRecommendations || {
      opportunities: [],
      risks: [],
      innovationAreas: [],
    };

    return {
      marketTrends,
      technologyEvolution,
      regulatoryChanges,
      consumerBehavior,
      strategicRecommendations,
      rawAnalysis,
    };
  }

  // -----------------------------------------------------------------------
  // Quality assessment
  // -----------------------------------------------------------------------

  protected assessQuality(
    data: TrendResearchData,
    sources: GroundedSource[]
  ): {
    confidence: number;
    meetsMinimum: boolean;
    gaps: string[];
  } {
    const gaps: string[] = [];

    // Check for market trends
    if (data.marketTrends.length === 0) {
      gaps.push('No market trends identified');
    } else if (data.marketTrends.length < 3) {
      gaps.push(`Only ${data.marketTrends.length} market trends found (3+ recommended)`);
    }

    // Check for technology evolution insights
    if (data.technologyEvolution.length === 0) {
      gaps.push('No technology evolution insights identified');
    }

    // Check for evidence/supporting data
    const trendsWithEvidence = data.marketTrends.filter(
      (t) => t.evidence && t.evidence.length > 0
    ).length;
    if (trendsWithEvidence < data.marketTrends.length * 0.5) {
      gaps.push('Many trends lack supporting evidence');
    }

    // Check for strategic recommendations
    if (data.strategicRecommendations.opportunities.length === 0) {
      gaps.push('No opportunities identified');
    }
    if (data.strategicRecommendations.risks.length === 0) {
      gaps.push('No risks identified');
    }

    // Check for consumer behavior insights
    if (data.consumerBehavior.length === 0) {
      gaps.push('No consumer behavior insights identified');
    }

    // Check source quality
    if (sources.length < this.minSourcesRequired) {
      gaps.push(
        `Only ${sources.length} sources found (minimum ${this.minSourcesRequired} required)`
      );
    }

    // Calculate confidence
    const hasTrendData = data.marketTrends.length >= 3;
    const hasTechData = data.technologyEvolution.length > 0;
    const hasStrategicInsights =
      data.strategicRecommendations.opportunities.length > 0 &&
      data.strategicRecommendations.risks.length > 0;

    const hasQuantitativeData = trendsWithEvidence > 0;
    const hasRecentData = sources.length >= this.minSourcesRequired;

    let confidence = this.calculateConfidence(
      data.marketTrends.length,
      hasQuantitativeData,
      hasRecentData
    );

    // Adjust confidence based on completeness
    if (hasTechData) confidence += 0.1;
    if (hasStrategicInsights) confidence += 0.1;
    confidence = Math.min(confidence, 1.0);

    const meetsMinimum =
      hasTrendData && sources.length >= this.minSourcesRequired;

    return {
      confidence,
      meetsMinimum,
      gaps,
    };
  }
}
