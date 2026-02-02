# 02_gap_analysis.md

> **Chain Position:** 2 of 5  
> **Input:** `request.json` from 01_parse_request  
> **Output:** Gap assessment with question recommendations  
> **Depends On:** 01_parse_request.md  
> **Human Reference:** PRD.md §4.2, DESIGN_GUIDE.md §2.2

---

## Usage

Load `ORIGIN.md` as system prompt. Inject this prompt with parsed request data.

```
Apps Script (Gemini API):
const systemPrompt = ORIGIN_TEXT;
const userPrompt = PROMPT_TEXT_WITH_PARSED_REQUEST;
const result = callGemini(systemPrompt, userPrompt);
```

---

<task type="analyze">
<n>Analyze Information Gaps and Recommend Questions</n>

<input>
<parsed_request>
{{parsed_request_json}}
</parsed_request>

<clarification_round>{{round_number}}</clarification_round>
<previous_questions>{{previous_questions_if_any}}</previous_questions>
</input>

<instructions>
Analyze the parsed request and determine if clarification is needed.

1. GAP SEVERITY ASSESSMENT
   Evaluate each gap against MRD requirements:
   
   BLOCKING (must clarify before proceeding):
   - No target market identified
   - No use cases described
   - Product concept too vague to research
   
   IMPORTANT (should clarify if round available):
   - No price target
   - No volume expectation
   - Missing device compatibility
   
   MINOR (can proceed and note in MRD):
   - No specific timeline
   - Design preferences unclear
   - Materials not specified

2. DECISION: CLARIFY OR PROCEED
   
   IF clarification_round < 2 AND blocking_gaps exist:
     → Generate clarification questions
   
   IF clarification_round >= 2:
     → Proceed to research, note remaining gaps
   
   IF no blocking_gaps AND important_gaps <= 2:
     → Proceed to research

3. QUESTION GENERATION (if clarifying)
   
   Rules:
   - Maximum 5 questions
   - Prioritize by: target_market > use_cases > price > technical > volume > timeline
   - Offer multiple-choice where possible
   - Include brief context for why each question matters
   - Do not repeat previous_questions
   
   Question format:
   - Clear, specific, single-topic
   - Provide examples or options where helpful
   - Explain impact on MRD quality

4. OUTPUT DECISION
   Return one of:
   - "clarify": Questions to ask
   - "proceed": Ready for research
   - "escalate": Human intervention needed (rare)
</instructions>

<output_schema>
{
  "decision": "clarify" | "proceed" | "escalate",
  "reasoning": "string explaining the decision",
  "gap_assessment": {
    "blocking": [{"field": "string", "reason": "string"}],
    "important": [{"field": "string", "reason": "string"}],
    "minor": [{"field": "string", "reason": "string"}]
  },
  "clarification": {
    "questions": [
      {
        "number": 1,
        "field": "target field",
        "question": "The question text",
        "context": "Why this matters",
        "options": ["option1", "option2"] | null
      }
    ]
  } | null,
  "proceed_notes": {
    "gaps_to_flag": ["gaps that will be noted in MRD"],
    "assumptions_to_make": ["reasonable assumptions for research"]
  } | null,
  "escalate_reason": "string" | null
}
</output_schema>

<verification>
Before returning, verify:
- [ ] decision matches gap severity assessment
- [ ] If clarifying: questions <= 5, no repeats from previous_questions
- [ ] If proceeding: gaps_to_flag captures all unresolved items
- [ ] Questions are prioritized correctly
- [ ] Each question has context explaining its importance
</verification>

<example_output_clarify>
{
  "decision": "clarify",
  "reasoning": "Two blocking gaps identified: no target price and no volume expectation. Round 1 of 2, should clarify before research.",
  "gap_assessment": {
    "blocking": [],
    "important": [
      {"field": "target_price", "reason": "Required for competitive positioning and margin analysis"},
      {"field": "volume_expectation", "reason": "Needed to assess manufacturing feasibility and tooling investment"}
    ],
    "minor": [
      {"field": "timeline", "reason": "No specific deadline, can assume standard timeline"}
    ]
  },
  "clarification": {
    "questions": [
      {
        "number": 1,
        "field": "target_price",
        "question": "What price range are you targeting for this product?",
        "context": "This helps us position against competitors and ensure viable margins.",
        "options": ["Under $200", "$200-$400", "$400-$600", "Over $600", "Need recommendation based on market"]
      },
      {
        "number": 2,
        "field": "volume_expectation",
        "question": "What's the expected annual volume for this product?",
        "context": "Volume impacts tooling decisions and unit economics.",
        "options": ["Under 500 units", "500-2,000 units", "2,000-10,000 units", "Over 10,000 units"]
      }
    ]
  },
  "proceed_notes": null,
  "escalate_reason": null
}
</example_output_clarify>

<example_output_proceed>
{
  "decision": "proceed",
  "reasoning": "All critical information available. Minor gaps (timeline, detailed design preferences) can be noted in MRD and addressed during review.",
  "gap_assessment": {
    "blocking": [],
    "important": [],
    "minor": [
      {"field": "timeline", "reason": "No specific date, will assume standard 6-month development cycle"},
      {"field": "color_preference", "reason": "Not specified, will recommend standard options"}
    ]
  },
  "clarification": null,
  "proceed_notes": {
    "gaps_to_flag": [
      "Timeline assumed as standard (6 months) - confirm with requestor",
      "Color/finish options not specified - will include standard recommendations"
    ],
    "assumptions_to_make": [
      "Standard aluminum construction unless otherwise specified",
      "Keyed lock security as baseline feature",
      "VESA 100x100 compatibility assumed"
    ]
  },
  "escalate_reason": null
}
</example_output_proceed>

</task>
