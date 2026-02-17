// app/product-brief/lib/export-docx.ts

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ProductBriefState, FieldId } from './brief-state';

const FIELD_LABELS: Record<FieldId, string> = {
  product_description: 'Product Description',
  target_industry: 'Target Industry',
  where_used: 'Where Used',
  who_uses: 'Who Uses It',
  must_have: 'Must-Have Features',
  nice_to_have: 'Nice-to-Have Features',
  moq: 'Minimum Order Quantity',
  risk_assessment: 'Risk Assessment',
  competition: 'Competition',
};

export function generateDocxFromState(state: ProductBriefState): Document {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: 'Product Brief',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date(state.lastModified).toLocaleDateString()}`,
          italics: true,
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Separator
  sections.push(
    new Paragraph({
      text: '_______________________________________________________________',
      spacing: { after: 400 },
    })
  );

  // Add each field
  const fieldsToExport: FieldId[] = [
    'product_description',
    'target_industry',
    'where_used',
    'who_uses',
    'must_have',
    'nice_to_have',
    'moq',
    'risk_assessment',
    'competition',
  ];

  for (const fieldId of fieldsToExport) {
    const field = state.fields[fieldId];
    if (!field.content.trim()) continue;

    // Section heading
    sections.push(
      new Paragraph({
        text: FIELD_LABELS[fieldId],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Content
    const lines = field.content.split('\n').filter((line) => line.trim());
    lines.forEach((line) => {
      sections.push(
        new Paragraph({
          text: line,
          spacing: { after: 100 },
        })
      );
    });

    sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  return new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
}
