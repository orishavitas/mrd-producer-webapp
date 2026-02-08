/**
 * Strategy Section Generator
 *
 * Specializes in generating business strategy and analysis sections:
 * - Section 8: Target Price
 * - Section 9: Risks and Thoughts
 * - Section 10: Competition to review
 * - Section 11: Additional Considerations
 * - Section 12: Success Criteria
 *
 * This agent has deep expertise in pricing strategy, competitive analysis,
 * risk assessment, and success metrics.
 */

import {
  BaseSectionGenerator,
  SectionGeneratorInput,
  SectionGeneratorOutput,
} from './base-section-generator';

export class StrategySectionGenerator extends BaseSectionGenerator {
  readonly id = 'strategy-section-generator';
  readonly name = 'Strategy Section Generator';
  readonly version = '1.0.0';
  readonly description =
    'Generates strategy and analysis MRD sections: Target Price, Risks, Competition, Additional Considerations, Success Criteria';

  readonly domain = 'strategy';
  readonly sectionRange: [number, number] = [8, 12];

  protected getTaskDescription(): string {
    return `Generate MRD sections 8-12 focusing on business strategy and competitive analysis:

**Section 8: Target Price**
- Single bold statement with target price
- Format: "* **Target price is $XXX**"

**Section 9: Risks and Thoughts**
- Analyze product risks, market challenges, and strategic considerations
- Use quotes for key terms, "Vs." for comparisons
- Multi-paragraph analysis covering technical, market, and business risks
- Format: Free-form prose analysis (2-4 paragraphs)

**Section 10: Competition to review**
- List competitor products and companies with URLs
- Extract from research findings
- Format: Markdown link list with optional descriptions

**Section 11: Additional Considerations (Summary)**
- Key factors beyond core requirements
- Use bold labels for categories
- Format: Bullet list with bold labels and descriptions

**Section 12: Success Criteria**
- Measurable success metrics and KPIs
- Specific, testable criteria
- Format: Bullet list with blank lines between items

Use research findings extensively for competitive analysis and pricing context.
Be analytical and strategic in risk assessment.`;
  }

  protected generateTemplateSections(input: SectionGeneratorInput): SectionGeneratorOutput {
    const sections: Record<number, string> = {};
    const confidence: Record<number, number> = {};
    const dataSources: Record<number, ('user' | 'research' | 'clarification' | 'inferred')[]> = {};
    const gaps: string[] = [];

    // Section 8: Target Price
    sections[8] = this.generateTargetPrice(input);
    confidence[8] = 60;
    dataSources[8] = ['inferred'];

    // Check for price info in input
    const hasPriceInfo = this.extractPriceInfo(input);
    if (hasPriceInfo) {
      confidence[8] = 85;
      dataSources[8] = ['user'];
    } else {
      gaps.push('Target price not specified - using estimated market positioning');
    }

    // Section 9: Risks and Thoughts
    sections[9] = this.generateRisksAndThoughts(input);
    confidence[9] = 75;
    dataSources[9] = ['user', 'inferred'];

    // Section 10: Competition
    sections[10] = this.generateCompetition(input);
    confidence[10] = input.researchFindings.length > 0 ? 90 : 50;
    dataSources[10] = input.researchFindings.length > 0 ? ['research'] : ['inferred'];

    // Section 11: Additional Considerations
    sections[11] = this.generateAdditionalConsiderations(input);
    confidence[11] = 75;
    dataSources[11] = ['user', 'inferred'];

    // Section 12: Success Criteria
    sections[12] = this.generateSuccessCriteria(input);
    confidence[12] = 80;
    dataSources[12] = ['user', 'inferred'];

    if (!input.researchFindings.length) {
      gaps.push('Limited competitive research - competitor list based on industry knowledge');
    }

    return {
      sections,
      confidence,
      dataSources,
      gaps,
      domain: this.domain,
    };
  }

