/**
 * Technical Section Generator
 *
 * Specializes in generating technical and product specification sections:
 * - Section 5: Product Description
 * - Section 6: Key Requirements (with subsections)
 * - Section 7: Design & Aesthetics
 *
 * This agent has deep expertise in technical specifications,
 * requirements engineering, and product design.
 */

import {
  BaseSectionGenerator,
  SectionGeneratorInput,
  SectionGeneratorOutput,
} from './base-section-generator';

export class TechnicalSectionGenerator extends BaseSectionGenerator {
  readonly id = 'technical-section-generator';
  readonly name = 'Technical Section Generator';
  readonly version = '1.0.0';
  readonly description =
    'Generates technical MRD sections: Product Description, Key Requirements, Design & Aesthetics';

  readonly domain = 'technical';
  readonly sectionRange: [number, number] = [5, 7];

  protected getTaskDescription(): string {
    return `Generate MRD sections 5-7 focusing on technical specifications and product details:

**Section 5: Product Description**
- Detailed physical description with dimensions and materials
- Key technical specifications (VESA compatibility, mounting options, etc.)
- Use bold formatting for measurements and standards
- Format: 2-3 paragraphs with bold emphasis on specs

**Section 6: Key Requirements**
Organize as subsections:
- 6.1 Functional Requirements (bullet list)
- 6.2 [Domain-specific] Requirements (e.g., Height & ADA Compliance)
- 6.3 [Domain-specific] Requirements (e.g., Stability & Load)
- Use nested bullets where appropriate
- Each requirement should be specific and testable
- Format: H3 subsections with bullet lists

**Section 7: Design & Aesthetics**
- Visual design principles and brand alignment
- Color, finish, and material specifications
- Professional appearance requirements
- Format: Bullet list with blank lines between items

Use research findings to identify competitor specs and industry standards.
Be specific with measurements, load ratings, and technical requirements.`;
  }

  protected generateTemplateSections(input: SectionGeneratorInput): SectionGeneratorOutput {
    const sections: Record<number, string> = {};
    const confidence: Record<number, number> = {};
    const dataSources: Record<number, ('user' | 'research' | 'clarification' | 'inferred')[]> = {};
    const gaps: string[] = [];

    // Section 5: Product Description
    sections[5] = this.generateProductDescription(input);
    confidence[5] = 75;
    dataSources[5] = ['user', 'inferred'];

    // Section 6: Key Requirements
    sections[6] = this.generateKeyRequirements(input);
    confidence[6] = 70;
    dataSources[6] = ['user', 'inferred'];

    // Section 7: Design & Aesthetics
    sections[7] = this.generateDesignAesthetics(input);
    confidence[7] = 75;
    dataSources[7] = ['user', 'inferred'];

    if (!input.researchFindings.length) {
      gaps.push('Limited technical research - specifications based on standard industry practices');
    }

    const hasDetailedSpecs = this.checkForDetailedSpecs(input);
    if (!hasDetailedSpecs) {
      gaps.push('Detailed technical specifications not provided - using estimated values');
      confidence[5] = 60;
      confidence[6] = 60;
    }

    return {
      sections,
      confidence,
      dataSources,
      gaps,
      domain: this.domain,
    };
  }

  private checkForDetailedSpecs(input: SectionGeneratorInput): boolean {
    const combined = `${input.productConcept} ${input.additionalDetails || ''}`.toLowerCase();
    return (
      combined.includes('dimension') ||
      combined.includes('height') ||
      combined.includes('weight') ||
      combined.includes('vesa') ||
      combined.includes('material') ||
      combined.includes('load')
    );
  }

  private generateProductDescription(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 5. Product Description');
    lines.push('');

    const conceptLower = input.productConcept.toLowerCase();

    // Determine product type
    let description = '';
    if (conceptLower.includes('stand')) {
      description = this.generateStandDescription(input);
    } else if (conceptLower.includes('mount')) {
      description = this.generateMountDescription(input);
    } else if (conceptLower.includes('enclosure') || conceptLower.includes('kiosk')) {
      description = this.generateEnclosureDescription(input);
    } else {
      description = this.generateGenericDescription(input);
    }

    lines.push(description);
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }

