# 04_research.md

> **Chain Position:** 4 of 5  
> **Input:** `parsed_data.json` (merged request data)  
> **Output:** Competitive research findings  
> **Depends On:** 02_gap_analysis.md (decision = "proceed") OR clarification complete  
> **Human Reference:** PRD.md §4.3, DESIGN_GUIDE.md §3

---

## Usage

Load `ORIGIN.md` as system prompt. Execute when ready to research (after clarification if needed).

```
Apps Script (Gemini API):
const systemPrompt = ORIGIN_TEXT;
const userPrompt = PROMPT_TEXT_WITH_PARSED_REQUEST;
const result = callGemini(systemPrompt, userPrompt);
Note: Enable Gemini web grounding for this prompt
```

---

<task type="research">
<n>Conduct Competitive Research</n>

<input>
<request_data>
{{parsed_data_json}}
</request_data>

<research_scope>
<product_concept>{{product_name}}: {{product_summary}}</product_concept>
<category>{{product_category}}</category>
<target_markets>{{target_markets}}</target_markets>
<device_compatibility>{{device_compatibility}}</device_compatibility>
<price_range>{{target_price_range}}</price_range>
</research_scope>
</input>

<instructions>
Conduct competitive research for the proposed product.

1. COMPETITOR SEARCH
   Search these competitors for comparable products:
   - Bouncepad
   - Displays2Go
   - Heckler Design
   - Ergotron
   - Peerless-AV
   - Chief (Legrand)
   - Kensington
   
   Search strategy:
   - Use product category + device type
   - Use vertical/use case terms
   - Check each competitor's website directly

2. FOR EACH COMPARABLE PRODUCT FOUND
   Extract:
   - Product name
   - URL (direct link to product page)
   - Price (MSRP, note if estimated)
   - Key features (3-5 most relevant)
   - Device compatibility
   - Mounting type / form factor
   - Notable strengths vs. proposed product
   - Notable weaknesses / gaps

