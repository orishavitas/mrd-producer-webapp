import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const chain = getProviderChain();
    const systemPrompt = `You are a product analyst. Given a product URL, extract structured data. Return ONLY valid JSON with these fields:
{
  "brand": "company/brand name",
  "productName": "product name",
  "description": "1-2 sentence product description",
  "cost": "price or price range if available, empty string if not",
  "link": "the URL provided"
}
Do not include any text outside the JSON.`;

    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(
        `Extract product information from this URL: ${url}`,
        systemPrompt
      )
    );

    const parsed = JSON.parse(result.text);
    return NextResponse.json({ success: true, data: { ...parsed, link: url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
