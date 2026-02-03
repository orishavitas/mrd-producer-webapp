# Reference Library Review

**Date:** February 2, 2026
**Reviewed By:** Claude Code
**Purpose:** Analysis of reference library documents from predecessor project and alignment assessment with current implementation

---

## Executive Summary

The reference library contains **6 documents** that define a **5-stage MRD generation pipeline** with detailed prompt engineering templates, data schemas, and formatting specifications. The methodology emphasizes:

- **Structured data extraction** from raw requests
- **Iterative gap analysis** with user clarification (max 2 rounds, 5 questions)
- **Competitive research** targeting specific competitors (Bouncepad, Displays2Go, Heckler Design, Ergotron, etc.)
- **Precise document formatting** matching Compulocks' corporate template standards

**Current Implementation Status:** Basic pipeline exists but lacks the structured multi-stage approach, gap analysis workflow, and precise document formatting defined in the reference library.

---

## Reference Library Contents

### 1. **01_parse_request.md**
**Position:** Chain 1 of 5
**Purpose:** Parse raw product research requests into structured JSON

**Key Features:**
- Extracts requestor identification, product concept, technical requirements
- Generates unique request ID: `ORIGIN-YYYYMMDD-XXXX`
- Performs initial gap analysis (critical vs optional)
- Assigns scope flags (GREEN/YELLOW/RED)
- Outputs `request.json` schema with:
  - `sender` (name, email, department)
  - `product_concept` (name, summary, category)
  - `extracted_data` (markets, use_cases, price, technical_requirements, volume, timeline)
  - `gaps` (critical, optional)
  - `scope_flags` (level, reason, recommendation)

**Target Verticals:** Retail, Hospitality, Healthcare, Corporate, Education
**Product Categories:** Enclosure, mount, stand, lock, charging, accessory, other

**Schema Example:**
```json
{
  "request_id": "ORIGIN-20250119-4829",
  "sender": {...},
  "product_concept": {
    "name": "Healthcare Tablet Kiosk",
    "summary": "Floor-standing tablet enclosure..."
  },
  "extracted_data": {
    "target_markets": ["Healthcare"],
    "use_cases": ["Patient self-check-in"],
    "target_price": null,
    "technical_requirements": {...}
  },
  "gaps": {
    "critical": [
      {"field": "target_price", "reason": "No price point mentioned"}
    ]
  }
}
```

---

### 2. **02_gap_analysis.md**
**Position:** Chain 2 of 5
**Purpose:** Analyze information gaps and generate clarification questions

**Key Features:**
- Evaluates gaps as: **BLOCKING**, **IMPORTANT**, or **MINOR**
- Makes decision: `clarify`, `proceed`, or `escalate`
- **Maximum 5 questions** per round
- **Maximum 2 clarification rounds** (prevents user fatigue)
- Question prioritization: `target_market > use_cases > price > technical > volume > timeline`

**Decision Logic:**
```
IF round < 2 AND blocking_gaps exist:
  → Generate clarification questions

IF round >= 2:
  → Proceed to research, note remaining gaps

IF no blocking_gaps AND important_gaps <= 2:
  → Proceed to research
```

**Output Schema:**
```json
{
  "decision": "clarify" | "proceed" | "escalate",
  "reasoning": "...",
  "gap_assessment": {
    "blocking": [],
    "important": [],
    "minor": []
  },
  "clarification": {
    "questions": [
      {
        "number": 1,
        "field": "target_price",
        "question": "What price range are you targeting?",
        "context": "This helps us position against competitors...",
        "options": ["Under $200", "$200-$400", ...]
      }
    ]
  }
}
```

---

### 3. **04_research.md**
**Position:** Chain 4 of 5
**Purpose:** Conduct competitive research using web grounding

**Target Competitors (Compulocks-specific):**
- Bouncepad
- Displays2Go
- Heckler Design
- Ergotron
- Peerless-AV
- Chief (Legrand)
- Kensington

**Search Strategy:**
- Use product category + device type
- Use vertical/use case terms
- Check each competitor's website directly
- **Minimum 3 comparable products** required

**Data Extraction Per Product:**
- Product name, URL (direct link to product page)
- Price (MSRP with source attribution)
- Key features (3-5 most relevant)
- Device compatibility
- Mounting type / form factor
- Strengths vs. proposed product
- Weaknesses / gaps

