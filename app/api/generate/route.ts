import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { conductResearch, isGeminiAvailable } from '@/lib/gemini';
import { generateMRD, MRDInput, ResearchSource } from '@/skills/mrd_generator';
import { sanitizeMRDInput } from '@/lib/sanitize';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const requestId = crypto.randomUUID();
    const logger = createLogger(requestId);

    logger.info('Generating MRD', { productConcept: productConcept.slice(0, 50) });

    let researchFindings: ResearchSource[] = [];
    let researchSummary: string | undefined;

    // Use Gemini with Google Search grounding for research
    if (isGeminiAvailable()) {
      try {
        logger.info('Conducting research with Gemini Search grounding');
        const researchTopic = `${productConcept} for ${targetMarket}`;
        const researchContext = additionalDetails || undefined;

        const research = await conductResearch(researchTopic, researchContext);

        researchSummary = research.text;
        researchFindings = research.sources.map((s) => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
        }));

        logger.info('Research complete', { sourceCount: researchFindings.length });
      } catch (error) {
        logger.error('Research failed', { error: error instanceof Error ? error.message : String(error) });
        // Continue without research - MRD will be generated with available info
      }
    } else {
      logger.info('Gemini not available, skipping research');
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
    createLogger().error('Error generating MRD', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to generate MRD. Please try again.' },
      { status: 500 }
    );
  }
}
