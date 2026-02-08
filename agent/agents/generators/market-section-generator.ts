/**
 * Market Section Generator
 *
 * Specializes in generating market-focused sections of the MRD:
 * - Section 1: Purpose & Vision
 * - Section 2: Problem Statement
 * - Section 3: Target Market & Use Cases
 * - Section 4: Target Users
 *
 * This agent has deep expertise in market analysis, user personas,
 * and business positioning.
 */

import {
  BaseSectionGenerator,
  SectionGeneratorInput,
  SectionGeneratorOutput,
} from './base-section-generator';

export class MarketSectionGenerator extends BaseSectionGenerator {
  readonly id = 'market-section-generator';
  readonly name = 'Market Section Generator';
  readonly version = '1.0.0';
  readonly description =
    'Generates market-focused MRD sections: Purpose & Vision, Problem Statement, Target Market & Use Cases, Target Users';

  readonly domain = 'market';
  readonly sectionRange: [number, number] = [1, 4];

  protected getTaskDescription(): string {
    return `Generate MRD sections 1-4 focusing on market analysis and user understanding:

**Section 1: Purpose & Vision**
- State the product's purpose and strategic vision
- Identify primary features and applications
- Use bold formatting for key features
- Format: 2-3 paragraphs with bold emphasis on key terms

**Section 2: Problem Statement**
- Describe the market problem this product solves
- List specific challenges as bullet points
- Include market gap analysis from research
- Format: Introductory paragraph + bullet list of challenges

**Section 3: Target Market & Use Cases**
- Subsection 3.1: Primary Markets (bullet list of market verticals)
- Subsection 3.2: Core Use Cases (bullet list of specific use cases)
- Use research findings to identify markets and applications
- Format: Two H3 subsections with bullet lists

**Section 4: Target Users**
- List specific user personas/roles who will use this product
- Be specific about job titles, departments, and contexts
- Use research to identify real user types
- Format: Bullet list with blank lines between items

Use the research findings to make these sections specific and data-driven.
Reference actual market trends, competitors, and user needs from the research.`;
  }

  protected generateTemplateSections(input: SectionGeneratorInput): SectionGeneratorOutput {
    const sections: Record<number, string> = {};
    const confidence: Record<number, number> = {};
    const dataSources: Record<number, ('user' | 'research' | 'clarification' | 'inferred')[]> = {};
    const gaps: string[] = [];

    // Section 1: Purpose & Vision
    sections[1] = this.generatePurposeAndVision(input);
    confidence[1] = 75;
    dataSources[1] = ['user', 'inferred'];

    // Section 2: Problem Statement
    sections[2] = this.generateProblemStatement(input);
    confidence[2] = 70;
    dataSources[2] = ['user', 'inferred'];

    // Section 3: Target Market & Use Cases
    sections[3] = this.generateTargetMarketAndUseCases(input);
    confidence[3] = 80;
    dataSources[3] = ['user'];
    if (!input.researchFindings.length) {
      dataSources[3].push('inferred');
    } else {
      dataSources[3].push('research');
    }

    // Section 4: Target Users
    sections[4] = this.generateTargetUsers(input);
    confidence[4] = 75;
    dataSources[4] = ['user', 'inferred'];

    if (!input.researchFindings.length) {
      gaps.push('Limited market research available - sections based primarily on user input');
    }

    return {
      sections,
      confidence,
      dataSources,
      gaps,
      domain: this.domain,
    };
  }

  private generatePurposeAndVision(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 1. Purpose & Vision');
    lines.push('');

    // Extract key concepts from product concept
    const conceptLower = input.productConcept.toLowerCase();
    const isStand = conceptLower.includes('stand');
    const isMount = conceptLower.includes('mount');
    const isEnclosure = conceptLower.includes('enclosure') || conceptLower.includes('kiosk');

    let purposeText = `The purpose of this product is to ${input.productConcept.toLowerCase()}`;

    if (isStand) {
      purposeText += ` with a **height-adjustable design** primarily for **tablet and display applications**`;
    } else if (isMount) {
      purposeText += ` with a **secure mounting solution** designed for **professional installations**`;
    } else if (isEnclosure) {
      purposeText += ` with a **protective enclosure design** optimized for **public-facing environments**`;
    } else {
      purposeText += ` designed for **${input.targetMarket}**`;
    }

    purposeText += '.';
    lines.push(purposeText);
    lines.push('');

    lines.push(
      `This product combines **robust construction** with **versatile compatibility**, enabling secure device deployment while supporting modern applications in ${input.targetMarket.toLowerCase()}.`
    );
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }

