import { NextRequest, NextResponse } from 'next/server';
import { getGeminiProvider } from '@/lib/providers/gemini-provider';
import { sanitizeObject } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * POST /api/intake/evaluate
 *
 * Evaluates the completeness of a single topic's data and suggests the next topic.
 * Called when the user clicks "Next" on a topic card.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { topicId, structuredData, freetext, allTopicsState } = body;

    if (!topicId || !structuredData || !freetext || !allTopicsState) {
      return NextResponse.json(
        { error: 'Missing required fields: topicId, structuredData, freetext, allTopicsState' },
        { status: 400 }
      );
    }

    // Sanitize all user-provided inputs
    const sanitized = sanitizeObject({ structuredData, freetext });
    const sanitizedTopicsState = sanitizeObject({ allTopicsState }).allTopicsState;

    console.log('[API/intake/evaluate] Evaluating topic:', topicId);

    const topicDef = TOPIC_DEFINITIONS.find((t) => t.id === topicId);
    const topicFieldLabels = topicDef
      ? topicDef.fields.map((f) => `${f.id}: ${f.label} (${f.type}${f.required ? ', required' : ''})`).join('\n')
      : 'Unknown topic';

    const prompt = `Evaluate this topic data for the "${topicDef?.name || topicId}" section of an MRD intake form.

Topic fields:
${topicFieldLabels}

Structured data provided:
${JSON.stringify(sanitized.structuredData, null, 2)}

Freetext data provided:
${JSON.stringify(sanitized.freetext, null, 2)}

Current status of all topics:
${JSON.stringify(sanitizedTopicsState, null, 2)}

Score this topic 0-100 based on depth, specificity, and usefulness for market research.
Suggest which topic should be worked on next (choose from the incomplete ones).
Provide brief suggestions for fields that could be improved (keyed by field id).
Calculate overall readiness across all topics.`;

    const schema = {
      type: 'object',
      properties: {
        topicScore: { type: 'number', description: 'Completeness score 0-100 for this topic' },
        nextTopicId: { type: 'string', description: 'ID of the suggested next topic to work on' },
        suggestions: {
          type: 'object',
          description: 'Map of field IDs to arrays of improvement suggestions',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
        overallReadiness: { type: 'number', description: 'Overall readiness score 0-100 across all topics' },
      },
      required: ['topicScore', 'nextTopicId', 'suggestions', 'overallReadiness'],
    };

    const systemPrompt =
      'You are evaluating the completeness of a product research intake form for MRD generation. Score the provided topic data 0-100 based on depth, specificity, and usefulness for market research. Suggest which topic should be next.';

    const gemini = getGeminiProvider();

    const result = await gemini.generateStructured<{
      topicScore: number;
      nextTopicId: string;
      suggestions: Record<string, string[]>;
      overallReadiness: number;
    }>(prompt, schema, systemPrompt, { maxTokens: 512 });

    console.log('[API/intake/evaluate] Topic score:', result.topicScore, 'Next:', result.nextTopicId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/intake/evaluate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate topic. Please try again.' },
      { status: 500 }
    );
  }
}
