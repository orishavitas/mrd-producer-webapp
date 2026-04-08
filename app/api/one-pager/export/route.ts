import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import { createDocument } from '@/lib/db';
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
  ImageRun,
  TabStopPosition,
  TabStopType,
} from 'docx';

interface CompetitorEntry {
  url: string;
  brand: string;
  productName: string;
  description: string;
  cost: string;
  status: string;
  photoUrls: string[];
}

interface OnePagerData {
  description: string;
  goal: string;
  useCases: string;
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
  productName?: string;
  preparedBy?: string;
  userEmail?: string;
  featureLayout?: 'sideBySide' | 'stacked';
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

async function buildDocxChildren(data: OnePagerData): Promise<Paragraph[]> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Marketing Requirement Document',
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

  // Document metadata (product name, prepared by, contact)
  if (data.productName) children.push(labelValue('Product', data.productName));
  if (data.preparedBy) children.push(labelValue('Prepared By', data.preparedBy));
  if (data.userEmail) children.push(labelValue('Contact', data.userEmail));
  if (data.productName || data.preparedBy || data.userEmail) {
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

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

  // Use Cases
  if (data.useCases) {
    addSection('Use Cases', [textPara(data.useCases)]);
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

      // Competitor photos
      for (const photoUrl of comp.photoUrls ?? []) {
        try {
          let imgData: Buffer;
          let imgType: 'jpg' | 'png' | 'gif' | 'bmp' = 'jpg';
          if (photoUrl.startsWith('data:')) {
            const mime = photoUrl.split(';')[0].split('/')[1];
            if (mime === 'png') imgType = 'png';
            else if (mime === 'gif') imgType = 'gif';
            else if (mime === 'bmp') imgType = 'bmp';
            const base64 = photoUrl.split(',')[1];
            imgData = Buffer.from(base64, 'base64');
          } else {
            const lowerUrl = photoUrl.toLowerCase();
            if (lowerUrl.includes('.png')) imgType = 'png';
            else if (lowerUrl.includes('.gif')) imgType = 'gif';
            else if (lowerUrl.includes('.bmp')) imgType = 'bmp';
            const imgRes = await fetch(photoUrl);
            imgData = Buffer.from(await imgRes.arrayBuffer());
          }
          compItems.push(
            new Paragraph({
              children: [
                new ImageRun({
                  type: imgType,
                  data: imgData,
                  transformation: { width: 180, height: 120 },
                }),
              ],
              spacing: { after: 80 },
            })
          );
        } catch {
          // skip photo if fetch fails
        }
      }

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

function loadLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'compulocks-logo.png');
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
}

async function generateOnePagerDocx(data: OnePagerData): Promise<Buffer> {
  const docChildren = await buildDocxChildren(data);
  const logoBuffer = loadLogoBuffer();

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
                    text: data.productName || 'Marketing Requirement Document',
                    font: BRAND.fonts.heading,
                    size: BRAND.sizes.small,
                    color: BRAND.colors.muted,
                  }),
                  ...(logoBuffer ? [
                    new TextRun({ text: '\t' }),
                    new ImageRun({
                      type: 'png',
                      data: logoBuffer,
                      transformation: { width: 80, height: 14 },
                    }),
                  ] : []),
                ],
                tabStops: [
                  { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
                ],
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
  const logoBuffer = loadLogoBuffer();
  const logoSrc = logoBuffer
    ? `data:image/png;base64,${logoBuffer.toString('base64')}`
    : null;

  const docTitle = data.productName || 'Marketing Requirement Document';

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
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
    .doc-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 8pt;
      border-bottom: 3px solid #1D1F4A;
      padding-bottom: 8pt;
    }
    .doc-header h1 {
      margin: 0;
      border: none;
      padding: 0;
    }
    .doc-header h1::after { display: none; }
    .doc-logo { height: 20px; width: auto; display: block; }
    .doc-meta { margin-bottom: 12pt; font-size: 10pt; }
    .doc-meta p { margin: 2pt 0; }
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
    .photo-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 12px;
    }
    .photo-row img {
      flex: 1 1 auto;
      min-width: 0;
      max-width: calc(25% - 6px);
      max-height: 1280px;
      height: auto;
      width: auto;
      object-fit: contain;
      border-radius: 4px;
      background: #f3f4f6;
    }
    .feature-cards {
      display: flex;
      gap: 8pt;
      flex-wrap: wrap;
    }
    .feature-card {
      flex: 1 1 180pt;
      background: #f2f2f2;
      border: 1px solid #e0e0e0;
      border-radius: 12pt;
      padding: 12pt 14pt;
    }
    .feature-card-label {
      font-family: 'Barlow', sans-serif;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #009966;
      margin-bottom: 6pt;
    }
    .feature-card ul { margin: 0; padding-left: 14px; }
    .feature-card li { font-size: 10pt; margin-bottom: 2pt; }
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
<div class="doc-header">
  <h1>Marketing Requirement Document</h1>
  ${logoSrc ? `<img src="${logoSrc}" alt="Compulocks" class="doc-logo">` : ''}
