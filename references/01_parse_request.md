# 01_parse_request.md

> **Chain Position:** 1 of 4  
> **Input:** Raw request text  
> **Output:** `request.json` schema  
> **Human Reference:** PRD.md §4.1, DESIGN_GUIDE.md §2.1

---

## Usage

Load `ORIGIN.md` as system prompt. Inject this prompt as user message with request data.

```
Apps Script (Gemini API):
const systemPrompt = ORIGIN_TEXT;
const userPrompt = PROMPT_TEXT_WITH_REQUEST_DATA;
const result = callGemini(systemPrompt, userPrompt);
```

---

<task type="parse">
<name>Parse Product Research Request</name>

<input>
<request>
<body_text>
{{request_body}}
</body_text>
<timestamp>{{timestamp}}</timestamp>
</request>
</input>

<instructions>
Parse this product research request and extract structured data.

1. REQUESTOR IDENTIFICATION
   - Extract any names or departments if mentioned in the text
   - Default to "Unknown" if not explicit
   
2. PRODUCT CONCEPT EXTRACTION
   - Derive product name from the first sentence or core concept
   - Write 1-2 sentence summary capturing the core concept
   - Identify product category (enclosure, mount, stand, lock, charging, accessory, other)

3. DATA EXTRACTION
   Map content to these fields:
   - target_markets: Which verticals? (Retail, Hospitality, Healthcare, Corporate, Education)
   - use_cases: What will users do with this product?
   - target_price: Any price mentioned? (exact, range, maximum, approximate)
   - technical_requirements: Device compatibility, VESA, materials, other specs
   - volume_expectation: Quantity mentioned? Time period?
   - timeline: Urgency level, target dates

4. GAP ANALYSIS
   Compare extracted data against MRD template requirements.
   - Critical gaps: Fields that MUST be filled before MRD generation
   - Optional gaps: Would improve MRD but can proceed without

5. SCOPE ASSESSMENT
   Flag scope concerns:
   - GREEN: Fits product line, standard materials, known verticals
   - YELLOW: Outside typical categories, low volume signals, unusual materials
   - RED: Requires escalation (rare at parsing stage)

6. GENERATE REQUEST ID
   Format: ORIGIN-YYYYMMDD-XXXX (XXXX = random 4 digits)
</instructions>

<output_schema>
Return valid JSON matching the request.json schema.
Do not include markdown formatting or code fences.
If a field cannot be determined, use null.
</output_schema>

<verification>
Before returning, verify:
- [ ] request_id is properly formatted
- [ ] gaps.critical only includes truly blocking items
- [ ] scope_flags have valid levels (green, yellow, red)
- [ ] All required schema fields are present
</verification>

<example_output>
{
  "request_id": "ORIGIN-20250119-4829",
  "sender": {
    "email": null,
    "name": "Unknown",
    "department": "Unknown",
    "inferred_from": "None"
  },
  "product_concept": {
    "name": "Healthcare Tablet Kiosk",
    "summary": "Floor-standing tablet enclosure for patient check-in at hospital reception areas, requiring integrated card reader and sanitizable surface."
  },
  "raw_email": {
    "subject": null,
    "body": "[original request text]",
    "received_at": "2025-01-19T10:30:00Z",
    "thread_id": null,
    "message_id": null,
    "attachments": []
  },
  "extracted_data": {
    "target_markets": ["Healthcare"],
    "use_cases": ["Patient self-check-in at hospital reception"],
    "target_price": null,
    "technical_requirements": {
      "device_compatibility": ["iPad Pro 12.9"],
      "vesa_pattern": null,
      "materials": ["sanitizable surface"],
      "other": ["integrated card reader"]
    },
    "volume_expectation": null,
    "timeline": {
      "urgency": "medium",
      "target_date": null,
      "notes": null
    },
    "additional_context": "Customer request from major hospital chain"
  },
  "gaps": {
    "critical": [
      {"field": "target_price", "reason": "No price point mentioned - required for competitive positioning"},
      {"field": "volume_expectation", "reason": "No volume indicated - needed for manufacturing assessment"}
    ],
    "optional": [
      {"field": "device_compatibility", "reason": "Only one device mentioned - may want broader compatibility"}
    ]
  },
  "scope_flags": [
    {
      "level": "green",
      "reason": "Fits enclosure/kiosk category for healthcare vertical",
      "recommendation": null
    }
  ],
  "metadata": {
    "parsed_at": "2025-01-19T10:35:00Z",
    "parser_version": "01_parse_request.md v1.0",
    "confidence": 0.85
  }
}
</example_output>

</task>
