# MRD Document Template Reference

## Purpose
This template reference file defines the exact formatting, structure, and styling specifications for generating Market Requirements Documents (MRDs). AI agents should use this file to produce documents that match Compulocks' standard document format exactly.

---

## Document Configuration

### Page Setup
```yaml
page:
  size: "US Letter"
  width: 8.5 inches (12240 DXA)
  height: 11 inches (15840 DXA)
  margins:
    top: 1 inch (1440 DXA)
    bottom: 1 inch (1440 DXA)
    left: 1 inch (1440 DXA)
    right: 1 inch (1440 DXA)
  content_width: 6.5 inches (9360 DXA)
```

### Color Palette
```yaml
colors:
  text_primary: "#000000"      # Black - all body text
  text_heading: "#000000"      # Black - all headings
  text_link: "#1155CC"         # Blue - hyperlinks
  horizontal_rule: "#000000"   # Black - section dividers
```

---

## Typography Specifications

### Font Family
```yaml
fonts:
  primary: "Arial"
  fallback: "Helvetica, sans-serif"
```

### Text Styles

| Element | Font | Size (pt) | Weight | Color | Line Spacing |
|---------|------|-----------|--------|-------|--------------|
| Document Title (H1) | Arial | 20pt | Normal | Black | 1.15 |
| Section Heading (H2) | Arial | 16pt | Normal | Black | 1.15 |
| Subsection (H3) | Arial | 13pt | Normal | Black | 1.15 |
| Body Text | Arial | 11pt | Normal | Black | 1.15 |
| Bold Emphasis | Arial | 11pt | Bold | Black | 1.15 |
| Bullet Items | Arial | 11pt | Normal | Black | 1.15 |
| Links | Arial | 11pt | Normal | Blue (#1155CC) | 1.15 |

---

## Spacing Rules

### Paragraph Spacing
```yaml
spacing:
  after_title: 12pt
  after_section_heading: 6pt
  after_subsection: 6pt
  after_paragraph: 6pt
  after_bullet_item: 0pt
  before_section_heading: 12pt
  before_subsection: 6pt
```

### Indentation
```yaml
indentation:
  body_text: 0
  bullet_level_1: 0.25 inches (left indent)
  bullet_level_2: 0.5 inches (left indent)
  hanging_indent: 0.25 inches (for bullet text)
```

---

## Document Structure Schema

### Required Sections (in order)

```yaml
sections:
  - name: "Document Title"
    heading_level: H1
    format: "Market Requirements Document (MRD)"
    followed_by: horizontal_rule
    
  - name: "Product Name"
    heading_level: H2
    format: "## Product Name"
    content: "[Product name placeholder or blank line]"
    followed_by: horizontal_rule
    
  - name: "1. Purpose & Vision"
    heading_level: H2
    format: "## 1. Purpose & Vision"
    content_type: "prose_with_bold_emphasis"
    followed_by: horizontal_rule
    
  - name: "2. Problem Statement"
    heading_level: H2
    format: "## 2. Problem Statement"
    content_type: "prose_with_bullet_challenges"
    followed_by: horizontal_rule
    
  - name: "3. Target Market & Use Cases"
    heading_level: H2
    format: "## 3. Target Market & Use Cases"
    subsections:
      - name: "Primary Markets"
        heading_level: H3
        content_type: "bullet_list"
      - name: "Core Use Cases"
        heading_level: H3
        content_type: "bullet_list"
    followed_by: horizontal_rule
    
  - name: "4. Target Users"
    heading_level: H2
    format: "## 4. Target Users"
    content_type: "bullet_list"
    followed_by: horizontal_rule
    
  - name: "5. Product Description"
    heading_level: H2
    format: "## 5. Product Description"
    content_type: "prose_with_bold_specs"
    followed_by: horizontal_rule
    
  - name: "6. Key Requirements"
    heading_level: H2
    format: "## 6. Key Requirements"
    subsections:
      - name: "6.1 Functional Requirements"
        heading_level: H3
        content_type: "bullet_list"
      - name: "6.2 [Category] Requirements"
        heading_level: H3
        content_type: "bullet_list_with_nested"
      - name: "6.3 [Category] Requirements"
        heading_level: H3
        content_type: "bullet_list"
    followed_by: horizontal_rule
    
  - name: "7. Design & Aesthetics"
    heading_level: H2
    format: "## 7. Design & Aesthetics"
    content_type: "bullet_list"
    followed_by: horizontal_rule
    
  - name: "8. Target Price"
    heading_level: H2
    format: "## 8. Target Price"
    content_type: "single_bold_statement"
    followed_by: horizontal_rule
    
  - name: "9. Risks and Thoughts"
    heading_level: H2
    format: "## 9. Risks and Thoughts"
    content_type: "prose_analysis"
    followed_by: horizontal_rule
    
  - name: "10. Competition to review"
    heading_level: H2
    format: "## 10. Competition to review"
    content_type: "link_list"
    followed_by: horizontal_rule
    
  - name: "11. Additional Considerations (Summary)"
    heading_level: H2
    format: "## 11. Additional Considerations (Summary)"
    content_type: "bullet_list_with_bold_labels"
    followed_by: horizontal_rule
    
  - name: "12. Success Criteria"
    heading_level: H2
    format: "## 12. Success Criteria"
    content_type: "bullet_list"
    followed_by: horizontal_rule
```

---

## Content Type Patterns

### prose_with_bold_emphasis
```
The purpose of this product is to [description] with a **[key feature]** designed primarily for **[application type]** such as [example 1], [example 2], [example 3], and [example 4].

The product should combine the **[design reference]** with a **[technical feature]**, enabling [benefits] while supporting [compatibility].
```

### bullet_list
```
* [Item 1]

* [Item 2]

* [Item 3]
```
Note: Each bullet item has a blank line after it for proper spacing.

### bullet_list_with_bold_labels
```
* **[Label]:** [Description text]

* **[Label]:** [Description text]
```

### bullet_list_with_nested
```
* **[Category label]:** [Description]

* **[Category label]:** [Description]

* [Sub-category] supports:

  * [Nested item 1]

  * [Nested item 2]
```

### link_list
```
* [URL 1](URL 1) (optional description)

* [URL 2](URL 2)

* [URL 3](URL 3)
```

### single_bold_statement
```
* **Target price is $[amount]**
```

### prose_analysis
Free-form prose with:
- Quoted terms in quotation marks ("Term")
- Contrasting concepts using Vs.
- Parenthetical clarifications
- Multiple paragraphs for complex analysis

---

## Formatting Rules

### Bold Text Usage
Apply bold formatting to:
- Key product features and specifications
- Measurements and dimensions
- Technical standards (VESA 75x75, ADA compliance)
- Price points
- Category labels in bullet lists
- Internal callouts (!!!) for attention items

### Horizontal Rules
- Place after every major section (H2)
- Use three dashes: `---`
- Creates visual separation between document sections

### Links
- Format: `[Display Text](URL)`
- Color: Blue (#1155CC)
- Underline: Yes
- Include parenthetical notes for context when helpful

### Special Notations
- Use `(!!!)` inline to draw attention to important items
- Use `\~` before approximate measurements
- Use parentheses for alternative values: `185(165) cm`

---

## Implementation Code Template

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, 
        ExternalHyperlink, BorderStyle, LevelFormat } = require('docx');

// Document configuration matching MRD template
const MRD_CONFIG = {
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 } // 11pt
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 40, font: "Arial" }, // 20pt
        paragraph: { spacing: { after: 240 } }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, font: "Arial" }, // 16pt
        paragraph: { spacing: { before: 240, after: 120 } }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, font: "Arial" }, // 13pt
        paragraph: { spacing: { before: 120, after: 120 } }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 360, hanging: 360 } }
          }
        }, {
          level: 1,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 720, hanging: 360 } }
          }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [] // Content added here
  }]
};

