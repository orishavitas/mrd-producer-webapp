/**
 * MRD Generator Skill
 *
 * Generates Market Requirements Documents using AI (Gemini Pro)
 * with fallback to template-based generation.
 */

import { SearchResult } from './web_search';
import { generateText, isGeminiAvailable } from '@/lib/gemini';

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

const MRD_SYSTEM_PROMPT = `You are an expert product strategist and market analyst with deep experience in creating comprehensive Market Requirements Documents (MRDs).

Your task is to synthesize the provided information into a professional, actionable MRD that will guide product development and go-to-market strategy.

Guidelines:
- Be specific and data-driven, citing sources from the research findings when possible
- Use professional business language appropriate for stakeholder presentations
- Structure the document with clear, scannable sections
- Include actionable recommendations with clear rationale
- Identify risks and propose mitigations
- Be thorough but concise - every sentence should add value
- Format output in clean Markdown`;

/**
 * Generates a Market Requirements Document using AI or template.
 *
 * @param input - The collected data including user inputs and research findings.
 * @returns A promise that resolves to the generated MRD in Markdown format.
 */
export async function generateMRD(input: MRDInput): Promise<string> {
  // Try AI generation if available
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
  const { productConcept, targetMarket, additionalDetails, researchFindings, clarifications } = input;

  let prompt = `Create a comprehensive Market Requirements Document (MRD) for the following product:

## Product Concept
${productConcept}

## Target Market
${targetMarket}
`;

  if (additionalDetails) {
    prompt += `
## Additional Context
${additionalDetails}
`;
  }

  if (researchFindings.length > 0) {
    prompt += `
## Research Findings
The following market research has been gathered:

`;
    researchFindings.forEach((r, i) => {
      prompt += `${i + 1}. **${r.title}**
   Source: ${r.url}
   Summary: ${r.snippet}

`;
    });
  }

  if (clarifications && clarifications.length > 0) {
    prompt += `
## Clarifications Provided
`;
    clarifications.forEach((c) => {
      prompt += `- **Q:** ${c.question}
  **A:** ${c.answer}
`;
    });
  }

  prompt += `
## Required MRD Structure
Generate a complete MRD in Markdown format with these sections:

1. **Executive Summary** - Brief overview with Go/No-Go recommendation
2. **Market Problem & Opportunity** - Problem statement, target audience, TAM/SAM/SOM estimates if possible
3. **Competitive Landscape** - Direct and indirect competitors, differentiation opportunities
4. **Key Requirements** - Functional and non-functional requirements, prioritized
5. **Product Strategy & Positioning** - Value proposition, positioning statement
6. **Go-to-Market Recommendations** - Launch strategy, channels, pricing considerations
7. **Risks and Mitigations** - Key risks identified and mitigation strategies
8. **Success Metrics** - KPIs to measure success
9. **Conclusion** - Summary and next steps

Use the research findings to support your analysis. Be specific, actionable, and professional.`;

  const mrd = await generateText(prompt, MRD_SYSTEM_PROMPT, {
    maxTokens: 4096,
    temperature: 0.7,
  });

  return mrd;
}

/**
 * Generates a template-based MRD when AI is not available.
 */
function generateTemplateMRD(input: MRDInput): string {
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
Users in the ${targetMarket} space face challenges that ${productConcept} aims to solve.

`;

  if (additionalDetails) {
    mrd += `### Additional Context
${additionalDetails}

`;
  }

  mrd += `## 3. Competitive Landscape

Based on preliminary research, the following competitors and trends are relevant:

`;

  if (researchFindings && researchFindings.length > 0) {
    researchFindings.forEach((result) => {
      mrd += `- **[${result.title}](${result.url})**: ${result.snippet}\n`;
    });
  } else {
    mrd += `*No specific research findings provided at this stage.*\n`;
  }

  mrd += `
## 4. Key Requirements
`;

  if (clarifications && clarifications.length > 0) {
    mrd += `### Clarifications & Specifics
`;
    clarifications.forEach((item) => {
      mrd += `- **Q:** ${item.question}\n  **A:** ${item.answer}\n`;
    });
  }

  mrd += `
### Functional Requirements
- [ ] Core feature implementation matching the product concept
- [ ] User interface optimized for ${targetMarket}
- [ ] Integration with necessary platforms (as identified in research)

### Non-Functional Requirements
- **Performance:** Fast load times and responsive interactions
- **Security:** Data protection and privacy compliance
- **Scalability:** Architecture to support growth in ${targetMarket}

## 5. Go-to-Market Strategy

- **Positioning:** Position as a leading solution for ${targetMarket}
- **Channels:** Leverage channels identified in research

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Market competition | High | Differentiate on key features |
| Technology changes | Medium | Build flexible architecture |
| User adoption | High | Focus on UX and onboarding |

## 7. Conclusion

${productConcept} has strong potential to capture market share in the ${targetMarket} sector by addressing key user pain points and offering a superior user experience.

---

*Note: This document was generated using a template. For AI-powered analysis, configure the GOOGLE_API_KEY environment variable.*
`;

  return mrd;
}
