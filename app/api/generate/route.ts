import { NextRequest, NextResponse } from 'next/server';
import { conductResearch, isGeminiAvailable } from '@/lib/gemini';
import { generateMRD, MRDInput, ResearchSource } from '@/skills/mrd_generator';
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

    let researchFindings: ResearchSource[] = [];
    let researchSummary: string | undefined;

    // Use Gemini with Google Search grounding for research
    if (isGeminiAvailable()) {
      try {
        console.log('[API] Conducting research with Gemini Search grounding');
        const researchTopic = `${productConcept} for ${targetMarket}`;
        const researchContext = additionalDetails || undefined;

        const research = await conductResearch(researchTopic, researchContext);

        researchSummary = research.text;
        researchFindings = research.sources.map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
        }));

        console.log(`[API] Research complete: ${researchFindings.length} sources`);
      } catch (error) {
        console.error('[API] Research failed:', error);
        // Continue without research - MRD will be generated with available info
      }
    } else {
      console.log('[API] Gemini not available, skipping research');
    }

    // Generate the MRD (uses AI if available, otherwise template)
    const mrdInput: MRDInput = {
      productConcept,
      targetMarket,
      additionalDetails,
      researchFindings,
      researchSummary,
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