**Market Analysis Output:**
- Price clustering analysis (min, max, median)
- Price positioning recommendation
- Market gaps identified
- Differentiation opportunities
- Competitive threats
- Market trends

**Quality Requirements:**
- No fabricated data (explicitly state if not found)
- All URLs must be direct product links (not search results)
- Prices must have source attribution
- Limitations section acknowledging research constraints

---

### 4. **04_generate_mrd.md / 05_generate_mrd.md**
**Position:** Chain 4/5 of 4/5 (note: numbering inconsistency in source)
**Purpose:** Generate complete MRD following Compulocks 12-section template

**Required Sections:**
1. **Purpose & Vision** (50+ words) - Inspiring but grounded
2. **Problem Statement** (75+ words) - Pain point, why now
3. **Target Market & Use Cases** - 2+ specific scenarios
4. **Target Users** - 1+ personas with role, context, needs
5. **Product Description** - Features with priority (must_have, should_have, nice_to_have)
6. **Key Requirements** - 3+ functional, 2+ technical with rationale
7. **Design & Aesthetics** - Style direction, colors, finish
8. **Target Price** - MSRP recommendation with competitive positioning
9. **Risks and Thoughts** - 2+ risks with likelihood/impact, mitigation
10. **Competition to Review** - Research findings summary
11. **Additional Considerations** - Certifications, regulatory, sustainability
12. **Success Criteria** - 2+ measurable metrics with timeframes

**Quality Rules:**
- Use data from request_data and research_data
- Attribute sources (requestor, inferred, research)
- Note confidence level per section
- **Flag gaps explicitly** - don't hide missing info
- Be specific, not generic
- Reference competitors by name
- Include numbers where available

---

### 5. **mrd-template-reference.md**
**Purpose:** Comprehensive document formatting specification

