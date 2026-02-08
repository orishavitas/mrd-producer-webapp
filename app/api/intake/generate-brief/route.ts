import { NextRequest, NextResponse } from 'next/server';
import { getGeminiProvider } from '@/lib/providers/gemini-provider';
import { sanitizeObject } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * POST /api/intake/generate-brief
 *
 * Generates a structured research brief from all collected intake data.
 * Called when the user clicks "Review" to see the research brief.
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

    // Sanitize all user-provided inputs
    const sanitized = sanitizeObject({ allTopicsData });
    const sanitizedTopics = sanitized.allTopicsData as Record<
      string,
      { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
    >;

    console.log('[API/intake/generate-brief] Generating brief from', Object.keys(sanitizedTopics).length, 'topics');

    // Build a comprehensive summary of all intake data
    const topicSummaries = TOPIC_DEFINITIONS.map((topicDef) => {
      const data = sanitizedTopics[topicDef.id];
      if (!data) return `## ${topicDef.name}\nNo data provided.`;

      const structuredEntries = Object.entries(data.structuredData || {})
        .filter(([, v]) => v && (typeof v === 'string' ? v.trim() : (v as string[]).length > 0))
        .map(([k, v]) => {
          const field = topicDef.fields.find((f) => f.id === k);
          const label = field?.label || k;
          return `- **${label}**: ${Array.isArray(v) ? v.join(', ') : v}`;
        })
        .join('\n');

      const freetextEntries = Object.entries(data.freetext || {})
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => {
          const field = topicDef.fields.find((f) => f.id === k);
          const label = field?.label || k;
          return `- **${label}**: ${v}`;
        })
        .join('\n');

      return `## ${topicDef.name}\n${structuredEntries}\n${freetextEntries}`.trim();
    }).join('\n\n');

    const prompt = `Generate a structured research brief for an MRD based on the following collected intake data.

${topicSummaries}

The MRD follows a 12-section structure:
1. Purpose & Vision
2. Problem Statement
3. Target Market & Use Cases
4. Target Users
5. Product Description
6. Key Requirements (with subsections)
7. Design & Aesthetics
8. Target Price
9. Risks and Thoughts
10. Competition to review
11. Additional Considerations
12. Success Criteria

Create a research brief that organizes the intake data into these 12 sections. For each section, summarize what we know and note what needs further research. Use markdown formatting.

Also assess overall readiness as a score from 0-100 based on how complete the intake data is.`;

    const systemPrompt =
      'You are a product research analyst. Generate a structured research brief for an MRD based on the collected intake data. Organize by the 12 MRD sections. Be concise but thorough. Use markdown formatting.';

    const gemini = getGeminiProvider();

    const response = await gemini.generateText(prompt, systemPrompt, {
      maxTokens: 4096,
    });

    // Extract readiness score from the response or estimate from topic coverage
    const topicCount = Object.keys(sanitizedTopics).length;
    const filledTopics = Object.values(sanitizedTopics).filter((t) => {
      const hasStructured = Object.values(t.structuredData || {}).some(
        (v) => v && (typeof v === 'string' ? v.trim() : (v as string[]).length > 0)
      );
      const hasFreetext = Object.values(t.freetext || {}).some((v) => v && v.trim());
      return hasStructured || hasFreetext;
    }).length;
    const readiness = Math.round((filledTopics / Math.max(topicCount, 6)) * 100);

    console.log('[API/intake/generate-brief] Brief generated. Readiness:', readiness);

    return NextResponse.json({
      brief: response.text,
      readiness,
    });
  } catch (error) {
    console.error('[API/intake/generate-brief] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate research brief. Please try again.' },
      { status: 500 }
    );
  }
}
