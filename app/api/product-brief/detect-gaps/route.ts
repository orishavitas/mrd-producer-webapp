// app/api/product-brief/detect-gaps/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GapDetectionAgent } from '@/agent/agents/product-brief/gap-detection-agent';
import { createExecutionContext } from '@/agent/core/execution-context';

export async function POST(request: NextRequest) {
  try {
    const { fieldId, fieldContent, fieldType } = await request.json();

    if (!fieldId || !fieldType) {
      return NextResponse.json(
        {
          success: false,
          error: 'fieldId and fieldType are required',
        },
        { status: 400 }
      );
    }

    if (!['text', 'list'].includes(fieldType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'fieldType must be "text" or "list"',
        },
        { status: 400 }
      );
    }

    // Create execution context
    const context = createExecutionContext({
      requestId: `gap-detect-${Date.now()}`,
    });

    // Execute agent
    const agent = new GapDetectionAgent();
    const result = await agent.execute(
      {
        fieldId,
        fieldContent: fieldContent || (fieldType === 'list' ? [] : ''),
        fieldType,
      },
      context
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Gap detection failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gaps: result.data?.gaps || [],
      score: result.data?.score || 0,
    });
  } catch (error) {
    console.error('[API] Gap detection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during gap detection',
      },
      { status: 500 }
    );
  }
}
