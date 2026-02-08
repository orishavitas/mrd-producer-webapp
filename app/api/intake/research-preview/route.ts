import { NextRequest, NextResponse } from 'next/server';
import { sanitizeObject } from '@/lib/sanitize';
import { mapIntakeToResearchInput, validateResearchReadiness } from '@/app/intake/lib/research-mapper';
import { ResearchOrchestratorAgent } from '@/agent/orchestrators/research-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';
import type { TopicData } from '@/app/intake/lib/intake-state';

/**
 * POST /api/intake/research-preview
 *
 * Triggers preliminary research using the ResearchOrchestratorAgent.
 * Called during the Review phase to show live competitor/trend/pricing research.
 *
 * Input: { allTopicsData: Record<topicId, { structuredData, freetext }> }
 * Output: { research, sources, quality, execution }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { allTopicsData } = body;

    if (!allTopicsData || typeof allTopicsData !== 'object') {
      return NextResponse.json(
        { error: 'Missing required field: allTopicsData' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitized = sanitizeObject({ allTopicsData });

    console.log('[API/intake/research-preview] Starting research preview');

    // Convert allTopicsData to TopicData array format
    const topics: TopicData[] = Object.entries(sanitized.allTopicsData).map(
      ([id, data]: [string, any]) => ({
        id,
        name: id,
        status: 'completed' as const,
        completeness: 100,
        weight: 0,
        structuredData: data.structuredData || {},
        freetext: data.freetext || {},
      })
    );

    // Validate readiness
    const gaps = validateResearchReadiness(topics);
    if (gaps.length > 0) {
      console.warn('[API/intake/research-preview] Research readiness gaps:', gaps);
      return NextResponse.json(
        {
          error: 'Insufficient data for research',
          gaps,
        },
        { status: 400 }
      );
    }

    // Map intake data to ResearchInput
    const researchInput = mapIntakeToResearchInput(topics);

    console.log('[API/intake/research-preview] Research input prepared:', {
      productConcept: researchInput.productConcept.slice(0, 50),
      targetMarket: researchInput.targetMarket.slice(0, 50),
      guidingQueriesCount: researchInput.guidingQueries?.length || 0,
    });

    // Create execution context (similar to workflow.ts)
    const context = createExecutionContext({
      requestId: `research-preview-${Date.now()}`,
      config: {
        maxRetries: 3,
        timeoutMs: 180000, // 3 minutes for research
        enableFallback: true,
        preferredProvider: 'gemini',
      },
    });

    // Execute research orchestrator
    const orchestrator = new ResearchOrchestratorAgent();
    const result = await orchestrator.execute(researchInput, context);

    if (!result.success) {
      console.error('[API/intake/research-preview] Research failed:', result.error);
      return NextResponse.json(
        {
          error: 'Research failed. Please try again.',
          details: result.error,
        },
        { status: 500 }
      );
    }

    const researchOutput = result.data!;

    console.log('[API/intake/research-preview] Research complete:', {
      hasCompetitive: !!researchOutput.research.competitive,
      hasTrends: !!researchOutput.research.trends,
      hasPricing: !!researchOutput.research.pricing,
      sourcesCount: researchOutput.sources.length,
      confidence: researchOutput.quality.confidence,
    });

    // Return subset of research output (exclude internal execution details)
    return NextResponse.json({
      research: researchOutput.research,
      sources: researchOutput.sources,
      quality: {
        confidence: researchOutput.quality.confidence,
        gaps: researchOutput.quality.gaps,
      },
      execution: {
        successful: researchOutput.execution.successful,
        failed: researchOutput.execution.failed,
        executionTimeMs: researchOutput.execution.executionTimeMs,
      },
    });
  } catch (error) {
    console.error('[API/intake/research-preview] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate research preview. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
