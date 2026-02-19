import { NextRequest, NextResponse } from 'next/server';
import { getProviderChain } from '@/lib/providers/provider-chain';

export async function POST(request: NextRequest) {
  try {
    const { text, field } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters' },
        { status: 400 }
      );
    }

    const chain = getProviderChain();
    const systemPrompt = `You are a professional product specification writer. Expand the user's brief ${field || 'description'} input into a clear, professional paragraph. Keep the original meaning. Do not add information the user didn't provide. Be concise but thorough. Return only the expanded text, no preamble.`;

    const { result } = await chain.executeWithFallback(
      (provider) => provider.generateText(text, systemPrompt)
    );

    return NextResponse.json({ expanded: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Expansion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
