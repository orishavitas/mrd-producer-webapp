import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';
import { sanitizeObject } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * POST /api/intake/update-subsequent
 *
 * AI pre-fills remaining topics based on already-approved topic data.
 * Called after a topic is approved to propagate context forward.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { approvedTopics, remainingTopicIds } = body;

    if (!approvedTopics || !remainingTopicIds || !Array.isArray(remainingTopicIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: approvedTopics, remainingTopicIds' },
        { status: 400 },
      );
    }

    const sanitized = sanitizeObject({ approvedTopics });

    console.log('[API/intake/update-subsequent] Pre-filling topics:', remainingTopicIds);

    // Build field descriptions for remaining topics
    const remainingDescriptions = remainingTopicIds
      .map((id: string) => {
        const def = TOPIC_DEFINITIONS.find((t) => t.id === id);
        if (!def) return null;
        const fields = def.fields
          .map((f) => `  - ${f.id} (${f.type}): ${f.label}${f.options ? ` [options: ${f.options.join(', ')}]` : ''}`)
          .join('\n');
        return `Topic "${def.name}" (id: ${id}):\n${fields}`;
      })
      .filter(Boolean)
      .join('\n\n');

    const prompt = `You are pre-filling an MRD intake form for stands and enclosures products. The user has already approved these topics:

${JSON.stringify(sanitized.approvedTopics, null, 2)}

Based on this context, generate reasonable pre-fill data for the remaining topics. Use the approved data to infer likely values. Only fill fields where you can make a reasonable inference — leave others empty.

Remaining topics and their fields:
${remainingDescriptions}

For each remaining topic, provide:
- structuredData: Record of field ID to value (string for text/select, string[] for chips/multi-select)
- freetext: Record of field ID to string value (for freetext fields only)
- completeness: estimated completeness score 0-100 based on how much you could infer`;

    const schema = {
      type: 'object',
      properties: {
        topicUpdates: {
          type: 'object',
          description: 'Map of topic ID to pre-fill data',
          additionalProperties: {
            type: 'object',
            properties: {
              structuredData: {
                type: 'object',
                description: 'Field ID to value mappings',
                additionalProperties: {},
              },
              freetext: {
                type: 'object',
                description: 'Field ID to freetext value mappings',
                additionalProperties: { type: 'string' },
              },
              completeness: {
                type: 'number',
                description: 'Estimated completeness 0-100',
              },
            },
            required: ['structuredData', 'freetext', 'completeness'],
          },
        },
      },
      required: ['topicUpdates'],
    };

    const systemPrompt =
      'You are a product research assistant pre-filling an MRD intake form. Generate reasonable field values based on the context from already-approved topics. Be conservative — only fill fields where you can make confident inferences. Use exact option values from the field definitions when applicable.';

    const chain = getProviderChain();

    const result = await chain.generateStructured<{
      topicUpdates: Record<
        string,
        {
          structuredData: Record<string, string | string[]>;
          freetext: Record<string, string>;
          completeness: number;
        }
      >;
    }>(prompt, schema, systemPrompt, { maxTokens: 2048 });

    console.log(
      '[API/intake/update-subsequent] Generated updates for:',
      Object.keys(result.topicUpdates),
    );

    return NextResponse.json({ topicUpdates: result.topicUpdates });
  } catch (error) {
    console.error('[API/intake/update-subsequent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to pre-fill topics. Please try again.' },
      { status: 500 },
    );
  }
}
