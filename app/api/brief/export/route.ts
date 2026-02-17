/**
 * Brief Helper - Export API
 *
 * POST /api/brief/export
 *
 * Builds markdown from the 6 fields and returns a DOCX download.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDocx } from '@/lib/document-generator';
import type { BriefField } from '@/app/brief-helper/lib/brief-state';

const FIELD_LABELS: Record<BriefField, string> = {
  what: 'What - Product Description',
  who: 'Who - Target Users/Customers',
  where: 'Where - Use Environment',
  moq: 'MOQ - Minimum Order Quantity',
  'must-have': 'Must-Have Features',
  'nice-to-have': 'Nice-to-Have Features',
};

const FIELD_ORDER: BriefField[] = [
  'what',
  'who',
  'where',
  'moq',
  'must-have',
  'nice-to-have',
];

interface ExportRequest {
  fields: {
    [K in BriefField]?: string[];
  };
  productName?: string;
}

function buildMarkdown(fields: ExportRequest['fields']): string {
  const parts: string[] = [];

  for (const id of FIELD_ORDER) {
    const bullets = fields[id] ?? [];
    parts.push(`## ${FIELD_LABELS[id]}`);
    parts.push('');
    if (bullets.length > 0) {
      for (const b of bullets) {
        parts.push(`* ${b}`);
        parts.push('');
      }
    } else {
      parts.push('—');
      parts.push('');
    }
    parts.push('---');
    parts.push('');
  }

  return parts.join('\n');
}

function validateRequest(
  body: unknown
): { valid: true; data: ExportRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  if (!b.fields || typeof b.fields !== 'object') {
    return { valid: false, error: 'fields is required' };
  }
  const fields = b.fields as Record<string, unknown>;
  for (const key of FIELD_ORDER) {
    const val = fields[key];
    if (val !== undefined && !Array.isArray(val)) {
      return { valid: false, error: `fields.${key} must be an array of strings` };
    }
    if (Array.isArray(val) && val.some((x) => typeof x !== 'string')) {
      return { valid: false, error: `fields.${key} must contain only strings` };
    }
  }
  return {
    valid: true,
    data: {
      fields: b.fields as ExportRequest['fields'],
      productName: typeof b.productName === 'string' ? b.productName : undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fields, productName } = validation.data;
    const markdown = buildMarkdown(fields);
    const title = productName?.trim() || 'Product Brief';
    const buffer = await generateDocx(markdown, title, 'Product Brief');

    const safeName = title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50);
    const filename = `Brief-${safeName}-${new Date().toISOString().slice(0, 10)}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Brief Export API] Error:', error);
    return NextResponse.json(
      {
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
