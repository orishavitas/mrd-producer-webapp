/**
 * Document Generator
 *
 * Converts Markdown MRD content to professionally styled DOCX and PDF formats.
 * Follows Compulocks MRD template specifications.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  BorderStyle,
  LevelFormat,
  convertInchesToTwip,
  TableOfContents,
  PageBreak,
  Header,
  Footer,
  ImageRun,
  PageNumber,
  NumberFormat,
} from 'docx';

/**
 * Document styling configuration matching MRD template.
 */
const STYLE_CONFIG = {
  fonts: {
    primary: 'Arial',
  },
  colors: {
    text: '000000',
    heading: '000000',
    link: '1155CC',
    accent: '2E5AAC',
  },
  sizes: {
    title: 40,      // 20pt
    heading2: 32,   // 16pt
    heading3: 26,   // 13pt
    body: 22,       // 11pt
  },
  spacing: {
    afterTitle: 240,
    afterHeading: 120,
    afterParagraph: 120,
    beforeHeading: 240,
  },
};

/**
 * Parsed section from markdown.
 */
interface ParsedSection {
  level: 'h1' | 'h2' | 'h3';
  title: string;
  content: ParsedContent[];
}

/**
 * Parsed content element.
 */
type ParsedContent =
  | { type: 'paragraph'; text: string; bold?: boolean }
  | { type: 'bullet'; text: string; level: number }
  | { type: 'link'; text: string; url: string }
  | { type: 'hr' };

/**
 * Parses markdown into structured sections.
 */
function parseMarkdown(markdown: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = markdown.split('\n');

  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading 1: # Title
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        level: 'h1',
        title: line.slice(2).trim(),
        content: [],
      };
      continue;
    }

    // Heading 2: ## Section
    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        level: 'h2',
        title: line.slice(3).trim(),
        content: [],
      };
      continue;
    }

    // Heading 3: ### Subsection
    if (line.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        level: 'h3',
        title: line.slice(4).trim(),
        content: [],
      };
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      if (currentSection) {
        currentSection.content.push({ type: 'hr' });
      }
      continue;
    }

    // Bullet point
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const level = line.match(/^(\s*)/)?.[1]?.length || 0;
      const bulletLevel = Math.floor(level / 2);
      const text = line.trim().slice(2).trim();
      if (currentSection && text) {
        currentSection.content.push({
          type: 'bullet',
          text,
          level: bulletLevel,
        });
      }
      continue;
    }

    // Regular paragraph
    if (line.trim() && currentSection) {
      currentSection.content.push({
        type: 'paragraph',
        text: line.trim(),
      });
    }
  }

  if (currentSection) sections.push(currentSection);

  return sections;
}

/**
 * Parses inline formatting (bold, links) from text.
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  // Pattern for **bold** and [link](url)
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' as const },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' as const },
  ];

  // Simple approach: split by bold markers first
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
      // Check for links in regular text
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(part)) !== null) {
        // Text before link
        if (match.index > lastIndex) {
          runs.push(
            new TextRun({
              text: part.slice(lastIndex, match.index),
              font: STYLE_CONFIG.fonts.primary,
              size: STYLE_CONFIG.sizes.body,
            })
          );
        }

        // Link text (styled as link)
        runs.push(
          new TextRun({
            text: match[1],
            font: STYLE_CONFIG.fonts.primary,
            size: STYLE_CONFIG.sizes.body,
            color: STYLE_CONFIG.colors.link,
            underline: {},
          })
        );

        lastIndex = match.index + match[0].length;
      }

      // Remaining text after last link
      if (lastIndex < part.length) {
        runs.push(
          new TextRun({
            text: part.slice(lastIndex),
            font: STYLE_CONFIG.fonts.primary,
            size: STYLE_CONFIG.sizes.body,
          })
        );
      }
    }
  }

  return runs.length > 0 ? runs : [
    new TextRun({
      text,
      font: STYLE_CONFIG.fonts.primary,
      size: STYLE_CONFIG.sizes.body,
    }),
  ];
}

/**
 * Creates a styled DOCX document from markdown content.
 * @param documentTitle - When provided, used as the main document title (e.g. "Product Brief"). Otherwise "Market Requirements Document (MRD)".
 */
