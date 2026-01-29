import { SearchResult } from './web_search';

/**
 * Input data required to generate an MRD.
 */
export interface MRDInput {
  productConcept: string;
  targetMarket: string;
  additionalDetails?: string;
  researchFindings: SearchResult[];
  clarifications?: { question: string; answer: string }[];
}

/**
 * Generates a Market Requirements Document (MRD) in Markdown format.
 * 
 * @param input - The collected data including user inputs and research findings.
 * @returns A string containing the generated MRD in Markdown.
 */
export function generateMRD(input: MRDInput): string {
  const { productConcept, targetMarket, additionalDetails, researchFindings, clarifications } = input;

  const date = new Date().toLocaleDateString();

  let mrd = `# Market Requirements Document (MRD)
**Date:** ${date}
**Product Concept:** ${productConcept}
**Target Market:** ${targetMarket}

---

## 1. Executive Summary
${productConcept} aims to address the needs of ${targetMarket}. This document outlines the market opportunity, competitive landscape, and key requirements for success.

## 2. Market Problem & Opportunity
**Target Audience:** ${targetMarket}

### Problem Statement
(Synthesized from input and research)
Users in the ${targetMarket} space face challenges that ${productConcept} aims to solve.

`;

  if (additionalDetails) {
    mrd += `### Additional Context\n${additionalDetails}\n\n`;
  }

  mrd += `## 3. Competitive Landscape
Based on preliminary research, the following competitors and trends are relevant:

`;

  if (researchFindings && researchFindings.length > 0) {
    researchFindings.forEach(result => {
      mrd += `- **[${result.title}](${result.url})**: ${result.snippet}\n`;
    });
  } else {
    mrd += `*No specific research findings provided at this stage.*\n`;
  }

  mrd += `\n## 4. Key Requirements\n`;
  
  if (clarifications && clarifications.length > 0) {
     mrd += `### Clarifications & Specifics\n`;
     clarifications.forEach(item => {
       mrd += `- **Q:** ${item.question}\n  **A:** ${item.answer}\n`;
     });
  }

  mrd += `
### Functional Requirements
- [ ] Core feature implementation matching the product concept.
- [ ] User interface optimized for ${targetMarket}.
- [ ] Integration with necessary platforms (as identified in research).

### Non-Functional Requirements
- **Performance:** Fast load times and responsive interactions.
- **Security:** Data protection and privacy compliance.
- **Scalability:** Architecture to support growth in ${targetMarket}.

## 5. Go-to-Market Strategy
- **Positioning:** Position as a leading solution for ${targetMarket}.
- **Channels:** Leverage channels identified in research (e.g., industry reports, competitor analysis).

## 6. Conclusion
${productConcept} has a strong potential to capture market share in the ${targetMarket} sector by addressing key user pain points and offering a superior user experience.
`;

  return mrd;
}