**Document Configuration:**
- **Page:** US Letter (8.5" × 11"), 1" margins
- **Font:** Arial throughout
- **Colors:** Black text (#000000), Blue links (#1155CC)

**Typography:**
| Element | Size | Weight | Line Spacing |
|---------|------|--------|--------------|
| Document Title (H1) | 20pt | Normal | 1.15 |
| Section Heading (H2) | 16pt | Normal | 1.15 |
| Subsection (H3) | 13pt | Normal | 1.15 |
| Body Text | 11pt | Normal | 1.15 |

**Spacing Rules:**
- After title: 12pt
- After section heading: 6pt
- After paragraph: 6pt
- After bullet item: 0pt (blank line)
- Before section heading: 12pt

**Content Type Patterns:**
- `prose_with_bold_emphasis` - Bold for key features, specs
- `bullet_list` - Each item followed by blank line
- `bullet_list_with_bold_labels` - **Label:** Description
- `bullet_list_with_nested` - Two-level hierarchy
- `link_list` - Markdown hyperlinks with optional descriptions
- `single_bold_statement` - **Target price is $XXX**
- `prose_analysis` - Free-form with quoted terms, contrasts

**Horizontal Rules:**
- Place after every major section (H2)
- Use three dashes: `---`

**Implementation Code:**
- Detailed JavaScript template using `docx` library
- Helper functions for titles, headings, bullets, paragraphs, links
- Document configuration matching exact DXA measurements
- Numbering configuration for bullet lists

---

## Current Implementation Analysis

### What Exists

**✅ Basic Skills:**
- `web_search.ts` - Google Custom Search API integration
- `mrd_generator.ts` - AI-powered MRD generation using Gemini Pro

**✅ API Endpoint:**
- `/api/generate` - Single-shot generation endpoint
- Performs 3 parallel searches
- Generates MRD with AI or template fallback

**✅ Frontend:**
- Simple form: Product Concept, Target Market, Additional Details
- Loading states, error handling
- Markdown display of results

**✅ Architecture:**
- AgentOS-inspired structure (`app/`, `skills/`, `docs/`)
- Next.js App Router
- TypeScript throughout

### What's Missing

**❌ Structured Multi-Stage Pipeline:**
- No request parsing stage (01_parse_request)
- No gap analysis stage (02_gap_analysis)
- No iterative clarification workflow
- Direct jump from form to research

**❌ Data Schemas:**
- No `request.json` structured output
- No `gaps` assessment with critical/important/minor classification
- No `scope_flags` (GREEN/YELLOW/RED)
- No request ID generation

**❌ Gap Analysis & Clarification:**
- No detection of missing information
- No question generation based on gaps
- No multi-round clarification (max 2 rounds, 5 questions)
- No prioritization logic (target_market > use_cases > price...)

**❌ Targeted Competitive Research:**
- Generic search queries, not competitor-specific
- No targeting of Bouncepad, Displays2Go, Heckler Design, etc.
- No structured product data extraction (price, features, strengths/weaknesses)
- No market analysis (price clustering, positioning recommendations)

**❌ Document Formatting:**
- Current output is Markdown text, not structured DOCX
- No implementation of Compulocks 12-section template
- No precise typography (Arial 11pt body, 16pt H2, etc.)
- No horizontal rules after sections
- No bold emphasis patterns
- No `docx` library integration

**❌ Quality Controls:**
- No verification that minimum 3 competitors found
- No source attribution for claims
- No confidence scoring
- No limitations acknowledgment
- No "gaps to flag" in final document

**❌ Prompt Engineering:**
- Generic system prompts, not using reference library templates
- No `<task type="parse">` structured prompts
- No XML-style input/output schemas from reference docs
- No `ORIGIN.md` system prompt file

---

## Methodology & Research Patterns

### Reference Library Methodology

**1. Iterative Refinement (Not One-Shot):**
- Parse → Analyze → Clarify → Research → Generate
- User is engaged **up to 2 times** to fill critical gaps
- Prevents "garbage in, garbage out" scenarios

**2. Data-Driven Decisions:**
- Gap severity determines workflow: proceed vs. clarify
- Confidence scoring per section
- Source attribution required

**3. Domain-Specific Knowledge:**
- Compulocks product categories (enclosure, mount, stand, lock, charging)
- Target verticals (Retail, Hospitality, Healthcare, Corporate, Education)
- Known competitors (7 specific companies)
- Pricing context ($200-$600 typical range from examples)

**4. Quality Over Speed:**
- Minimum 3 competitors required
- No fabricated data permitted
- Explicit limitations section
- Gaps flagged in final document

**5. Document Standards:**
- Corporate template compliance (US Letter, Arial, specific spacing)
- Exportable to DOCX format
- Professional presentation for stakeholders

### Current Implementation Approach

**1. Single-Pass Generation:**
- Form submission → Search → Generate → Done
- No user engagement loop
- Accepts any input without validation

**2. Generic Search:**
- Broad queries: "market size trends", "competitors analysis"
- Not targeting specific known competitors
- No structured data extraction from results

**3. AI-Dependent:**
- Relies on Gemini Pro to synthesize everything
- Template fallback is minimal
- No structured prompts guiding AI output

**4. Markdown Output:**
- Simple text format
- No corporate styling
- Not export-ready for business context

---

## Alignment Recommendations

### Priority 1: Implement Multi-Stage Pipeline

**Create:** `agent/` directory with workflow state machine

```typescript
// agent/workflow.ts
export enum WorkflowStage {
  PARSE_REQUEST = 'parse_request',
  GAP_ANALYSIS = 'gap_analysis',
  CLARIFY = 'clarify',
  RESEARCH = 'research',
  GENERATE_MRD = 'generate_mrd',
  COMPLETE = 'complete'
}

export interface WorkflowState {
  stage: WorkflowStage;
  request_id: string;
  parsed_data: RequestData | null;
  gap_assessment: GapAssessment | null;
  clarification_round: number;
  research_findings: ResearchData | null;
  mrd_output: string | null;
}
```

**Implement:** State transitions with validation gates

### Priority 2: Add Gap Analysis & Clarification

**Create:** `skills/gap_analyzer.ts`
- Implement BLOCKING/IMPORTANT/MINOR classification
- Question generation with prioritization
- Decision logic (clarify/proceed/escalate)
- Max 2 rounds enforcement

**Update:** Frontend to support Q&A flow
- Display generated questions
- Collect user answers
- Show progress: "Round 1 of 2"

### Priority 3: Structured Data Schemas

**Create:** `lib/schemas.ts`
- `RequestData` interface matching 01_parse_request schema
- `GapAssessment` interface matching 02_gap_analysis schema
- `ResearchData` interface matching 04_research schema
- `MRDData` interface matching mrd-template-reference data input schema

**Add:** Request ID generation
```typescript
function generateRequestId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORIGIN-${date}-${random}`;
}
```

### Priority 4: Enhanced Research Skill

**Update:** `skills/web_search.ts`
- Add competitor-specific search functions
- Target known competitors: Bouncepad, Displays2Go, Heckler Design, Ergotron, Peerless-AV, Chief, Kensington
- Extract structured product data (price, features, strengths, weaknesses)
- Implement market analysis (price clustering, positioning)

**Add:** `skills/competitor_analyzer.ts`
- Parse product pages for structured data
- Price extraction with source attribution
- Feature comparison logic
- Market gap identification

### Priority 5: Document Formatting

**Install:** `docx` library
```bash
npm install docx
```

**Create:** `lib/docx-generator.ts`
- Implement Compulocks 12-section template
- Typography configurations (Arial, 11pt body, 16pt H2, 13pt H3)
- Spacing rules (12pt after title, 6pt after section, etc.)
- Bullet list formatting with blank lines
- Horizontal rules after sections
- Bold emphasis for specs, measurements, prices
- Hyperlink formatting (blue, underlined)

**Update:** API to return DOCX binary
```typescript
// /api/generate route.ts
const docBuffer = await generateMRDDocument(mrdData);
return new NextResponse(docBuffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="MRD-${requestId}.docx"`
  }
});
```

### Priority 6: Prompt Engineering

**Create:** `prompts/` directory
- `01_parse_request_prompt.ts` - Structured parsing prompt from reference
- `02_gap_analysis_prompt.ts` - Gap assessment prompt from reference
- `04_research_prompt.ts` - Competitive research prompt from reference
- `05_generate_mrd_prompt.ts` - MRD generation prompt from reference
- `system_prompts.ts` - System-level instructions (equivalent to ORIGIN.md)

**Use XML-style structured prompts:**
```typescript
const parsePrompt = `
<task type="parse">
<name>Parse Product Research Request</name>
<input>
<request>
<body_text>${requestText}</body_text>
<timestamp>${timestamp}</timestamp>
</request>
</input>
<instructions>
${instructions from 01_parse_request.md}
</instructions>
<output_schema>
${JSON schema from 01_parse_request.md}
</output_schema>
</task>
`;
```

### Priority 7: Quality Controls

**Add:** Verification checks at each stage
- Parse: Request ID format, required fields present
- Gap Analysis: Max 5 questions, no repeats, proper prioritization
- Research: Minimum 3 competitors, URLs are direct links, prices have sources
- MRD: All 12 sections present, gaps flagged, sources attributed

**Add:** Confidence scoring
```typescript
interface SectionConfidence {
  section: string;
  confidence: 0 | 0.25 | 0.5 | 0.75 | 1.0;
  data_sources: ('requestor' | 'inferred' | 'research')[];
  gaps: string[];
}
```

**Add:** Limitations section
- Acknowledge what data couldn't be found
- State assumptions made
- Flag uncertainties

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create `agent/workflow.ts` state machine
- [ ] Define `lib/schemas.ts` data structures
- [ ] Implement request ID generation
- [ ] Create `prompts/` directory with reference library prompts

### Phase 2: Gap Analysis (Week 3-4)
- [ ] Implement `skills/gap_analyzer.ts`
- [ ] Add question generation logic
- [ ] Update API to support multi-stage flow
- [ ] Update frontend for Q&A interaction
- [ ] Add clarification round tracking

### Phase 3: Enhanced Research (Week 5-6)
- [ ] Add competitor-specific search targeting
- [ ] Implement product data extraction
- [ ] Create market analysis functions
- [ ] Add price clustering and positioning logic
- [ ] Implement minimum 3 competitors validation

### Phase 4: Document Formatting (Week 7-8)
- [ ] Install and configure `docx` library
- [ ] Implement Compulocks 12-section template
- [ ] Add typography and spacing configurations
- [ ] Create helper functions (bullets, links, headings)
- [ ] Add DOCX export endpoint

### Phase 5: Quality & Polish (Week 9-10)
- [ ] Add verification checks at each stage
- [ ] Implement confidence scoring
- [ ] Add source attribution throughout
- [ ] Create limitations section
- [ ] Add comprehensive error handling
- [ ] Write integration tests

---

## Key Differences: Reference vs. Current

| Aspect | Reference Library | Current Implementation |
|--------|------------------|----------------------|
| **Pipeline** | 5 stages with state machine | Single-pass generation |
| **User Interaction** | Up to 2 clarification rounds | None (one-shot) |
| **Gap Detection** | Structured (BLOCKING/IMPORTANT/MINOR) | None |
| **Questions** | Max 5, prioritized, with context | None |
| **Competitors** | 7 specific companies targeted | Generic search |
| **Research Minimum** | 3 comparable products required | No minimum |
| **Data Extraction** | Structured (price, features, strengths) | Unstructured snippets |
| **Market Analysis** | Price clustering, positioning | None |
| **Document Format** | DOCX with precise typography | Markdown text |
| **Template** | 12 sections, Compulocks standard | Generic AI output |
| **Styling** | Arial, specific sizes/spacing | Plain text |
| **Quality Controls** | Verification at each stage | Minimal |
| **Source Attribution** | Required for all claims | None |
| **Confidence Scoring** | Per section | None |
| **Limitations** | Explicit acknowledgment | None |

---

## Critical Insights

### 1. **Reference Library Represents Production Methodology**
The reference documents aren't just templates—they codify a **tested workflow** from a predecessor project. The specific competitor names, price ranges, and vertical markets suggest this is **Compulocks domain knowledge** that shouldn't be ignored.

### 2. **Gap Analysis is the Differentiator**
The 2-round clarification workflow with prioritized questions is what separates a "chatbot" from a "professional tool." It prevents:
- Vague MRDs from vague inputs
- Wasted research on undefined products
- Missing critical pricing/volume data

### 3. **Document Formatting Matters**
The extreme detail in `mrd-template-reference.md` (down to DXA measurements) indicates that **stakeholders expect specific formatting**. A Markdown document may not be acceptable for corporate review processes.

### 4. **Competitor Intelligence is Structured**
Targeting Bouncepad, Displays2Go, Heckler Design, etc. by name suggests:
- These are known recurring competitors
- Price positioning is critical ($200-$600 range in examples)
- Differentiation opportunities are template-driven

### 5. **Prompt Engineering is Key**
The XML-style structured prompts in the reference library are designed for **consistent, parseable AI output**. Generic prompts won't achieve the same reliability.

---

## Questions for Clarification

1. **ORIGIN.md Reference:**
   - Multiple docs mention loading `ORIGIN.md` as system prompt
   - This file is not in the reference library
   - Does this exist elsewhere? What does it contain?

2. **Compulocks Specificity:**
   - Should the app remain Compulocks-specific (competitors, verticals)?
   - Or should it be generalized for other product domains?

3. **Gemini API vs. Template:**
   - Reference docs show Apps Script + Gemini API usage
   - Should we continue with Google Gemini Pro?
   - Or consider other models (OpenAI GPT-4, Claude, etc.)?

4. **Document Output Priority:**
   - Is DOCX export required for MVP?
   - Or can Markdown suffice initially?

5. **Database/Persistence:**
   - No mention of storing request history, MRDs
   - Should we add persistence (database, file storage)?
   - Or remain stateless?

---

## Conclusion

The reference library defines a **sophisticated, multi-stage MRD generation system** with:
- Iterative user engagement
- Structured data extraction
- Targeted competitive research
- Corporate-standard document formatting

Your current implementation is a **solid foundation** but represents ~20% of the reference library's scope. To fully align:

**Must Have:**
- Multi-stage workflow with gap analysis
- Clarification Q&A loop (max 2 rounds, 5 questions)
- Competitor-specific research targeting
- Structured data schemas

**Should Have:**
- DOCX export with Compulocks template
- Market analysis (price clustering, positioning)
- Quality controls (verification, confidence scoring)

**Nice to Have:**
- Request ID tracking
- Limitations acknowledgment
- Source attribution throughout
- Integration tests for each stage

The reference library represents **production-ready methodology** from a working system. Adopting it will transform the app from a prototype to an enterprise tool.

---

**Next Steps:** Please review this analysis and let me know which priorities you'd like to tackle first. I recommend starting with Phase 1 (Foundation) to establish the multi-stage pipeline, then Phase 2 (Gap Analysis) to add the clarification workflow.