export async function generateDocx(
  markdown: string,
  productName?: string,
  documentTitle?: string
): Promise<Buffer> {
  const sections = parseMarkdown(markdown);
  const docChildren: Paragraph[] = [];

  // Add document title
  const titleText =
    documentTitle || 'Market Requirements Document (MRD)';
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: titleText,
          font: STYLE_CONFIG.fonts.primary,
          size: STYLE_CONFIG.sizes.title,
          bold: true,
          color: STYLE_CONFIG.colors.heading,
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: STYLE_CONFIG.spacing.afterTitle },
      alignment: AlignmentType.CENTER,
    })
  );

  // Add horizontal rule after title
  docChildren.push(createHorizontalRule());

  // Process each section
  for (const section of sections) {
    // Skip the main title if already added
    if (
      section.level === 'h1' &&
      (section.title.includes('Market Requirements Document') ||
        section.title === titleText)
    ) {
      continue;
    }

    // Add section heading
    if (section.level === 'h1') {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              font: STYLE_CONFIG.fonts.primary,
              size: STYLE_CONFIG.sizes.title,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: STYLE_CONFIG.spacing.beforeHeading,
            after: STYLE_CONFIG.spacing.afterHeading,
          },
        })
      );
    } else if (section.level === 'h2') {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              font: STYLE_CONFIG.fonts.primary,
              size: STYLE_CONFIG.sizes.heading2,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: STYLE_CONFIG.spacing.beforeHeading,
            after: STYLE_CONFIG.spacing.afterHeading,
          },
        })
      );
    } else if (section.level === 'h3') {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              font: STYLE_CONFIG.fonts.primary,
              size: STYLE_CONFIG.sizes.heading3,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: {
            before: 120,
            after: STYLE_CONFIG.spacing.afterHeading,
          },
        })
      );
    }

    // Add section content
    for (const content of section.content) {
      if (content.type === 'hr') {
        docChildren.push(createHorizontalRule());
      } else if (content.type === 'paragraph') {
        docChildren.push(
          new Paragraph({
            children: parseInlineFormatting(content.text),
            spacing: { after: STYLE_CONFIG.spacing.afterParagraph },
          })
        );
      } else if (content.type === 'bullet') {
        docChildren.push(
          new Paragraph({
            children: parseInlineFormatting(content.text),
            numbering: {
              reference: 'mrd-bullets',
              level: content.level,
            },
            spacing: { after: 80 },
          })
        );
      }
    }
  }

  // Create the document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: STYLE_CONFIG.fonts.primary,
            size: STYLE_CONFIG.sizes.body,
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: STYLE_CONFIG.sizes.title,
            bold: true,
            font: STYLE_CONFIG.fonts.primary,
          },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: STYLE_CONFIG.sizes.title,
            bold: true,
            font: STYLE_CONFIG.fonts.primary,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: STYLE_CONFIG.sizes.heading2,
            bold: true,
            font: STYLE_CONFIG.fonts.primary,
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            size: STYLE_CONFIG.sizes.heading3,
            bold: true,
            font: STYLE_CONFIG.fonts.primary,
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'mrd-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.25),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '○',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.5),
                    hanging: convertInchesToTwip(0.25),
                  },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: titleText,
                    font: STYLE_CONFIG.fonts.primary,
                    size: 18,
                    color: '666666',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                    font: STYLE_CONFIG.fonts.primary,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: STYLE_CONFIG.fonts.primary,
                    size: 18,
                  }),
                  new TextRun({
                    text: ' of ',
                    font: STYLE_CONFIG.fonts.primary,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: STYLE_CONFIG.fonts.primary,
                    size: 18,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Creates a horizontal rule paragraph.
 */
function createHorizontalRule(): Paragraph {
  return new Paragraph({
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: 'CCCCCC',
      },
    },
    spacing: { after: 200, before: 200 },
  });
}

/**
 * Generates a simple HTML representation for PDF conversion.
 */
export function generateHtml(markdown: string, productName?: string): string {
  const sections = parseMarkdown(markdown);
  const title = productName || 'Market Requirements Document';

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      text-align: center;
      margin-bottom: 12pt;
      color: #000;
    }

    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 6pt;
      color: #000;
      page-break-after: avoid;
    }

    h3 {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      color: #000;
    }

    p {
      margin-bottom: 6pt;
    }

    ul {
      margin: 0;
      padding-left: 0.25in;
    }

    li {
      margin-bottom: 4pt;
    }

    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 12pt 0;
    }

    a {
      color: #1155CC;
      text-decoration: underline;
    }

    .header {
      text-align: right;
      font-size: 9pt;
      color: #666;
      margin-bottom: 20px;
    }

    .footer {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }

    @media print {
      body {
        padding: 0;
      }

      h2 {
        page-break-after: avoid;
      }

      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">${title}</div>
`;

  // Convert markdown to HTML
  for (const section of sections) {
    const headingTag = section.level === 'h1' ? 'h1' : section.level === 'h2' ? 'h2' : 'h3';
    html += `<${headingTag}>${escapeHtml(section.title)}</${headingTag}>\n`;

    let inList = false;
    for (const content of section.content) {
      if (content.type === 'bullet') {
        if (!inList) {
          html += '<ul>\n';
          inList = true;
        }
        html += `<li>${formatInlineHtml(content.text)}</li>\n`;
      } else {
        if (inList) {
          html += '</ul>\n';
          inList = false;
        }
        if (content.type === 'hr') {
          html += '<hr>\n';
        } else if (content.type === 'paragraph') {
          html += `<p>${formatInlineHtml(content.text)}</p>\n`;
        }
      }
    }
    if (inList) {
      html += '</ul>\n';
    }
  }

  html += `
  <div class="footer">Generated by MRD Producer</div>
</body>
</html>`;

  return html;
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

/**
 * Formats inline markdown (bold, links) to HTML.
 */
function formatInlineHtml(text: string): string {
  let html = escapeHtml(text);

  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert [text](url) to <a href="url">text</a>
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  return html;
}
