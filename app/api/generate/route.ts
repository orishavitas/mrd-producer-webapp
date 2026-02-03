import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/skills/web_search';
import { generateMRD, MRDInput } from '@/skills/mrd_generator';
import { sanitizeMRDInput } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Sanitize user inputs to prevent prompt injection
    const {
      productConcept,
      targetMarket,
      additionalDetails,
      clarifications,
    } = sanitizeMRDInput(body);

    if (!productConcept || !targetMarket) {
      return NextResponse.json(
        { error: 'Product concept and target market are required' },
        { status: 400 }
      );
    }

    console.log('[API] Generating MRD for:', productConcept.slice(0, 50));

    // Perform multiple targeted searches for better research coverage
    const searchQueries = [
      `${productConcept} market size trends 2024 2025`,
      `${productConcept} ${targetMarket} competitors analysis`,
      `${targetMarket} user needs pain points problems`,
    ];

    // Run searches in parallel
    const searchPromises = searchQueries.map((query) =>
      searchWeb(query, { maxResults: 3 })
    );

    const searchResults = await Promise.all(searchPromises);
    const researchFindings: SearchResult[] = searchResults.flat();

    console.log(`[API] Gathered ${researchFindings.length} research findings`);

    // Generate the MRD (uses AI if available, otherwise template)
    const mrdInput: MRDInput = {
      productConcept,
      targetMarket,
      additionalDetails,
      researchFindings,
      clarifications,
    };

    const mrd = await generateMRD(mrdInput);

    // Return MRD with sources
    return NextResponse.json({
      mrd,
      sources: researchFindings.map((r) => ({
        title: r.title,
        url: r.url,
      })),
    });
  } catch (error) {
    console.error('[API] Error generating MRD:', error);
    return NextResponse.json(
      { error: 'Failed to generate MRD. Please try again.' },
      { status: 500 }
    );
  }
}
