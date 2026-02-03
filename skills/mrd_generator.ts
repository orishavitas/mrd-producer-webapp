/**
 * MRD Generator Skill
 *
 * Generates Market Requirements Documents using AI (Gemini)
 * following the Compulocks MRD template structure.
 */

import { generateText, isGeminiAvailable } from '@/lib/gemini';

/**
 * Research source reference.
 */
export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Input data required to generate an MRD.
 */
export interface MRDInput {
  productConcept: string;
  targetMarket: string;
  additionalDetails?: string;
  researchFindings: ResearchSource[];
  researchSummary?: string;
  clarifications?: { question: string; answer: string }[];
}

/**
 * System prompt instructing AI to follow the MRD template exactly.
 */
const MRD_SYSTEM_PROMPT = `You are an expert product strategist creating Market Requirements Documents (MRDs) for Compulocks.

You MUST follow this EXACT structure with all 12 sections. Use Markdown formatting.

# Market Requirements Document (MRD)

---

## Product Name
[Product name derived from concept]

---

## 1. Purpose & Vision
Write prose with **bold emphasis** on key features. Describe:
- Portfolio context (how this fits in product line)
- Primary feature/benefit
- Target applications
- Design references and technical features

---

## 2. Problem Statement
Describe the market gap and list challenges as bullets:
* Challenge 1
* Challenge 2
* Challenge 3

---

## 3. Target Market & Use Cases

### Primary Markets
* Market 1
* Market 2
* Market 3

### Core Use Cases
* Use case 1
* Use case 2
* Use case 3

---

## 4. Target Users
* User persona 1
* User persona 2
* User persona 3

---

## 5. Product Description
Prose describing form factor with **bold specs** for measurements, standards, and technical details.

---

## 6. Key Requirements

### 6.1 Functional Requirements
* Requirement 1
* Requirement 2

### 6.2 Technical Requirements
* **Spec:** Detail
* **Spec:** Detail

### 6.3 Compliance Requirements
* Standard/compliance item
* Standard/compliance item

---

## 7. Design & Aesthetics
* Design requirement 1
* Design requirement 2
* Material/finish requirements

---

## 8. Target Price
* **Target price is $[amount]**

---

## 9. Risks and Thoughts
Prose analysis of risks, market considerations, competitive threats. Use "quoted terms" for industry terminology.

---

## 10. Competition to review
* [Competitor Product](URL) (brief note)
* [Competitor Product](URL)

---

## 11. Additional Considerations (Summary)
* **Label:** Description
* **Label:** Description

---

## 12. Success Criteria
* Measurable success metric 1
* Measurable success metric 2
* Measurable success metric 3

---

IMPORTANT FORMATTING RULES:
- Use --- horizontal rules after EVERY section
- Use **bold** for key specs, prices, labels
- Bullet lists use * not -
- Include blank line after each bullet for spacing
- Links format: [Display Text](URL)
- Be specific with measurements, include units
- Section numbers must be sequential 1-12`;

/**
 * Generates a Market Requirements Document using AI or template.
 */
export async function generateMRD(input: MRDInput): Promise<string> {
  if (isGeminiAvailable()) {
    try {
      console.log('[MRDGenerator] Using Gemini AI for generation');
      return await generateAIMRD(input);
    } catch (error) {
      console.error('[MRDGenerator] AI generation failed, falling back to template:', error);
      return generateTemplateMRD(input);
    }
  }

  console.log('[MRDGenerator] Gemini not available, using template');
  return generateTemplateMRD(input);
}

/**
 * Generates an MRD using Gemini AI.
 */
