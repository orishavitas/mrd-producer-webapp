// app/api/product-brief/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Packer } from 'docx';
import { generateDocxFromState } from '@/app/product-brief/lib/export-docx';
import { ProductBriefState } from '@/app/product-brief/lib/brief-state';

export async function POST(request: NextRequest) {
  try {
    const state: ProductBriefState = await request.json();

    if (!state || !state.fields) {
      return NextResponse.json(
        { success: false, error: 'Invalid state provided' },
        { status: 400 }
      );
    }

    // Generate DOCX
    const doc = generateDocxFromState(state);
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="product-brief-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    console.error('[API] Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
