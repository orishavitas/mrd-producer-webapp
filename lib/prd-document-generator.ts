/**
 * PRD Document Generator
 *
 * Converts PRD frames to professionally styled DOCX and HTML formats.
 * Follows Compulocks brand and template specifications.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';
import { PRDFrame } from '@/lib/prd-db';

const STYLE_CONFIG = {
  fonts: {
    primary: 'Arial',
  },
  colors: {
    text: '000000',
    heading: '1D1F4A',
  },
  sizes: {
    title: 40, // 20pt
    heading2: 32, // 16pt
    body: 22, // 11pt
  },
  spacing: {
    afterTitle: 240,
    afterHeading: 120,
    afterParagraph: 120,
    beforeHeading: 240,
  },
};

/**
 * Formats section title from section_key (e.g., "overview" -> "Overview")
 */
function formatSectionTitle(sectionKey: string): string {
  return sectionKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parses inline formatting in text for DOCX (bold, basic text).
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  // Split by bold markers (**text**)
  const parts = remaining.split(/(\*\*[^*]+\*\*)/g);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: STYLE_CONFIG.fonts.primary,
          size: STYLE_CONFIG.sizes.body,
        })
      );
    } else {
      // Regular text
      runs.push(
        new TextRun({
          text: part,
          font: STYLE_CONFIG.fonts.primary,
          size: STYLE_CONFIG.sizes.body,
        })
      );
    }
  }

  return runs.length > 0
    ? runs
    : [
        new TextRun({
          text,
          font: STYLE_CONFIG.fonts.primary,
          size: STYLE_CONFIG.sizes.body,
        }),
      ];
}

/**
 * Renders content lines into paragraphs, filtering out section headers.
 */
function renderSection(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and section markers
    if (!trimmed || trimmed.startsWith('===') || trimmed.startsWith('---')) {
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
        spacing: { after: STYLE_CONFIG.spacing.afterParagraph },
      })
    );
  }

  return paragraphs;
}

/**
 * Generates a professional DOCX document from PRD frames.
 */
export async function generatePRDDocx(
  frames: PRDFrame[],
  productName: string,
  preparedBy: string
): Promise<Buffer> {
  // Sort frames by section_order
  const sorted = [...frames].sort((a, b) => a.section_order - b.section_order);

  // Title paragraph
  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `${productName} — Product Requirements Document`,
        bold: true,
        font: STYLE_CONFIG.fonts.primary,
        size: STYLE_CONFIG.sizes.title,
        color: STYLE_CONFIG.colors.heading,
      }),
    ],
    alignment: AlignmentType.LEFT,
    spacing: { after: STYLE_CONFIG.spacing.afterTitle },
  });

  // Metadata paragraph
  const metaParagraph = new Paragraph({
    children: [
      new TextRun({
        text: `Prepared by: ${preparedBy}`,
        font: STYLE_CONFIG.fonts.primary,
        size: STYLE_CONFIG.sizes.body,
        color: '666666',
      }),
    ],
    spacing: { after: 240 },
  });

  // Section paragraphs
  const sectionParagraphs: Paragraph[] = [];

  for (const frame of sorted) {
    // Section heading
    const heading = new Paragraph({
      children: [
        new TextRun({
          text: formatSectionTitle(frame.section_key),
          bold: true,
          font: STYLE_CONFIG.fonts.primary,
          size: STYLE_CONFIG.sizes.heading2,
          color: STYLE_CONFIG.colors.heading,
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: {
        before: STYLE_CONFIG.spacing.beforeHeading,
        after: STYLE_CONFIG.spacing.afterHeading,
      },
    });

    sectionParagraphs.push(heading);

    // Section content
    const contentParagraphs = renderSection(frame.content);
    sectionParagraphs.push(...contentParagraphs);
  }

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [titleParagraph, metaParagraph, ...sectionParagraphs],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Generates a professional HTML document from PRD frames.
 */
export function generatePRDHtml(
  frames: PRDFrame[],
  productName: string,
  preparedBy: string
): string {
  // Sort frames by section_order
  const sorted = [...frames].sort((a, b) => a.section_order - b.section_order);

  // Build sections HTML
  const sectionsHtml = sorted
    .map((frame) => {
      const title = formatSectionTitle(frame.section_key);
      const lines = frame.content
        .split('\n')
        .filter((l) => {
          const trimmed = l.trim();
          return trimmed && !trimmed.startsWith('===') && !trimmed.startsWith('---');
        })
        .map((l) => `<p>${escapeHtml(l.trim())}</p>`)
        .join('\n');

      return `<section><h2>${escapeHtml(title)}</h2>${lines}</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(productName)} — PRD</title>
  <style>
    @page {
      size: letter;
      margin: 1in;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      max-width: 6.5in;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 6pt;
      color: #1D1F4A;
    }

    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 6pt;
      color: #1D1F4A;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 6pt;
    }

    .meta {
      color: #666;
      margin-bottom: 20px;
    }

    section {
      margin-bottom: 2em;
    }

    @media print {
      body {
        padding: 0;
      }

      h2 {
        page-break-after: avoid;
      }

      section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(productName)} — Product Requirements Document</h1>
  <p class="meta">Prepared by: ${escapeHtml(preparedBy)}</p>
  ${sectionsHtml}
</body>
</html>`;
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