// Helper functions
function createTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 40 })]
  });
}

function createSectionHeading(number, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: `${number}. ${text}`, font: "Arial", size: 32 })]
  });
}

function createSubsectionHeading(number, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text: `${number} ${text}`, font: "Arial", size: 26 })]
  });
}

function createHorizontalRule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" } },
    spacing: { after: 200 }
  });
}

function createBulletItem(text, boldLabel = null) {
  const children = [];
  if (boldLabel) {
    children.push(new TextRun({ text: `${boldLabel}: `, bold: true, font: "Arial", size: 22 }));
    children.push(new TextRun({ text, font: "Arial", size: 22 }));
  } else {
    children.push(new TextRun({ text, font: "Arial", size: 22 }));
  }
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children,
    spacing: { after: 120 }
  });
}

function createParagraph(runs) {
  return new Paragraph({
    children: runs.map(run => {
      if (typeof run === 'string') {
        return new TextRun({ text: run, font: "Arial", size: 22 });
      }
      return new TextRun({ ...run, font: "Arial", size: 22 });
    }),
    spacing: { after: 120 }
  });
}

function createLink(text, url) {
  return new ExternalHyperlink({
    children: [new TextRun({ text, style: "Hyperlink", font: "Arial", size: 22 })],
    link: url
  });
}
```

---

## Data Input Schema

When collecting information from users/research to populate this template, gather data in this structure:

```yaml
mrd_data:
  product_name: string
  
  purpose_vision:
    portfolio_context: string  # e.g., "expand floor stand portfolio"
    primary_feature: string    # e.g., "human-height, telescopic adjustable"
    applications: string[]     # list of applications
    design_reference: string   # e.g., "Compulocks Swift Floor Stand"
    technical_feature: string  # e.g., "height-adjustable telescopic column"
    compatibility: string[]    # supported devices/standards
    
  problem_statement:
    challenges: string[]       # bullet list of challenges
    market_gap: string         # summary of opportunity
    
  target_market:
    primary_markets: string[]
    core_use_cases: string[]
    
  target_users: string[]
  
  product_description:
    form_factor: string
    key_specs: object          # measurements, standards
    
  requirements:
    functional: string[]
    category_2:                # e.g., "Height & ADA Compliance"
      name: string
      items: string[]
    category_3:                # e.g., "Stability & Load"
      name: string
      items: string[]
      
  design_aesthetics: string[]
  
  target_price:
    amount: number
    currency: string
    
  risks_thoughts: string       # prose analysis
  
  competition:
    - url: string
      note: string             # optional
      
  additional_considerations:
    - label: string
      description: string
      
  success_criteria: string[]