3. MARKET ANALYSIS
   Based on research:
   - Identify price clustering (where do competitors land?)
   - Spot market gaps (what's not being addressed?)
   - Note differentiation opportunities
   - Flag potential positioning strategies

4. LIMITATIONS ACKNOWLEDGMENT
   Note any limitations:
   - Prices may not reflect dealer/distributor costs
   - Product pages may be outdated
   - Some competitors may not have direct comparables
   - Market size estimates are directional

5. MINIMUM REQUIREMENTS
   - Find at least 3 comparable products
   - If fewer found, explicitly state why
   - Don't fabricate products or data
</instructions>

<output_schema>
{
  "research_id": "ORIGIN-RES-{{request_id}}",
  "conducted_at": "ISO datetime",
  "competitors_searched": ["list of competitors checked"],
  "products_found": [
    {
      "company": "string",
      "product_name": "string",
      "url": "string (direct link)",
      "price": {
        "value": number | null,
        "currency": "USD",
        "type": "msrp" | "estimated" | "range",
        "range": {"min": number, "max": number} | null,
        "source": "string (where price was found)"
      },
      "key_features": ["feature 1", "feature 2", "..."],
      "device_compatibility": ["device 1", "device 2"],
      "form_factor": "string",
      "materials": ["material 1", "material 2"],
      "strengths": ["vs proposed product"],
      "weaknesses": ["vs proposed product"],
      "relevance_score": 1-10,
      "notes": "string"
    }
  ],
  "market_analysis": {
    "price_range_observed": {"min": number, "max": number, "median": number},
    "price_positioning_recommendation": "string",
    "market_gaps": ["gap 1", "gap 2"],
    "differentiation_opportunities": ["opportunity 1", "opportunity 2"],
    "competitive_threats": ["threat 1"],
    "market_trends": ["trend 1"]
  },
  "limitations": [
    "limitation statement 1",
    "limitation statement 2"
  ],
  "research_quality": {
    "products_found_count": number,
    "meets_minimum": boolean,
    "confidence_score": 0-100,
    "gaps_in_research": ["what couldn't be found"]
  }
}
</output_schema>

<verification>
Before returning, verify:
- [ ] At least 3 comparable products found (or explicit explanation why not)
- [ ] All URLs are direct product links (not search results)
- [ ] Prices have source attribution
- [ ] No fabricated data (if not found, say so)
- [ ] Limitations section acknowledges research constraints
- [ ] Market analysis provides actionable insights
</verification>

<example_output>
{
  "research_id": "ORIGIN-RES-20250119-4829",
  "conducted_at": "2025-01-19T11:00:00Z",
  "competitors_searched": ["Bouncepad", "Displays2Go", "Heckler Design", "Ergotron", "Peerless-AV", "Chief", "Kensington"],
  "products_found": [
    {
      "company": "Bouncepad",
      "product_name": "Floorstand Pro",
      "url": "https://www.bouncepad.com/products/floorstand-pro",
      "price": {
        "value": 549,
        "currency": "USD",
        "type": "msrp",
        "range": null,
        "source": "Bouncepad website product page"
      },
      "key_features": [
        "Height adjustable",
        "Cable management",
        "Secure enclosure with keyed lock",
        "Portrait/landscape rotation",
        "Weighted base for stability"
      ],
      "device_compatibility": ["iPad Pro 12.9", "iPad Air", "iPad 10th gen"],
      "form_factor": "Floor standing kiosk",
      "materials": ["Aluminum", "Steel base"],
      "strengths": [
        "Established brand in healthcare",
        "Multiple iPad compatibility",
        "Clean aesthetic"
      ],
      "weaknesses": [
        "No integrated card reader option",
        "Not marketed as sanitizable",
        "Limited color options"
      ],
      "relevance_score": 9,
      "notes": "Primary competitor for this use case"
    },
    {
      "company": "Heckler Design",
      "product_name": "Kiosk Floor Stand",
      "url": "https://hecklerdesign.com/products/kiosk-floor-stand",
      "price": {
        "value": 499,
        "currency": "USD",
        "type": "msrp",
        "range": null,
        "source": "Heckler Design website"
      },
      "key_features": [
        "Minimalist design",
        "Steel construction",
        "Integrated cable routing",
        "Optional branding panel"
      ],
      "device_compatibility": ["iPad Pro 12.9", "iPad Pro 11"],
      "form_factor": "Floor standing",
      "materials": ["Powder-coated steel"],
      "strengths": [
        "Premium design aesthetic",
        "Branding customization"
      ],
      "weaknesses": [
        "Limited device compatibility",
        "No integrated accessories",
        "Higher price point for features"
      ],
      "relevance_score": 8,
      "notes": "Design-focused competitor"
    },
    {
      "company": "Displays2Go",
      "product_name": "iPad Floor Stand Kiosk with Sanitizer",
      "url": "https://www.displays2go.com/P-48291/ipad-floor-stand-kiosk",
      "price": {
        "value": 329,
        "currency": "USD",
        "type": "msrp",
        "range": null,
        "source": "Displays2Go website"
      },
      "key_features": [
        "Integrated hand sanitizer dispenser",
        "Locking enclosure",
        "Adjustable height",
        "Healthcare-focused design"
      ],
      "device_compatibility": ["iPad 10.2", "iPad Air"],
      "form_factor": "Floor standing with accessory mount",
      "materials": ["Steel", "Plastic enclosure"],
      "strengths": [
        "Healthcare-specific features",
        "Lower price point",
        "Sanitizer integration"
      ],
      "weaknesses": [
        "Less premium materials",
        "Limited to older iPad models",
        "Generic aesthetic"
      ],
      "relevance_score": 7,
      "notes": "Budget option with healthcare features"
    }
  ],
  "market_analysis": {
    "price_range_observed": {"min": 329, "max": 549, "median": 499},
    "price_positioning_recommendation": "Target $400-$500 range to compete on quality while undercutting premium options. Healthcare features (sanitizable, card reader) justify premium over Displays2Go.",
    "market_gaps": [
      "No competitor offers integrated card reader as standard",
      "Sanitizable surfaces marketed but not certified",
      "Limited iPad Pro 12.9 + healthcare combination"
    ],
    "differentiation_opportunities": [
      "Integrated card reader as standard feature",
      "Certified sanitizable materials with documentation",
      "Healthcare compliance certifications (UL, antimicrobial)"
    ],
    "competitive_threats": [
      "Bouncepad brand recognition in healthcare",
      "Displays2Go price advantage"
    ],
    "market_trends": [
      "Healthcare kiosk demand increasing post-COVID",
      "Contactless check-in becoming standard",
      "Antimicrobial surfaces increasingly specified"
    ]
  },
  "limitations": [
    "Prices reflect MSRP; dealer/distributor pricing not available",
    "Product availability and lead times not verified",
    "Healthcare-specific certifications not fully researched",
    "Market size estimates not included - would require additional research"
  ],
  "research_quality": {
    "products_found_count": 3,
    "meets_minimum": true,
    "confidence_score": 85,
    "gaps_in_research": [
      "Peerless-AV and Chief did not have direct healthcare kiosk comparables",
      "Kensington focuses on security accessories, not full kiosks"
    ]
  }
}
</example_output>

</task>
