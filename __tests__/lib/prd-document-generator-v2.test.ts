import { generatePRDDocxV2, generatePRDHtmlV2 } from '@/lib/prd-document-generator';
import { PRDDocument } from '@/agent/agents/prd/prd-document-types';

const sampleDoc: PRDDocument = {
  sourceOnePagerId: 'op-1',
  productName: 'Widget Enclosure',
  preparedBy: 'Ori Shavit',
  version: '1.0',
  status: 'published',
  sections: [
    { key: 'overview', title: '1. Overview', enabled: true, content: 'An outdoor enclosure.' },
    { key: 'design_scope', title: '3. Design Scope', enabled: false, content: 'Should not appear.' },
    {
      key: 'requirements',
      title: '5. Requirements',
      enabled: true,
      content: [{ id: 'FR-1', category: 'Device & Electrical', requirement: 'House terminal', priority: 'Must' }],
    },
  ],
  comments: [],
};

describe('generatePRDDocxV2', () => {
  it('produces a non-empty DOCX buffer', async () => {
    const buffer = await generatePRDDocxV2(sampleDoc);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('generatePRDHtmlV2', () => {
  it('renders enabled sections and omits disabled ones', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('An outdoor enclosure.');
    expect(html).not.toContain('Should not appear.');
  });

  it('renders the requirements table with FR-1 and priority Must', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('FR-1');
    expect(html).toContain('Must');
    expect(html).toContain('House terminal');
  });

  it('embeds the PRD id and a comment panel script for the live thin-client', () => {
    const html = generatePRDHtmlV2(sampleDoc, 'prd-1');
    expect(html).toContain('prd-1');
    expect(html).toContain('/api/prd/prd-1/comments');
  });
});