```

---

## Quality Checklist

Before finalizing document generation, verify:

- [ ] All 12 sections present in correct order
- [ ] Horizontal rules after each major section
- [ ] Consistent font (Arial) throughout
- [ ] Proper heading hierarchy (H1 > H2 > H3)
- [ ] Bold emphasis on key specs and features
- [ ] Bullet lists properly formatted with spacing
- [ ] Links formatted with blue color and underline
- [ ] No orphaned sections or missing content
- [ ] Measurements include units
- [ ] Section numbers sequential (1-12)
- [ ] Subsection numbers match parent (6.1, 6.2, 6.3)

---

## Example Section Output

### Input Data
```yaml
target_market:
  primary_markets:
    - "Corporate offices & headquarters"
    - "Hospitality (hotels, resorts, cruise terminals)"
    - "Healthcare facilities"
  core_use_cases:
    - "Virtual receptionist / AI greeter"
    - "Self check-in / check-out"
    - "Visitor management"
```

### Expected Output
```
## 3. Target Market & Use Cases

### Primary Markets

* Corporate offices & headquarters

* Hospitality (hotels, resorts, cruise terminals)

* Healthcare facilities

### Core Use Cases

* Virtual receptionist / AI greeter

* Self check-in / check-out

* Visitor management

---
```
