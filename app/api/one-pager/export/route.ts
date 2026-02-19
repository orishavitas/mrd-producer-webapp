import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
} from 'docx';

interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: string;
}

interface OnePagerData {
  description: string;
  goal: string;
  context: {
    environments: string[];
    industries: string[];
  };
  audience: {
    predefined: string[];
    custom: string[];
  };
  features: {
    mustHave: string[];
    niceToHave: string[];
  };
  commercials: {
    moq: string;
    targetPrice: string;
  };
  competitors: CompetitorEntry[];
}

const BRAND = {
  colors: {
    primary: '1D1F4A',
    highlight: '243469',
    text: '1D1F4A',
    body: '333333',
    muted: '666666',
    link: '243469',
    rule: 'D1D5DB',
  },
  fonts: {
    heading: 'Barlow Condensed',
    body: 'Barlow',
  },
  sizes: {
    title: 40,
    heading2: 28,
    heading3: 24,
    body: 22,
    small: 18,
  },
  spacing: {
    afterTitle: 300,
    afterHeading: 120,
    afterParagraph: 100,
    beforeHeading: 240,
  },
};

function buildDocxChildren(data: OnePagerData): Paragraph[] {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Product One-Pager',
          font: BRAND.fonts.heading,
          size: BRAND.sizes.title,
          bold: true,
          color: BRAND.colors.primary,
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: BRAND.spacing.afterTitle },
      alignment: AlignmentType.LEFT,
    })
  );

  // HR after title
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND.colors.primary },
      },
      spacing: { after: 200 },
    })
  );

  const addSection = (title: string, contentParagraphs: Paragraph[]) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title.toUpperCase(),
            font: BRAND.fonts.heading,
            size: BRAND.sizes.heading2,
            bold: true,
            color: BRAND.colors.primary,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: BRAND.spacing.beforeHeading, after: BRAND.spacing.afterHeading },
      })
    );
    children.push(...contentParagraphs);
  };

  const textPara = (text: string) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          font: BRAND.fonts.body,
          size: BRAND.sizes.body,
          color: BRAND.colors.body,
        }),
      ],
      spacing: { after: BRAND.spacing.afterParagraph },
    });

  const bulletPara = (text: string) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          font: BRAND.fonts.body,
          size: BRAND.sizes.body,
          color: BRAND.colors.body,
        }),
      ],
      numbering: { reference: 'onepager-bullets', level: 0 },
      spacing: { after: 60 },
    });

  const labelValue = (label: string, value: string) =>
    new Paragraph({
      children: [
        new TextRun({
          text: `${label}: `,
          font: BRAND.fonts.body,
          size: BRAND.sizes.body,
          bold: true,
          color: BRAND.colors.text,
        }),
        new TextRun({
          text: value,
          font: BRAND.fonts.body,
          size: BRAND.sizes.body,
          color: BRAND.colors.body,
        }),
      ],
      spacing: { after: BRAND.spacing.afterParagraph },
    });

  // 1. Description
  if (data.description) {
    addSection('Product Description', [textPara(data.description)]);
  }

  // 2. Goal
  if (data.goal) {
    addSection('Goal', [textPara(data.goal)]);
  }

  // 3. Where
  const whereItems: Paragraph[] = [];
  if (data.context.environments.length > 0) {
    whereItems.push(labelValue('Environment', data.context.environments.join(', ')));
  }
  if (data.context.industries.length > 0) {
    whereItems.push(labelValue('Industry', data.context.industries.join(', ')));
  }
  if (whereItems.length > 0) {
    addSection('Where', whereItems);
  }

  // 4. Who
  const allRoles = [...data.audience.predefined, ...data.audience.custom];
  if (allRoles.length > 0) {
    addSection('Who (Target Audience)', allRoles.map((r) => bulletPara(r)));
  }

  // 5. Features
  const featureItems: Paragraph[] = [];
  if (data.features.mustHave.length > 0) {
    featureItems.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Must Have',
            font: BRAND.fonts.heading,
            size: BRAND.sizes.heading3,
            bold: true,
            color: BRAND.colors.highlight,
          }),
        ],
        spacing: { before: 120, after: 60 },
      })
    );
    featureItems.push(...data.features.mustHave.map((f) => bulletPara(f)));
  }
  if (data.features.niceToHave.length > 0) {
    featureItems.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Nice to Have',
            font: BRAND.fonts.heading,
            size: BRAND.sizes.heading3,
            bold: true,
            color: BRAND.colors.highlight,
          }),
        ],
        spacing: { before: 120, after: 60 },
      })
    );
    featureItems.push(...data.features.niceToHave.map((f) => bulletPara(f)));
  }
  if (featureItems.length > 0) {
    addSection('Features', featureItems);
  }

  // 6. Commercials
  const commercialItems: Paragraph[] = [];
  if (data.commercials.moq) commercialItems.push(labelValue('MOQ', data.commercials.moq));
  if (data.commercials.targetPrice) commercialItems.push(labelValue('Target Price', data.commercials.targetPrice));
  if (commercialItems.length > 0) {
    addSection('Commercials', commercialItems);
  }

  // 7. Competitors
  const doneCompetitors = data.competitors.filter((c) => c.status === 'done');
  if (doneCompetitors.length > 0) {
    const compItems: Paragraph[] = [];
    for (const comp of doneCompetitors) {
      compItems.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${comp.brand} — ${comp.productName}`,
              font: BRAND.fonts.heading,
              size: BRAND.sizes.heading3,
              bold: true,
              color: BRAND.colors.highlight,
            }),
          ],
          spacing: { before: 120, after: 40 },
        })
      );
      if (comp.cost) compItems.push(labelValue('Price', comp.cost));
      if (comp.description) compItems.push(textPara(comp.description));
      compItems.push(
        new Paragraph({
          children: [
            new TextRun({
              text: comp.url,
              font: BRAND.fonts.body,
              size: BRAND.sizes.small,
              color: BRAND.colors.link,
              underline: {},
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }
    addSection('Competitors', compItems);
  }

  return children;
}

async function generateOnePagerDocx(data: OnePagerData): Promise<Buffer> {
  const docChildren = buildDocxChildren(data);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: BRAND.fonts.body,
            size: BRAND.sizes.body,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'onepager-bullets',
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
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Product One-Pager',
                    font: BRAND.fonts.heading,
                    size: BRAND.sizes.small,
                    color: BRAND.colors.muted,
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
                    font: BRAND.fonts.body,
                    size: BRAND.sizes.small,
                    color: BRAND.colors.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: BRAND.fonts.body,
                    size: BRAND.sizes.small,
                    color: BRAND.colors.muted,
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

  return Buffer.from(await Packer.toBuffer(doc));
}

function generateOnePagerHtml(data: OnePagerData): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Product One-Pager</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500&family=Barlow:wght@400;500&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 0.75in; }
    body {
      font-family: 'Barlow', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      max-width: 7in;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 22pt;
      font-weight: 500;
      color: #1D1F4A;
      margin-bottom: 8pt;
      text-transform: uppercase;
    }
    h1::after {
      content: '';
      display: block;
      width: 100%;
      height: 3px;
      background: #1D1F4A;
      margin-top: 8pt;
    }
    h2 {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14pt;
      font-weight: 500;
      color: #1D1F4A;
      text-transform: uppercase;
      margin-top: 16pt;
      margin-bottom: 6pt;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3pt;
    }
    h3 {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 12pt;
      font-weight: 500;
      color: #243469;
      margin-top: 10pt;
      margin-bottom: 4pt;
    }
    p { margin-bottom: 6pt; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 3pt; }
    .label { font-weight: 500; color: #1D1F4A; }
    a { color: #243469; }
    .footer {
      text-align: center;
      font-size: 9pt;
      color: #999;
      margin-top: 24pt;
      padding-top: 8pt;
      border-top: 1px solid #e5e7eb;
    }
    @media print {
      body { padding: 0; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
<h1>Product One-Pager</h1>
`;

  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (data.description) {
    html += `<h2>Product Description</h2>\n<p>${esc(data.description)}</p>\n`;
  }
  if (data.goal) {
    html += `<h2>Goal</h2>\n<p>${esc(data.goal)}</p>\n`;
  }

  const hasWhere = data.context.environments.length > 0 || data.context.industries.length > 0;
  if (hasWhere) {
    html += '<h2>Where</h2>\n';
    if (data.context.environments.length > 0) {
      html += `<p><span class="label">Environment:</span> ${esc(data.context.environments.join(', '))}</p>\n`;
    }
    if (data.context.industries.length > 0) {
      html += `<p><span class="label">Industry:</span> ${esc(data.context.industries.join(', '))}</p>\n`;
    }
  }

  const allRoles = [...data.audience.predefined, ...data.audience.custom];
  if (allRoles.length > 0) {
    html += '<h2>Who (Target Audience)</h2>\n<ul>\n';
    allRoles.forEach((r) => { html += `<li>${esc(r)}</li>\n`; });
    html += '</ul>\n';
  }

  const hasFeatures = data.features.mustHave.length > 0 || data.features.niceToHave.length > 0;
  if (hasFeatures) {
    html += '<h2>Features</h2>\n';
    if (data.features.mustHave.length > 0) {
      html += '<h3>Must Have</h3>\n<ul>\n';
      data.features.mustHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
      html += '</ul>\n';
    }
    if (data.features.niceToHave.length > 0) {
      html += '<h3>Nice to Have</h3>\n<ul>\n';
      data.features.niceToHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
      html += '</ul>\n';
    }
  }

  const hasCommercials = data.commercials.moq || data.commercials.targetPrice;
  if (hasCommercials) {
    html += '<h2>Commercials</h2>\n';
    if (data.commercials.moq) html += `<p><span class="label">MOQ:</span> ${esc(data.commercials.moq)}</p>\n`;
    if (data.commercials.targetPrice) html += `<p><span class="label">Target Price:</span> ${esc(data.commercials.targetPrice)}</p>\n`;
  }

  const doneCompetitors = data.competitors.filter((c) => c.status === 'done');
  if (doneCompetitors.length > 0) {
    html += '<h2>Competitors</h2>\n';
    for (const comp of doneCompetitors) {
      html += `<h3>${esc(comp.brand)} — ${esc(comp.productName)}</h3>\n`;
      if (comp.cost) html += `<p><span class="label">Price:</span> ${esc(comp.cost)}</p>\n`;
      if (comp.description) html += `<p>${esc(comp.description)}</p>\n`;
      html += `<p><a href="${esc(comp.url)}" target="_blank">View product</a></p>\n`;
    }
  }

  html += '<div class="footer">Generated by MRD Producer</div>\n</body>\n</html>';
  return html;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const format = new URL(request.url).searchParams.get('format') || 'docx';
    const data: OnePagerData = body;

    if (format === 'html' || format === 'pdf') {
      const html = generateOnePagerHtml(data);
      if (format === 'pdf') {
        return NextResponse.json({ html });
      }
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.html"`,
        },
      });
    }

    // Default: DOCX
    const buffer = await generateOnePagerDocx(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="one-pager-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