  private generateProblemStatement(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 2. Problem Statement');
    lines.push('');

    // Infer problem based on target market
    const market = input.targetMarket.toLowerCase();
    let problemIntro = `Organizations in ${input.targetMarket} face challenges in deploying secure, accessible, and professional device solutions. `;

    if (market.includes('retail')) {
      problemIntro +=
        'Retail environments require theft-resistant displays that maintain brand aesthetics while withstanding high-traffic conditions.';
    } else if (market.includes('healthcare')) {
      problemIntro +=
        'Healthcare facilities need hygienic, ADA-compliant solutions that support infection control protocols.';
    } else if (market.includes('hospitality')) {
      problemIntro +=
        'Hospitality venues require elegant yet durable installations that enhance guest experiences.';
    } else if (market.includes('corporate')) {
      problemIntro +=
        'Corporate environments need professional-grade solutions that integrate with existing infrastructure.';
    } else {
      problemIntro +=
        'These environments demand solutions that balance security, usability, and professional appearance.';
    }

    lines.push(problemIntro);
    lines.push('');

    lines.push('Key challenges include:');
    lines.push('');
    lines.push('* **Security concerns:** Protecting valuable devices from theft and tampering');
    lines.push('');
    lines.push('* **Ergonomics:** Ensuring comfortable viewing angles and ADA compliance');
    lines.push('');
    lines.push('* **Aesthetics:** Maintaining clean, professional appearance that aligns with brand standards');
    lines.push('');
    lines.push('* **Compatibility:** Supporting diverse device models and mounting standards');
    lines.push('');
    lines.push('* **Installation complexity:** Requiring specialized tools and expertise for deployment');
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }

  private generateTargetMarketAndUseCases(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 3. Target Market & Use Cases');
    lines.push('');

    lines.push('### Primary Markets');
    lines.push('');

    // Parse target markets from input
    const markets = this.extractMarkets(input);
    markets.forEach((market) => {
      lines.push(`* ${market}`);
      lines.push('');
    });

    lines.push('### Core Use Cases');
    lines.push('');

    // Generate use cases based on market and product type
    const useCases = this.extractUseCases(input);
    useCases.forEach((useCase) => {
      lines.push(`* ${useCase}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }

  private generateTargetUsers(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 4. Target Users');
    lines.push('');

    const users = this.extractTargetUsers(input);
    users.forEach((user) => {
      lines.push(`* ${user}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }

  private extractMarkets(input: SectionGeneratorInput): string[] {
    const markets: string[] = [];
    const targetLower = input.targetMarket.toLowerCase();

    if (targetLower.includes('retail')) {
      markets.push('Retail stores and shopping centers');
    }
    if (targetLower.includes('healthcare') || targetLower.includes('hospital')) {
      markets.push('Healthcare facilities and medical centers');
    }
    if (targetLower.includes('hospitality') || targetLower.includes('hotel')) {
      markets.push('Hospitality (hotels, resorts, cruise terminals)');
    }
    if (targetLower.includes('corporate') || targetLower.includes('office')) {
      markets.push('Corporate offices and headquarters');
    }
    if (targetLower.includes('education') || targetLower.includes('school')) {
      markets.push('Educational institutions');
    }
    if (targetLower.includes('government')) {
      markets.push('Government facilities');
    }

    // If no specific markets found, use the target market directly
    if (markets.length === 0) {
      markets.push(input.targetMarket);
    }

    return markets;
  }

  private extractUseCases(input: SectionGeneratorInput): string[] {
    const useCases: string[] = [];
    const conceptLower = input.productConcept.toLowerCase();
    const targetLower = input.targetMarket.toLowerCase();

    // Product-type specific use cases
    if (conceptLower.includes('kiosk') || conceptLower.includes('self-service')) {
      useCases.push('Self-service check-in / check-out');
      useCases.push('Wayfinding and directory services');
      useCases.push('Payment and transaction processing');
    } else if (conceptLower.includes('stand')) {
      useCases.push('Point of sale (POS) terminals');
      useCases.push('Information and wayfinding displays');
      useCases.push('Virtual receptionist / AI greeter');
    } else if (conceptLower.includes('mount')) {
      useCases.push('Digital signage displays');
      useCases.push('Interactive information terminals');
      useCases.push('Conference room displays');
    }

    // Market-specific use cases
    if (targetLower.includes('retail') && useCases.length < 3) {
      useCases.push('Endless aisle product browsing');
      useCases.push('Loyalty program enrollment');
    }
    if (targetLower.includes('healthcare') && useCases.length < 3) {
      useCases.push('Patient check-in and registration');
      useCases.push('Visitor management');
    }
    if (targetLower.includes('hospitality') && useCases.length < 3) {
      useCases.push('Guest services and concierge');
      useCases.push('Event information and schedules');
    }

    // Default use cases if none found
    if (useCases.length === 0) {
      useCases.push('Interactive information display');
      useCases.push('Customer self-service portal');
      useCases.push('Digital signage and communication');
    }

    // Limit to 5 use cases
    return useCases.slice(0, 5);
  }

  private extractTargetUsers(input: SectionGeneratorInput): string[] {
    const users: string[] = [];
    const targetLower = input.targetMarket.toLowerCase();

    if (targetLower.includes('retail')) {
      users.push('Store managers and retail operations staff');
      users.push('Visual merchandising teams');
      users.push('Customers and shoppers');
    } else if (targetLower.includes('healthcare')) {
      users.push('Hospital administrators and facility managers');
      users.push('Patients and visitors');
      users.push('Healthcare IT staff');
    } else if (targetLower.includes('hospitality')) {
      users.push('Hotel general managers and operations directors');
      users.push('Guests and visitors');
      users.push('Front desk and concierge staff');
    } else if (targetLower.includes('corporate')) {
      users.push('Corporate facility managers');
      users.push('IT and AV departments');
      users.push('Employees and visitors');
    } else {
      users.push('Facility managers and operations staff');
      users.push('IT administrators');
      users.push('End users and customers');
    }

    return users;
  }
}