  private generateStandDescription(input: SectionGeneratorInput): string {
    return `This product is a **floor stand** designed for secure tablet and display mounting. The stand features a **height-adjustable telescopic column** ranging from approximately **110-165 cm (43-65 inches)** to accommodate both standing and seated users, ensuring **ADA compliance**.

The stand includes a **weighted base** (approximately **12-15 kg / 26-33 lbs**) for stability and supports **VESA 75x75** and **100x100** mounting patterns. It is constructed with **steel and aluminum** components with a **powder-coated finish** for durability in high-traffic environments.

Key features include **cable management channels**, **360-degree rotation** capability, and **tool-free height adjustment** mechanisms for easy deployment and maintenance.`;
  }

  private generateMountDescription(input: SectionGeneratorInput): string {
    return `This product is a **wall or surface mount** designed for secure device installation. The mount features a **VESA-compatible** mounting interface supporting **75x75** and **100x100** patterns, with a **load capacity** of up to **15 kg (33 lbs)**.

Construction utilizes **steel or aluminum** materials with a **powder-coated finish** available in multiple colors. The mount includes **adjustable tilt** (approximately **±15 degrees**) and **swivel** (approximately **±45 degrees**) functionality for optimal viewing angles.

Installation hardware is included, compatible with standard drywall, wood stud, and concrete surfaces. The design incorporates **cable management** features and **tamper-resistant fasteners** for security.`;
  }

  private generateEnclosureDescription(input: SectionGeneratorInput): string {
    return `This product is a **secure enclosure** designed to protect and display tablets or touchscreen devices in public-facing environments. The enclosure accommodates devices ranging from **9.7 to 12.9 inches** with **universal mounting** options.

Construction features **high-grade aluminum** or **steel** housing with a **powder-coated finish**. The enclosure includes a **security lock** system (compatible with **Kensington** and custom key systems) and **tamper-resistant** design elements.

The device provides **full access** to device screens while protecting buttons and ports. It includes **integrated cable management**, **ventilation** for thermal management, and **mounting** options for wall, countertop, or stand integration.`;
  }

  private generateGenericDescription(input: SectionGeneratorInput): string {
    return `${input.productConcept}

The product is constructed with **durable materials** (steel and/or aluminum) and includes a **professional powder-coated finish**. Dimensions are optimized for **${input.targetMarket}** applications, with **mounting compatibility** for standard industry patterns.

Key features include **adjustable positioning**, **cable management** solutions, and **secure installation** hardware. The design supports **ease of deployment** and **maintenance** while maintaining a **professional appearance**.`;
  }