  private extractPriceInfo(input: SectionGeneratorInput): number | null {
    const combined = `${input.productConcept} ${input.additionalDetails || ''}`.toLowerCase();

    // Look for price patterns like $XXX, XX dollars, price of XX, etc.
    const pricePatterns = [
      /\$\s*(\d+)/,
      /(\d+)\s*dollars?/i,
      /price[:\s]+\$?\s*(\d+)/i,
      /target[:\s]+\$?\s*(\d+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = combined.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  private generateTargetPrice(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 8. Target Price');
    lines.push('');

    const priceInfo = this.extractPriceInfo(input);
    const conceptLower = input.productConcept.toLowerCase();

    let price = 299; // Default

    if (priceInfo) {
      price = priceInfo;
    } else {
      // Estimate based on product type
      if (conceptLower.includes('floor stand') || conceptLower.includes('floor-stand')) {
        price = 349;
      } else if (conceptLower.includes('stand')) {
        price = 249;
      } else if (conceptLower.includes('mount')) {
        price = 149;
      } else if (conceptLower.includes('enclosure')) {
        price = 199;
      } else if (conceptLower.includes('kiosk')) {
        price = 599;
      }
    }

    lines.push(`* **Target price is $${price}**`);
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }

  private generateRisksAndThoughts(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 9. Risks and Thoughts');
    lines.push('');

    const conceptLower = input.productConcept.toLowerCase();
    const targetLower = input.targetMarket.toLowerCase();

    // Paragraph 1: Product positioning
    let positioning = `This product targets the "${input.targetMarket}" market, positioning as a `;

    if (conceptLower.includes('premium') || conceptLower.includes('high-end')) {
      positioning += `"premium solution" that emphasizes quality and durability over cost. `;
    } else if (conceptLower.includes('budget') || conceptLower.includes('affordable')) {
      positioning += `"value-focused solution" that balances cost efficiency with essential functionality. `;
    } else {
      positioning += `"professional-grade solution" that balances quality, features, and price competitiveness. `;
    }

    positioning += `The design philosophy favors "function Vs. form" while maintaining professional aesthetics suitable for ${targetLower} environments.`;
    lines.push(positioning);
    lines.push('');

    // Paragraph 2: Market risks
    let marketRisks = `**Market Risks:** Competition in the ${targetLower} sector is intense, with established players offering similar solutions. `;

    if (targetLower.includes('retail')) {
      marketRisks += `Retail customers are price-sensitive and may prioritize "lowest cost" over quality differentiation. `;
    } else if (targetLower.includes('healthcare')) {
      marketRisks += `Healthcare procurement cycles are long, and compliance requirements (ADA, infection control) add complexity. `;
    } else if (targetLower.includes('corporate')) {
      marketRisks += `Corporate purchasing requires integration with existing standards and may favor established vendor relationships. `;
    } else {
      marketRisks += `Market adoption depends on demonstrating clear ROI and compatibility with existing infrastructure. `;
    }

    marketRisks += `Supply chain volatility and material cost fluctuations present ongoing pricing challenges.`;
    lines.push(marketRisks);
    lines.push('');

    // Paragraph 3: Technical considerations
    let technical = `**Technical Considerations:** The product must balance "security Vs. accessibility" `;

    if (conceptLower.includes('stand') || conceptLower.includes('mount')) {
      technical += `while meeting "stability Vs. portability" requirements. `;
    } else {
      technical += `while ensuring "protection Vs. usability" for end users. `;
    }

    technical += `Device compatibility across multiple form factors (iPads, Surface, Android tablets) requires modular or adjustable mounting systems. Cable management must accommodate various charging and data configurations without compromising aesthetics.`;
    lines.push(technical);
    lines.push('');

    // Paragraph 4: Success factors
    const success = `**Success Factors:** Product success depends on demonstrating clear advantages over incumbent solutions: faster installation times, superior durability, better ergonomics, or enhanced security features. Strong channel relationships and demonstration programs will be critical for market penetration. Customer education on total cost of ownership (TCO) rather than initial purchase price will help justify premium positioning (if applicable).`;
    lines.push(success);
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }

  private generateCompetition(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 10. Competition to review');
    lines.push('');

    if (input.researchFindings.length > 0) {
      // Use research findings
      const uniqueUrls = new Set<string>();
      input.researchFindings.forEach((finding) => {
        if (finding.url && !uniqueUrls.has(finding.url)) {
          uniqueUrls.add(finding.url);
          lines.push(`* [${finding.title}](${finding.url})`);
          lines.push('');
        }
      });
    } else {
      // Generate generic competitor list based on product type
      const competitors = this.getGenericCompetitors(input);
      competitors.forEach((comp) => {
        lines.push(`* [${comp.name}](${comp.url})`);
        lines.push('');
      });
    }

    lines.push('---');

    return lines.join('\n');
  }

  private getGenericCompetitors(
    input: SectionGeneratorInput
  ): Array<{ name: string; url: string }> {
    const conceptLower = input.productConcept.toLowerCase();

    if (conceptLower.includes('stand') || conceptLower.includes('mount')) {
      return [
        {
          name: 'Compulocks Product Line',
          url: 'https://compulocks.com',
        },
        {
          name: 'Ergotron Tablet and Display Mounts',
          url: 'https://www.ergotron.com',
        },
        {
          name: 'ArmorActive Tablet Solutions',
          url: 'https://www.armoractive.com',
        },
        {
          name: 'Peerless-AV Kiosk and Mount Solutions',
          url: 'https://www.peerless-av.com',
        },
      ];
    } else if (conceptLower.includes('enclosure') || conceptLower.includes('kiosk')) {
      return [
        {
          name: 'Compulocks Enclosures',
          url: 'https://compulocks.com',
        },
        {
          name: 'Maclocks Security Enclosures',
          url: 'https://www.maclocks.com',
        },
        {
          name: 'Heckler Design Tablet Enclosures',
          url: 'https://www.hecklerdesign.com',
        },
        {
          name: 'Bouncepad Tablet Enclosures',
          url: 'https://www.bouncepad.com',
        },
      ];
    } else {
      return [
        {
          name: 'Industry Leading Competitors - Search Required',
          url: 'https://www.google.com/search?q=' + encodeURIComponent(input.productConcept),
        },
      ];
    }
  }

  private generateAdditionalConsiderations(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 11. Additional Considerations (Summary)');
    lines.push('');

    const considerations = [
      {
        label: 'Regulatory Compliance',
        desc: 'Ensure ADA compliance for accessibility, UL/CE certification for electrical components, and adherence to industry-specific regulations (HIPAA for healthcare, PCI for retail)',
      },
      {
        label: 'Supply Chain & Lead Times',
        desc: 'Establish relationships with material suppliers, plan for 12-16 week initial production lead time, and maintain safety stock for fast-moving SKUs',
      },
      {
        label: 'Installation & Support',
        desc: 'Provide clear installation guides, video tutorials, and technical support resources. Consider offering professional installation services for complex deployments',
      },
      {
        label: 'Warranty & Service',
        desc: 'Standard 2-year warranty with optional extended service plans. Establish RMA process for defective units and spare parts inventory',
      },
      {
        label: 'Channel Strategy',
        desc: 'Target both direct sales and distribution partners (AV integrators, IT resellers, vertical-specific distributors). Provide channel training and demo units',
      },
      {
        label: 'Marketing & Positioning',
        desc: 'Emphasize quality, durability, and Compulocks brand reputation. Develop case studies from pilot customers and ROI calculators for enterprise buyers',
      },
    ];

    considerations.forEach((item) => {
      lines.push(`* **${item.label}:** ${item.desc}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }

  private generateSuccessCriteria(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 12. Success Criteria');
    lines.push('');

    const criteria = [
      'Achieve product launch within 6 months of approval',

      'Secure 5+ pilot customer deployments within first quarter of availability',

      'Attain minimum 40% gross margin on standard configurations',

      'Receive 4+ star average customer rating across review platforms',

      'Zero critical safety or compliance issues post-launch',

      'Achieve 25% market share in target verticals within 18 months',

      'Generate positive ROI within 12 months of market introduction',

      'Establish distribution partnerships with 3+ major AV/IT channel partners',

      'Maintain inventory turnover ratio of 6+ (stock cycles 6 times per year)',

      'Customer satisfaction score (CSAT) of 85% or higher',
    ];

    criteria.forEach((criterion) => {
      lines.push(`* ${criterion}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }
}
