import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/skills/web_search';
import { generateMRD, MRDInput } from '@/skills/mrd_generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productConcept, targetMarket, additionalDetails } = body;

    if (!productConcept || !targetMarket) {
      return NextResponse.json(
        { error: 'Product concept and target market are required' },
        { status: 400 }
      );
    }

    // Perform web search for market research
    const searchQuery = `${productConcept} ${targetMarket} market analysis`;
    const researchFindings = await searchWeb(searchQuery);

    // Generate the MRD
    const mrdInput: MRDInput = {
      productConcept,
      targetMarket,
      additionalDetails,
      researchFindings,
    };

    const mrd = generateMRD(mrdInput);

    return NextResponse.json({ mrd });
  } catch (error) {
    console.error('Error generating MRD:', error);
    return NextResponse.json(
      { error: 'Failed to generate MRD' },
      { status: 500 }
    );
  }
}