async function generateAIMRD(input: MRDInput): Promise<string> {
  const { productConcept, targetMarket, additionalDetails, researchFindings, researchSummary, clarifications } = input;

  let prompt = `Generate a complete MRD following the EXACT 12-section structure in the system prompt.

## Input Information

**Product Concept:**
${productConcept}

**Target Market:**
${targetMarket}
`;

  if (additionalDetails) {
    prompt += `
**Additional Details:**
${additionalDetails}
`;
  }

  if (researchSummary) {
    prompt += `
**Market Research Summary:**
${researchSummary}
`;
  }

  if (researchFindings.length > 0) {
    prompt += `
**Research Sources (use these for Competition section and citations):**
`;
    researchFindings.forEach((r, i) => {
      prompt += `${i + 1}. ${r.title} - ${r.url}${r.snippet ? ` - ${r.snippet}` : ''}\n`;
    });
  }

  if (clarifications && clarifications.length > 0) {
    prompt += `
**Clarifications Provided:**
`;
    clarifications.forEach((c) => {
      prompt += `Q: ${c.question}\nA: ${c.answer}\n\n`;
    });
  }

  prompt += `
## Instructions
1. Generate ALL 12 sections in order
2. Use the research findings to populate Competition section with real URLs
3. Be specific with requirements - include measurements, standards, specs
4. Estimate target price based on market research if not provided
5. Make success criteria measurable and specific
6. Follow exact Markdown formatting from system prompt`;

  const mrd = await generateText(prompt, MRD_SYSTEM_PROMPT, {
    maxTokens: 8192,
    temperature: 0.7,
  });

  return mrd;
}

/**
 * Generates a template-based MRD when AI is not available.
 */
function generateTemplateMRD(input: MRDInput): string {
  const { productConcept, targetMarket, additionalDetails, researchFindings, clarifications } = input;

  // Extract a product name from concept (first sentence or first 50 chars)
  const productName = productConcept.split(/[.!?]/)[0].slice(0, 50).trim() || 'New Product';

  let mrd = `# Market Requirements Document (MRD)

---

## Product Name
${productName}

---

## 1. Purpose & Vision

The purpose of this product is to address the needs of the **${targetMarket}** market. ${productConcept}

${additionalDetails ? `Additional context: ${additionalDetails}` : ''}

---

## 2. Problem Statement

Users in the ${targetMarket} space face several challenges:

* Limited options for solutions that meet their specific needs

* Existing products may not fully address market requirements

* Gap in the market for innovative approaches

---

## 3. Target Market & Use Cases

### Primary Markets

* ${targetMarket}

* Adjacent market segments

* Enterprise customers

### Core Use Cases

* Primary use case based on product concept

* Secondary applications

* Extended use scenarios

---

## 4. Target Users

* Decision makers in ${targetMarket}

* End users who interact with the product daily

* IT/Operations staff responsible for deployment

---

## 5. Product Description

${productConcept}

Key specifications to be determined based on market research and requirements gathering.

---

## 6. Key Requirements

### 6.1 Functional Requirements

* Core functionality matching the product concept

* User interface optimized for target market

* Integration capabilities with existing systems

### 6.2 Technical Requirements

* **Performance:** Meet industry standards for responsiveness

* **Compatibility:** Support major platforms and standards

* **Durability:** Meet requirements for intended use environment

### 6.3 Compliance Requirements

* Industry-specific compliance requirements

* Safety and regulatory standards

* Data protection and privacy compliance

---

## 7. Design & Aesthetics

* Professional appearance suitable for ${targetMarket}

* Ergonomic design for ease of use

* Quality materials and finish

---

## 8. Target Price

* **Target price to be determined** based on competitive analysis and cost modeling

---

## 9. Risks and Thoughts

Market competition presents a significant consideration. The ${targetMarket} space has existing players, and differentiation will be key to success. Technology evolution and changing user expectations should be monitored throughout development.

${clarifications && clarifications.length > 0 ? `
Additional considerations from clarifications:
${clarifications.map(c => `- ${c.question}: ${c.answer}`).join('\n')}
` : ''}

---

## 10. Competition to review

${researchFindings && researchFindings.length > 0
  ? researchFindings.map(r => `* [${r.title}](${r.url})${r.snippet ? ` - ${r.snippet}` : ''}`).join('\n\n')
  : '* Competitive analysis to be conducted'}

---

## 11. Additional Considerations (Summary)

* **Market Timing:** Evaluate optimal launch window

* **Resource Requirements:** Assess development and production needs

* **Go-to-Market:** Plan distribution and marketing strategy

---

## 12. Success Criteria

* Achieve target market share within first year

* Meet customer satisfaction benchmarks

* Achieve profitability targets

* Positive market reception and reviews

---

*Note: This document was generated using a template. For AI-powered analysis with real market research, configure the GOOGLE_API_KEY environment variable.*
`;

  return mrd;
}
