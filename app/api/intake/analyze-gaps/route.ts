import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';
import { sanitizeObject, sanitizeInput } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * POST /api/intake/analyze-gaps
 *
 * Analyzes the intake data and brief for gaps before MRD generation.
 * Classifies each gap by severity: red (user must provide), yellow (AI can estimate).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { allTopicsData, brief } = body;

    if (!allTopicsData || typeof allTopicsData !== 'object') {
      return NextResponse.json(
        { error: 'Missing required field: allTopicsData' },
        { status: 400 }
      );
    }

    if (!brief || typeof brief !== 'string' || !brief.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: brief' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitized = sanitizeObject({ allTopicsData });
    const sanitizedTopics = sanitized.allTopicsData as Record<
      string,
      { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
    >;
    const sanitizedBrief = sanitizeInput(brief, { maxLength: 20000, allowMarkdown: true });

    console.log('[API/intake/analyze-gaps] Analyzing gaps for', Object.keys(sanitizedTopics).length, 'topics');

    // Build summary of what data we have per topic
    const topicSummaries = TOPIC_DEFINITIONS.map((topicDef) => {
      const data = sanitizedTopics[topicDef.id];
      const filledFields: string[] = [];
      const emptyFields: string[] = [];

      for (const field of topicDef.fields) {
        if (field.type === 'freetext') {
          const val = data?.freetext?.[field.id];
          if (val && val.trim()) {
            filledFields.push(`${field.label} (${field.id})`);
          } else {
            emptyFields.push(`${field.label} (${field.id})${field.required ? ' [REQUIRED]' : ''}`);
          }
        } else {
          const val = data?.structuredData?.[field.id];
          const hasValue = val && (typeof val === 'string' ? val.trim() : (val as string[]).length > 0);
          if (hasValue) {
            filledFields.push(`${field.label} (${field.id})`);
          } else {
            emptyFields.push(`${field.label} (${field.id})${field.required ? ' [REQUIRED]' : ''}`);
          }
        }
      }

      return `Topic: ${topicDef.name} (${topicDef.id})
  Filled: ${filledFields.length > 0 ? filledFields.join(', ') : 'none'}
  Missing: ${emptyFields.length > 0 ? emptyFields.join(', ') : 'none'}`;
    }).join('\n\n');

    const prompt = `Analyze the following product research brief and intake data for gaps before MRD generation.

Research Brief:
${sanitizedBrief}

Intake Data Coverage:
${topicSummaries}

The MRD requires these 12 sections (each must have sufficient information):
1. Purpose & Vision - Clear problem statement and product vision
2. Problem Statement - Detailed market problem and pain points
3. Target Market & Use Cases - Market segments, verticals, and use cases
4. Target Users - User personas and roles
5. Product Description - Product features, specs, and capabilities
6. Key Requirements - Detailed functional and technical requirements
7. Design & Aesthetics - Visual design, materials, form factor
8. Target Price - Pricing strategy and positioning
9. Risks and Thoughts - Business risks and considerations
10. Competition to review - Competitive landscape analysis
11. Additional Considerations - Regulatory, supply chain, etc.
12. Success Criteria - KPIs and metrics for success

For each significant gap found:
- Classify as "red" if only the user can provide this information (subjective decisions, proprietary data, business strategy)
- Classify as "yellow" if AI can reasonably estimate this from web research (market data, competitor info, industry standards)
- Do NOT include "green" gaps (information the AI is confident about)
- Map each gap to the most relevant topicId from: problem-vision, market-users, product-definition, design-experience, business-pricing, competitive-landscape

Also provide an overall readiness score 0-100 for MRD generation.`;

    const schema = {
      type: 'object',
      properties: {
        gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['red', 'yellow'] },
              topicId: { type: 'string' },
              title: { type: 'string', description: 'Short title for the gap' },
              explanation: { type: 'string', description: 'Why this information is needed' },
              canAIFill: { type: 'boolean', description: 'Whether AI can estimate this from research' },
            },
            required: ['severity', 'topicId', 'title', 'explanation', 'canAIFill'],
          },
        },
        readiness: { type: 'number', description: 'Overall readiness score 0-100' },
      },
      required: ['gaps', 'readiness'],
    };

    const systemPrompt =
      'You are analyzing a product research brief for gaps before MRD generation. Identify missing information that would significantly impact the quality of the MRD. Classify each gap as: \'red\' (only user can provide), \'yellow\' (AI can estimate from research), or \'green\' (AI is confident). Only return red and yellow gaps.';

    const chain = getProviderChain();

    const result = await chain.generateStructured<{
      gaps: {
        severity: 'red' | 'yellow';
        topicId: string;
        title: string;
        explanation: string;
        canAIFill: boolean;
      }[];
      readiness: number;
    }>(prompt, schema, systemPrompt, { maxTokens: 1024 });

    console.log('[API/intake/analyze-gaps] Found', result.gaps.length, 'gaps. Readiness:', result.readiness);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/intake/analyze-gaps] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze gaps. Please try again.' },
      { status: 500 }
    );
  }
}
