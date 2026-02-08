import { NextRequest, NextResponse } from 'next/server';
import { getGeminiProvider } from '@/lib/providers/gemini-provider';
import { sanitizeInput } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * POST /api/intake/parse-kickstart
 *
 * Parses a freeform product description and maps it to the 6 intake topics.
 * Called when the user submits the "Describe your product" kickstart text.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { description } = body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    // Sanitize user input
    const sanitizedDescription = sanitizeInput(description, { maxLength: 10000 });

    console.log('[API/intake/parse-kickstart] Parsing description:', sanitizedDescription.slice(0, 80));

    // Build field definitions string for the prompt
    const topicFieldDescriptions = TOPIC_DEFINITIONS.map((topic) => {
      const fields = topic.fields.map((f) => {
        let desc = `  - ${f.id} (${f.type}): ${f.label}`;
        if (f.options && f.options.length > 0) {
          desc += ` [options: ${f.options.join(', ')}]`;
        }
        if (f.type === 'freetext') {
          desc += ' [freetext field - value goes in freetext map]';
        }
        return desc;
      }).join('\n');
      return `Topic "${topic.id}" (${topic.name}):\n${fields}`;
    }).join('\n\n');

    const prompt = `Parse the following product description and extract structured information for a Market Requirements Document intake form.

Product description:
"${sanitizedDescription}"

The intake form has these topics and fields:

${topicFieldDescriptions}

For each topic, extract:
1. structuredData: values for non-freetext fields (chips, select, multi-select, text). Use the exact option strings from the options lists when applicable. For chips and multi-select, use arrays. For select and text, use strings.
2. freetext: values for freetext fields only.
3. completeness: a score 0-100 based on how much of this topic was addressed.

Also determine overallReadiness (0-100) and identify the lowestTopic (the topic id with least coverage).`;

    const schema = {
      type: 'object',
      properties: {
        topics: {
          type: 'object',
          description: 'Map of topicId to extracted data',
          properties: Object.fromEntries(
            TOPIC_DEFINITIONS.map((t) => [
              t.id,
              {
                type: 'object',
                properties: {
                  structuredData: {
                    type: 'object',
                    description: 'Extracted structured field values (non-freetext)',
                    additionalProperties: true,
                  },
                  freetext: {
                    type: 'object',
                    description: 'Extracted freetext field values',
                    additionalProperties: { type: 'string' },
                  },
                  completeness: {
                    type: 'number',
                    description: 'Completeness score 0-100',
                  },
                },
                required: ['structuredData', 'freetext', 'completeness'],
              },
            ])
          ),
        },
        overallReadiness: { type: 'number', description: 'Overall readiness 0-100' },
        lowestTopic: { type: 'string', description: 'Topic ID with lowest coverage' },
      },
      required: ['topics', 'overallReadiness', 'lowestTopic'],
    };

    const systemPrompt =
      'You are parsing a product description to extract structured information for a Market Requirements Document. Map the content to these categories: problem-vision, market-users, product-definition, design-experience, business-pricing, competitive-landscape. For each, extract relevant structured data and rate completeness 0-100.';

    const gemini = getGeminiProvider();

    const result = await gemini.generateStructured<{
      topics: Record<string, {
        structuredData: Record<string, string | string[]>;
        freetext: Record<string, string>;
        completeness: number;
      }>;
      overallReadiness: number;
      lowestTopic: string;
    }>(prompt, schema, systemPrompt, { maxTokens: 2048 });

    console.log('[API/intake/parse-kickstart] Parsed. Overall readiness:', result.overallReadiness, 'Lowest:', result.lowestTopic);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/intake/parse-kickstart] Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse product description. Please try again.' },
      { status: 500 }
    );
  }
}
