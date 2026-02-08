import { NextRequest, NextResponse } from 'next/server';
import { conductResearch, isGeminiAvailable } from '@/lib/gemini';
import { generateMRD, MRDInput, ResearchSource } from '@/skills/mrd_generator';
import { sanitizeMRDInput, sanitizeObject, sanitizeInput } from '@/lib/sanitize';
import { TOPIC_DEFINITIONS } from '@/app/intake/lib/topic-definitions';

/**
 * Build a comprehensive product description from structured intake data.
 * Combines all topic data into productConcept, targetMarket, and additionalDetails.
 */
function buildFromIntakeData(
  intakeData: Record<string, { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }>,
  brief?: string
): { productConcept: string; targetMarket: string; additionalDetails: string } {
  // Extract productConcept from problem-vision topic
  const problemVision = intakeData['problem-vision'];
  const productDef = intakeData['product-definition'];
  let productConcept = '';

  if (problemVision) {
    const problem = problemVision.structuredData?.problemDescription || '';
    const vision = problemVision.structuredData?.visionStatement || '';
    const productType = problemVision.structuredData?.productType || '';
    productConcept = [productType, problem, vision]
      .filter((s) => typeof s === 'string' && s.trim())
      .join(' - ');
  }
  if (!productConcept && productDef) {
    productConcept = (productDef.structuredData?.productDescription as string) || '';
  }
  if (!productConcept) {
    productConcept = 'Product concept from intake';
  }

  // Extract targetMarket from market-users topic
  const marketUsers = intakeData['market-users'];
  let targetMarket = '';

  if (marketUsers) {
    const segments = marketUsers.structuredData?.marketSegment;
    const geography = marketUsers.structuredData?.geography;
    const companySize = marketUsers.structuredData?.companySize;
    const parts: string[] = [];
    if (segments) parts.push(Array.isArray(segments) ? segments.join(', ') : segments);
    if (companySize && typeof companySize === 'string') parts.push(companySize);
    if (geography) parts.push(Array.isArray(geography) ? geography.join(', ') : geography);
    if (marketUsers.structuredData?.idealCustomer && typeof marketUsers.structuredData.idealCustomer === 'string') {
      parts.push(marketUsers.structuredData.idealCustomer);
    }
    targetMarket = parts.join(' | ');
  }
  if (!targetMarket) {
    targetMarket = 'General market';
  }

  // Build additionalDetails from ALL intake data
  const detailParts: string[] = [];

  for (const topicDef of TOPIC_DEFINITIONS) {
    const data = intakeData[topicDef.id];
    if (!data) continue;

    const entries: string[] = [];
    for (const [key, value] of Object.entries(data.structuredData || {})) {
      if (!value) continue;
      const displayValue = Array.isArray(value) ? value.join(', ') : value;
      if (!displayValue.trim()) continue;
      const field = topicDef.fields.find((f) => f.id === key);
      entries.push(`${field?.label || key}: ${displayValue}`);
    }
    for (const [key, value] of Object.entries(data.freetext || {})) {
      if (!value || !value.trim()) continue;
      const field = topicDef.fields.find((f) => f.id === key);
      entries.push(`${field?.label || key}: ${value}`);
    }

    if (entries.length > 0) {
      detailParts.push(`[${topicDef.name}]\n${entries.join('\n')}`);
    }
  }

  // Append the brief if available
  if (brief) {
    detailParts.push(`[Research Brief]\n${brief}`);
  }

  const additionalDetails = detailParts.join('\n\n');

  return { productConcept, targetMarket, additionalDetails };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let productConcept: string;
    let targetMarket: string;
    let additionalDetails: string | undefined;
    let clarifications: { question: string; answer: string }[] | undefined;

    // Check if this is from the new intake flow or the legacy format
    if (body.intakeData) {
      console.log('[API] Processing intake flow payload');

      // Sanitize the structured intake data
      const sanitizedIntake = sanitizeObject({ intakeData: body.intakeData });
      const intakeData = sanitizedIntake.intakeData as Record<
        string,
        { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
      >;
      const brief = body.brief ? sanitizeInput(body.brief, { maxLength: 20000, allowMarkdown: true }) : undefined;

      const extracted = buildFromIntakeData(intakeData, brief);
      productConcept = extracted.productConcept;
      targetMarket = extracted.targetMarket;
      additionalDetails = extracted.additionalDetails;
    } else {
      // Legacy format - sanitize as before
      const sanitized = sanitizeMRDInput(body);
      productConcept = sanitized.productConcept;
      targetMarket = sanitized.targetMarket;
      additionalDetails = sanitized.additionalDetails;
      clarifications = sanitized.clarifications;
    }

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