  private generateKeyRequirements(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 6. Key Requirements');
    lines.push('');

    // 6.1 Functional Requirements
    lines.push('### 6.1 Functional Requirements');
    lines.push('');
    const functionalReqs = this.generateFunctionalRequirements(input);
    functionalReqs.forEach((req) => {
      lines.push(`* ${req}`);
      lines.push('');
    });

    // 6.2 Domain-specific requirements (Height/Mounting)
    const conceptLower = input.productConcept.toLowerCase();
    if (conceptLower.includes('stand')) {
      lines.push('### 6.2 Height & ADA Compliance Requirements');
    } else {
      lines.push('### 6.2 Mounting & Compatibility Requirements');
    }
    lines.push('');
    const category2Reqs = this.generateCategory2Requirements(input);
    category2Reqs.forEach((req) => {
      lines.push(`* ${req}`);
      lines.push('');
    });

    // 6.3 Domain-specific requirements (Stability/Security)
    if (conceptLower.includes('stand')) {
      lines.push('### 6.3 Stability & Load Requirements');
    } else {
      lines.push('### 6.3 Security & Durability Requirements');
    }
    lines.push('');
    const category3Reqs = this.generateCategory3Requirements(input);
    category3Reqs.forEach((req) => {
      lines.push(`* ${req}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }

  private generateFunctionalRequirements(input: SectionGeneratorInput): string[] {
    const reqs: string[] = [];
    const conceptLower = input.productConcept.toLowerCase();

    if (conceptLower.includes('stand')) {
      reqs.push(
        '**Device Compatibility:** Support tablets and displays from 9.7" to 13", including iPad Pro, Surface Pro, and similar devices'
      );
      reqs.push('**Mounting Interface:** Compatible with VESA 75x75 and 100x100 mounting patterns');
      reqs.push(
        '**Adjustment Mechanism:** Tool-free height adjustment with secure locking at desired height'
      );
    } else if (conceptLower.includes('mount')) {
      reqs.push(
        '**Device Compatibility:** Support displays and devices with standard VESA mounting patterns'
      );
      reqs.push(
        '**Adjustment Range:** Provide tilt and swivel adjustments for optimal viewing angles'
      );
      reqs.push('**Installation:** Compatible with multiple surface types (drywall, wood, concrete)');
    } else {
      reqs.push(
        '**Device Compatibility:** Support target devices as specified in product concept'
      );
      reqs.push('**Mounting Interface:** Standard mounting compatibility for easy installation');
      reqs.push('**Adjustment:** Appropriate positioning adjustments for intended use');
    }

    reqs.push('**Cable Management:** Integrated channels for power and data cables');
    reqs.push('**Installation Time:** Maximum 30 minutes for single-unit deployment');

    return reqs;
  }

  private generateCategory2Requirements(input: SectionGeneratorInput): string[] {
    const reqs: string[] = [];
    const conceptLower = input.productConcept.toLowerCase();

    if (conceptLower.includes('stand')) {
      reqs.push('**Height Range:** Adjustable from 110 cm to 165 cm (43" to 65")');
      reqs.push('**ADA Compliance:** Meet ADA reach range requirements (38"-48" for side approach)');
      reqs.push('**Adjustment Increments:** Smooth adjustment with locking positions every 5 cm');
      reqs.push('**Minimum Height:** Accommodate wheelchair users (seated viewing at ~110 cm)');
      reqs.push('**Maximum Height:** Accommodate standing users (standing viewing at ~150-165 cm)');
    } else {
      reqs.push('**VESA Compatibility:** Support VESA 75x75 and 100x100 mounting patterns');
      reqs.push(
        '**Mounting Options:** Compatible with wall, desk, or surface mounting as appropriate'
      );
      reqs.push('**Viewing Angles:** Tilt adjustment ±15 degrees, swivel ±45 degrees (if applicable)');
      reqs.push('**Quick Release:** Optional quick-release mechanism for device removal');
    }

    return reqs;
  }

  private generateCategory3Requirements(input: SectionGeneratorInput): string[] {
    const reqs: string[] = [];
    const conceptLower = input.productConcept.toLowerCase();

    if (conceptLower.includes('stand')) {
      reqs.push('**Base Weight:** Minimum 12 kg (26 lbs) weighted base for tip-over prevention');
      reqs.push('**Load Capacity:** Support devices up to 5 kg (11 lbs)');
      reqs.push('**Stability Testing:** Pass ANSI/BIFMA stability tests');
      reqs.push(
        '**Anti-Tip Design:** Weighted base design prevents tipping under normal use conditions'
      );
    } else {
      reqs.push('**Security Lock:** Integrated Kensington lock slot or equivalent');
      reqs.push('**Tamper Resistance:** Tamper-resistant fasteners on external mounting points');
      reqs.push('**Load Capacity:** Support rated device weight plus 20% safety margin');
      reqs.push('**Durability:** Withstand 50,000+ adjustment cycles without degradation');
    }

    reqs.push('**Material Strength:** Steel or aluminum construction meeting appropriate load ratings');

    return reqs;
  }

  private generateDesignAesthetics(input: SectionGeneratorInput): string {
    const lines: string[] = [];

    lines.push('## 7. Design & Aesthetics');
    lines.push('');

    const aesthetics = [
      '**Professional Appearance:** Clean, modern industrial design suitable for commercial environments',

      '**Color Options:** Available in Black (primary), Silver, and White to match diverse interiors',

      '**Finish Quality:** Powder-coated finish with scratch and fingerprint resistance',

      '**Brand Alignment:** Design language consistent with Compulocks product family',

      '**Cable Concealment:** Visible cables fully concealed within channels and column structures',

      '**Minimal Footprint:** Compact base design that maximizes stability while minimizing floor space',

      '**Premium Materials:** High-quality metal construction with smooth edges and professional detailing',
    ];

    aesthetics.forEach((item) => {
      lines.push(`* ${item}`);
      lines.push('');
    });

    lines.push('---');

    return lines.join('\n');
  }
}
