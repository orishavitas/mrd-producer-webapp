// agent/agents/product-brief/competition-researcher.ts

import { BaseAgent } from '@/agent/core/base-agent';
import { ExecutionContext, ValidationResult } from '@/agent/core/types';
import { ProviderCapabilities, GroundedSource } from '@/lib/providers/types';

/**
 * Competitor information for brief generation.
 */
export interface BriefCompetitor {
  /** Company/brand name */
  company: string;
  /** Product name */
  productName: string;
  /** Product URL (if available) */
  url?: string;
  /** Key differentiators */
  keyFeatures: string[];
  /** Approximate price point or range */
  pricePoint?: string;
}

/**
 * Input for competition research.
 */
export interface CompetitionResearchInput {
  /** Product description */
  productDescription: string;
  /** Target industry/market */
  targetIndustry: string[];
  /** Where the product is used */
  whereUsed: string[];
  /** Who uses it */
  whoUses: string[];
}

/**
 * Output from competition research.
 */
export interface CompetitionResearchOutput {
  /** List of identified competitors */
  competitors: BriefCompetitor[];
  /** Source citations */
  sources: GroundedSource[];
  /** Search queries used */
  searchQueries: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Competition Researcher Agent for Product Brief Helper.
 *
 * Uses Gemini's Google Search grounding to find 3-5 direct competitors
 * based on product description, target industry, and use case.
 */
export class CompetitionResearcherAgent extends BaseAgent<
  CompetitionResearchInput,
  CompetitionResearchOutput
> {
  readonly id = 'competition-researcher';
  readonly name = 'Competition Researcher Agent';
  readonly version = '1.0.0';
  readonly description =
    'Researches direct competitors using web search grounding for product brief generation';

  readonly requiredCapabilities: (keyof ProviderCapabilities)[] = [
    'textGeneration',
    'searchGrounding',
  ];

  validateInput(input: CompetitionResearchInput): ValidationResult {
    const errors: string[] = [];

    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a non-null object'] };
    }

    if (
      !input.productDescription ||
      typeof input.productDescription !== 'string' ||
      input.productDescription.trim().length < 20
    ) {
      errors.push(
        'productDescription is required and must be at least 20 characters'
      );
    }

    if (!Array.isArray(input.targetIndustry) || input.targetIndustry.length === 0) {
      errors.push('targetIndustry must be a non-empty array');
    }

    if (!Array.isArray(input.whereUsed) || input.whereUsed.length === 0) {
      errors.push('whereUsed must be a non-empty array');
    }

    if (!Array.isArray(input.whoUses) || input.whoUses.length === 0) {
      errors.push('whoUses must be a non-empty array');
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  protected async executeCore(
    input: CompetitionResearchInput,
    context: ExecutionContext
  ): Promise<CompetitionResearchOutput> {
    context.log('info', `[${this.id}] Starting competition research`);

    const provider = context.getProvider();

    // Check for search grounding capability
    if (!provider.capabilities.searchGrounding) {
      throw new Error(
        `Provider ${provider.name} does not support search grounding, which is required for competition research`
      );
    }

    if (!provider.generateWithSearch) {
      throw new Error(
        `Provider ${provider.name} does not implement generateWithSearch method`
      );
    }

    const prompt = this.buildResearchPrompt(input);
    const systemPrompt = this.buildSystemPrompt();

    context.log('debug', `[${this.id}] Executing grounded search for competitors`);

    // Execute grounded search
    const response = await provider.generateWithSearch(prompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 3072,
    });

    context.log('info', `[${this.id}] Search completed`, {
      sourcesFound: response.sources?.length ?? 0,
      queriesUsed: response.searchQueries?.length ?? 0,
    });

    // Parse competitors from response
    const competitors = this.parseCompetitors(response.text);
    const sources = response.sources || [];

    // Calculate confidence
    const confidence = this.calculateConfidence(
      competitors.length,
      sources.length
    );

    context.log('info', `[${this.id}] Found ${competitors.length} competitors`, {
      confidence,
    });

    return {
      competitors,
      sources,
      searchQueries: response.searchQueries || [],
      confidence,
    };
  }

  private buildResearchPrompt(input: CompetitionResearchInput): string {
    return `Find 3-5 direct competitors for this product:

**Product:** ${input.productDescription}

**Target Industry:** ${input.targetIndustry.join(', ')}

**Where Used:** ${input.whereUsed.join(', ')}

**Who Uses It:** ${input.whoUses.join(', ')}

**Task:**
1. Search for products that compete directly in this space
2. Focus on currently available products (not concepts)
3. Prioritize products with similar use cases and target customers
4. Include pricing if available

**Output Format:**
Provide a JSON array with 3-5 competitors:

\`\`\`json
[
  {
    "company": "Company Name",
    "productName": "Product Name",
    "url": "https://...",
    "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
    "pricePoint": "$100-200" or "Premium tier" or "Contact for pricing"
  }
]
\`\`\`

Focus on practical, actionable competitive intelligence.`;
  }

  private buildSystemPrompt(): string {
    return `You are a competitive intelligence analyst for product development.

Your task is to quickly identify 3-5 direct competitors using web searches.

Requirements:
1. Find products that directly compete in the same market
2. Prioritize currently available products over discontinued ones
3. Include product URLs when available
4. Extract 3-5 key differentiating features for each
5. Note pricing tier (exact price, range, or positioning)
6. Be concise - this is for a product brief, not a full analysis
7. Cite sources with URLs

Output your findings in the requested JSON format.`;
  }

  private parseCompetitors(responseText: string): BriefCompetitor[] {
    try {
      // Try to extract JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.map(this.validateCompetitor).filter((c): c is BriefCompetitor => c !== null);
        }
      }

      // Try direct JSON parse
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        return parsed.map(this.validateCompetitor).filter((c): c is BriefCompetitor => c !== null);
      }
    } catch (error) {
      // Parsing failed - return empty array
    }

    return [];
  }

  private validateCompetitor(data: any): BriefCompetitor | null {
    if (!data || typeof data !== 'object') return null;

    const competitor: BriefCompetitor = {
      company: String(data.company || ''),
      productName: String(data.productName || ''),
      url: data.url ? String(data.url) : undefined,
      keyFeatures: Array.isArray(data.keyFeatures)
        ? data.keyFeatures.map(String)
        : [],
      pricePoint: data.pricePoint ? String(data.pricePoint) : undefined,
    };

    // Must have at least company and product name
    if (!competitor.company || !competitor.productName) {
      return null;
    }

    return competitor;
  }

  private calculateConfidence(competitorCount: number, sourceCount: number): number {
    let confidence = 0;

    // Competitor count contribution (up to 0.6)
    if (competitorCount >= 5) {
      confidence += 0.6;
    } else if (competitorCount >= 3) {
      confidence += 0.4;
    } else if (competitorCount >= 1) {
      confidence += 0.2;
    }

    // Source count contribution (up to 0.4)
    if (sourceCount >= 3) {
      confidence += 0.4;
    } else if (sourceCount >= 1) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }
}