</div>
${(data.productName || data.preparedBy || data.userEmail) ? `<div class="doc-meta">
  ${data.productName ? `<p><span class="label">Product:</span> ${data.productName}</p>` : ''}
  ${data.preparedBy ? `<p><span class="label">Prepared By:</span> ${data.preparedBy}</p>` : ''}
  ${data.userEmail ? `<p><span class="label">Contact:</span> <a href="mailto:${data.userEmail}">${data.userEmail}</a></p>` : ''}
</div>` : ''}
`;

  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
      html += `<p><span class="label">Environment:</span> ${esc(data.context.environments.map(cap).join(', '))}</p>\n`;
    }
    if (data.context.industries.length > 0) {
      html += `<p><span class="label">Industry:</span> ${esc(data.context.industries.map(cap).join(', '))}</p>\n`;
    }
  }

  const allRoles = [...data.audience.predefined, ...data.audience.custom];
  if (allRoles.length > 0) {
    html += '<h2>Who (Target Audience)</h2>\n<ul>\n';
    allRoles.forEach((r) => { html += `<li>${esc(r)}</li>\n`; });
    html += '</ul>\n';
  }

  if (data.useCases) {
    html += `<h2>Use Cases</h2>\n<p>${esc(data.useCases)}</p>\n`;
  }

  const hasFeatures = data.features.mustHave.length > 0 || data.features.niceToHave.length > 0;
  if (hasFeatures) {
    html += '<h2>Features</h2>\n';
    const isSideBySide = (data.featureLayout ?? 'sideBySide') === 'sideBySide';
    if (isSideBySide) {
      html += '<div class="feature-cards">\n';
      if (data.features.mustHave.length > 0) {
        html += '<div class="feature-card"><div class="feature-card-label">Must Have</div><ul>\n';
        data.features.mustHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
        html += '</ul></div>\n';
      }
      if (data.features.niceToHave.length > 0) {
        html += '<div class="feature-card"><div class="feature-card-label">Nice to Have</div><ul>\n';
        data.features.niceToHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
        html += '</ul></div>\n';
      }
      html += '</div>\n';
    } else {
      if (data.features.mustHave.length > 0) {
        html += '<div class="feature-card" style="margin-bottom:8pt"><div class="feature-card-label">Must Have</div><ul>\n';
        data.features.mustHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
        html += '</ul></div>\n';
      }
      if (data.features.niceToHave.length > 0) {
        html += '<div class="feature-card"><div class="feature-card-label">Nice to Have</div><ul>\n';
        data.features.niceToHave.forEach((f) => { html += `<li>${esc(f)}</li>\n`; });
        html += '</ul></div>\n';
      }
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
      if ((comp.photoUrls ?? []).length > 0) {
        html += `<div class="photo-row">\n`;
        for (const photoUrl of comp.photoUrls) {
          html += `<img src="${esc(photoUrl)}" alt="${esc(comp.productName)}">\n`;
        }
        html += `</div>\n`;
      }
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

    // Save to documents table (fire-and-forget — never blocks the export response)
    auth().then((session) => {
      if (session?.user?.email) {
        const title = data.productName || 'Untitled One-Pager';
        createDocument(session.user.email, title, 'one-pager', body as Record<string, unknown>).catch(
          (err) => console.error('[export] createDocument failed:', err instanceof Error ? err.message : err)
        );
      }
    }).catch(() => { /* auth unavailable — skip */ });

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
