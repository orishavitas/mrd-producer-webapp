import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';
import { sanitizeInput } from '@/lib/sanitize';

/**
 * POST /api/intake/revise-brief
 *
 * Applies user-requested revisions to an existing research brief.
 * Called when the user requests changes to the brief.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { currentBrief, revision } = body;

    if (!currentBrief || typeof currentBrief !== 'string' || !currentBrief.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: currentBrief' },
        { status: 400 }
      );
    }

    if (!revision || typeof revision !== 'string' || !revision.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: revision' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedBrief = sanitizeInput(currentBrief, { maxLength: 20000, allowMarkdown: true });
    const sanitizedRevision = sanitizeInput(revision, { maxLength: 5000 });

    console.log('[API/intake/revise-brief] Applying revision:', sanitizedRevision.slice(0, 80));

    const prompt = `Here is the current product research brief:

${sanitizedBrief}

The user has requested the following changes:
"${sanitizedRevision}"

Apply the requested changes to the brief. Preserve the overall structure and any unmodified content. Return the complete updated brief in markdown.

After the brief, list the specific changes you made as a JSON array of strings.

Format your response as:
BRIEF_START
[the complete updated brief in markdown]
BRIEF_END
CHANGES_START
[JSON array of change descriptions]
CHANGES_END`;

    const systemPrompt =
      'You are revising a product research brief. Apply the requested changes while preserving the overall structure and any unmodified content. Return the complete updated brief in markdown.';

    const chain = getProviderChain();

    const response = await chain.generateText(prompt, systemPrompt, {
      maxTokens: 4096,
    });

    // Parse the structured response
    const text = response.text;
    let brief = sanitizedBrief; // fallback to original if parsing fails
    let changes: string[] = [];

    const briefMatch = text.match(/BRIEF_START\s*([\s\S]*?)\s*BRIEF_END/);
    if (briefMatch) {
      brief = briefMatch[1].trim();
    } else {
      // If the model didn't follow the format, use the entire response as the brief
      brief = text.trim();
    }

    const changesMatch = text.match(/CHANGES_START\s*([\s\S]*?)\s*CHANGES_END/);
    if (changesMatch) {
      try {
        changes = JSON.parse(changesMatch[1].trim());
      } catch {
        changes = ['Brief was revised based on your request'];
      }
    } else {
      changes = ['Brief was revised based on your request'];
    }

    console.log('[API/intake/revise-brief] Revision applied.', changes.length, 'changes');

    return NextResponse.json({
      brief,
      changes,
    });
  } catch (error) {
    console.error('[API/intake/revise-brief] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revise brief. Please try again.' },
      { status: 500 }
    );
  }
}
