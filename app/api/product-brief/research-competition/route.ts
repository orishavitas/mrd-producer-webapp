// app/api/product-brief/research-competition/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput } from '@/lib/sanitize';
import {
  CompetitionResearcherAgent,
  type CompetitionResearchInput,
} from '@/agent/agents/product-brief/competition-researcher';
import { createExecutionContext } from '@/agent/core/execution-context';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Sanitize input
    const input: CompetitionResearchInput = {
      productDescription: sanitizeInput(body.productDescription || ''),
      targetIndustry: Array.isArray(body.targetIndustry)
        ? body.targetIndustry.map(sanitizeInput)
        : [],
      whereUsed: Array.isArray(body.whereUsed)
        ? body.whereUsed.map(sanitizeInput)
        : [],
      whoUses: Array.isArray(body.whoUses)
        ? body.whoUses.map(sanitizeInput)
        : [],
    };

    // Create execution context
    const context = createExecutionContext({
      requestId: `competition-research-${Date.now()}`,
    });

    // Create and execute agent
    const agent = new CompetitionResearcherAgent();
    const result = await agent.execute(input, context);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Competition research failed', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      competitors: result.data?.competitors || [],
      sources: result.data?.sources || [],
      searchQueries: result.data?.searchQueries || [],
      confidence: result.data?.confidence || 0,
    });
  } catch (error) {
    console.error('[API] Competition research error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during competition research',
      },
      { status: 500 }
    );
  }
}
