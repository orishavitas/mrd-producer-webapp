4_generate_mrd.md

> **Chain Position:** 4 of 4  


<task type="generate">
<n>Generate Market Requirements Document</n>

<input>
<request_data>
{{parsed_data_json}}
</request_data>

<research_data>
{{research_output_json}}
</research_data>

<template_reference>
Compulocks MRD Template - 12 Sections:
1. Purpose & Vision
2. Problem Statement
3. Target Market & Use Cases
4. Target Users
5. Product Description
6. Key Requirements
7. Design & Aesthetics
8. Target Price
9. Risks and Thoughts
10. Competition to Review
11. Additional Considerations
12. Success Criteria
</template_reference>
</input>

<instructions>
Generate a complete MRD following the Compulocks 12-section template.

SECTION GUIDELINES:

1. PURPOSE & VISION (50+ words)
   - What is this product?
   - Why does it matter?
   - What opportunity does it address?
   - Keep it inspiring but grounded

2. PROBLEM STATEMENT (75+ words)
   - What pain point does this solve?
   - Who experiences this problem?
   - What's the current workaround?
   - Why is now the right time?

3. TARGET MARKET & USE CASES
   - List primary and secondary markets (from request_data)
   - Describe 2+ specific use cases with scenarios
   - Include environment context

4. TARGET USERS
   - Define 1+ user personas
   - Include: role, context, needs, pain points
   - Be specific to the verticals

5. PRODUCT DESCRIPTION
   - Overview paragraph
   - List 3+ key features with priority (must_have, should_have, nice_to_have)
   - Identify differentiators vs. competition

6. KEY REQUIREMENTS
   - Functional requirements (3+ with rationale)
   - Technical requirements (2+ with specifications)
   - Note any constraints

7. DESIGN & AESTHETICS
   - Style direction (if specified, or recommend based on vertical)
   - Color options (standard Compulocks or custom)
   - Finish options
   - Branding considerations

8. TARGET PRICE
   - MSRP recommendation (use research for positioning)
   - Cost target if relevant
   - Rationale for pricing
   - Competitive positioning statement

9. RISKS AND THOUGHTS
   - Identify 2+ risks with likelihood/impact
   - Include mitigation strategies
   - Note open questions
   - List assumptions made

10. COMPETITION TO REVIEW
    - Summarize research findings
    - List competitors analyzed with key data
    - Highlight market gaps
    - State differentiation opportunity

11. ADDITIONAL CONSIDERATIONS
    - Certifications needed?
    - Regulatory requirements?
    - Sustainability factors?
    - Accessories/ecosystem?
    - Service/support implications?

12. SUCCESS CRITERIA
    - Define 2+ measurable metrics
    - Include timeframes
    - Note go/no-go factors

QUALITY RULES:
- Use data from request_data and research_data
- Attribute sources (requestor, inferred, research)
- Note confidence level per section
- Flag gaps explicitly - don't hide missing info
- Be specific, not generic
- Reference competitors by name
- Include numbers where available
</instructions>

</task>
