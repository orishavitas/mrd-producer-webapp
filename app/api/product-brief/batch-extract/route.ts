// app/api/product-brief/batch-extract/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { BatchExtractAgent } from '@/agent/agents/product-brief/batch-extract-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

export async function POST(request: NextRequest) {
  try {
    const { productConcept } = await request.json();

    if (!productConcept || typeof productConcept !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'productConcept is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (productConcept.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'productConcept must be at least 50 characters for meaningful extraction',
        },
        { status: 400 }
      );
    }

    // Create execution context
    const context = createExecutionContext({
      requestId: `batch-extract-${Date.now()}`,
    });

    // Execute agent
    const agent = new BatchExtractAgent();
    const startTime = Date.now();
    const result = await agent.execute({ productConcept }, context);
    const executionTime = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Extraction failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fields: result.data?.fields || {},
      confidence: result.data?.confidence || 0,
      executionTime,
    });
  } catch (error) {
    console.error('[API] Batch extract error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during batch extraction',
      },
      { status: 500 }
    );
  }
}
