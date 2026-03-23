# Product Requirements Document (PRD)
## Simplified Brief Helper

> **Version:** 1.0
> **Owner:** Ori Shavit, R&D
> **Status:** Design Phase
> **Last Updated:** February 11, 2026

---

## 1. Executive Summary

The Simplified Brief Helper is an intelligent form-based web application for capturing product details **past the research phase**. Users fill in 6 structured fields with free-form text, and AI assistants help extract, structure, and expand the information in real-time. The system learns from each submission to improve future extractions, building a knowledge base of product patterns.

**Core value:** Transform rough product notes into professional, structured briefs with AI assistance while building organizational product knowledge over time.

---

## 2. Problem Statement

### Current State
- Product details are captured in inconsistent formats (emails, notes, spreadsheets)
- Technical specifications often incomplete (missing VESA specs, mounting options, sizes)
- No systematic way to capture "must-have" vs "nice-to-have" features
- Knowledge about product patterns scattered across team members' heads
- Time-consuming to format rough notes into professional documentation

### Desired State
- Single structured intake with 6 clear fields (What, Who, Where, MOQ, Must-Haves, Nice-to-Haves)
- AI assistance to extract structured data from free-form text
- Real-time gap detection (e.g., "tablet stand" → suggests asking about placement, sizes, VESA)
- Knowledge base learns patterns to make future submissions faster
- Professional simplified brief generated automatically

---

## 3. Users & Stakeholders

| User | Role | Primary Interaction |
|------|------|---------------------|
| Product Managers | Document product requirements | Fill 6-field form, interact with AI suggestions |
| R&D Team | Capture technical specs | Fill technical details, use AI expansion |
| Sales Engineering | Document customer requests | Quick capture of customer needs |
| Marketing Team | Define product positioning | Fill market-focused details |

---

## 4. Functional Requirements

### 4.1 Six-Field Structured Input
> **Agent Reference:** `text-extraction-agent`, `brief-orchestrator`

**Fields:**
1. **What** - Product description (what it is, what it does)
2. **Who** - Target users/customers
3. **Where** - Where it's used (environment, use cases)
4. **MOQ (Minimum Order Quantity)** - Volume (informs design approach)
5. **Must-Have Features** - Non-negotiable requirements
6. **Nice-to-Have Features** - Optional enhancements

**Behavior:**
- User types free-form text in each field
- After 2-3 second pause, AI analyzes the input
- AI converts text to professional bullet points
- Field auto-saves to session storage

### 4.2 Intelligent Gap Detection
> **Agent Reference:** `gap-detection-agent`, `knowledge-base-agent`

**Pattern Recognition:**
- System recognizes product types (e.g., "tablet stand", "display mount", "enclosure")
- Queries knowledge base for known patterns
- Identifies missing critical information

**Example:**
```
User types: "tablet stand"
Gap detection identifies missing:
  - Placement (wall, desk, floor)
  - Tablet sizes (9.7", 10.2", 12.9")
  - Screen sizes supported
  - Mounting options (clamp, bolt, adhesive)
  - Enclosure type (open, closed, security)
  - VESA fitments (75x75, 100x100)
```

**UI Behavior:**
- Shows suggested questions inline below the text box
- User can either:
  - Type answers directly
  - Click "AI Expand" to let AI generate suggestions

### 4.3 AI-Powered Expansion
> **Agent Reference:** `expansion-agent`, LangExtract integration

**Capabilities:**
- Takes user's bullet points + identified gaps
- Generates expanded, professional text
- Converts prose to clean bullet points
- Maintains technical accuracy
- Cites sources when applicable

**User Control:**
- User decides when to invoke AI expansion
- Can edit AI suggestions
- Can accept or regenerate
- Chat-like interface within each text box

### 4.4 Knowledge Base Learning
> **Agent Reference:** `knowledge-base-agent`

**Pattern Storage:**
- Records user input → extracted data → final output
- Identifies common product types and their typical requirements
- Builds company-specific terminology dictionary
- Tracks which gaps appear most frequently

**Storage Strategy:**
- **Redis:** Hot cache for active sessions (< 1 hour old)
- **SQLite:** Persistent knowledge patterns and historical data
- **Google Drive:** Completed briefs and backups

**Privacy:**
- Anonymizes data for pattern learning
- User can opt-out of knowledge sharing
- No customer names or proprietary details in patterns

### 4.5 Brief Generation
> **Agent Reference:** `brief-generator`

**Output Format:**
- Professional Markdown document
- Clean bullet-point structure
- Organized by the 6 sections
- Includes metadata (author, date, version)

**Export Options:**
- View in-app (rendered HTML)
- Download as Markdown (.md)
- Save to Google Drive (OAuth integration)
- Copy to clipboard

### 4.6 User's Own AI Integration (OAuth Google Workspace)
> **OAuth Integration:** Google Workspace Gemini access

**Authentication Flow:**
1. User clicks "Connect Google Workspace"
2. OAuth popup authenticates with Google
3. App uses user's Gemini entitlement (Gmail for Business)
4. All AI calls use user's quota, not shared pool

**Benefits:**
- No API key management for users
- Leverages existing Google Workspace subscription
- User controls their own AI usage
- Seamless single sign-on experience

---

## 5. Non-Functional Requirements

### 5.1 Performance
- AI response time: < 3 seconds for extraction
- UI pause detection: 2-3 second debounce
- Redis cache hit rate: > 90% for common patterns
- Page load time: < 2 seconds

### 5.2 Scalability
- Support 50+ concurrent users (POC phase)
- Redis handles 10,000 ops/sec
- SQLite supports 1,000+ pattern entries
- Google Drive sync: async background task

### 5.3 Security
- OAuth 2.0 for Google Workspace
- HTTPS only
- Input sanitization (prevent XSS, injection)
- User sessions expire after 1 hour of inactivity
- API keys stored in environment variables only

### 5.4 Usability
- Mobile-responsive (tablet and desktop)
- Keyboard shortcuts (Ctrl+Enter to expand, Esc to cancel)
- Undo/redo support per field
- Auto-save every 30 seconds
- Visual feedback for AI processing (loading states)

---

## 6. Technical Architecture

### 6.1 Multi-Agent System

**Agent Roles** (following AgentOS pattern):

| AgentOS Role | Agent ID | Responsibility |
|--------------|----------|----------------|
| **PM** | `brief-orchestrator` | Coordinates entire workflow, tracks completion |
| **Architect** | `knowledge-base-agent` | Maintains patterns, defines schemas |
| **Engineer** | `text-extraction-agent`, `expansion-agent` | Core extraction and expansion |
| **QA** | `gap-detection-agent`, `quality-validator-agent` | Validation and completeness |

**New Agents:**

1. **text-extraction-agent**
   - Uses LangExtract to parse free text
   - Extracts entities (sizes, specs, materials)
   - Returns structured bullet points + confidence score

2. **gap-detection-agent**
   - Queries knowledge base for product patterns
   - Identifies missing critical information
   - Prioritizes gaps (high/medium/low)

3. **expansion-agent**
   - Takes bullet points + gaps
   - Generates professional expanded text
   - Uses user's Gemini via OAuth

4. **knowledge-base-builder**
   - Learns patterns from submissions
   - Updates SQLite with new patterns
   - Syncs to Google Drive periodically

5. **brief-generator**
   - Takes all 6 fields' data
   - Generates final simplified brief
   - Formats as Markdown + HTML

6. **brief-orchestrator** (Orchestrator)
   - Coordinates all agents
   - Manages sequential field processing
   - Triggers final brief generation

### 6.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, React 18, TypeScript | UI components, routing |
| Backend | Next.js API Routes | Agent orchestration, API endpoints |
| AI Integration | LangExtract (Gemini), Google OAuth | Extraction, expansion, authentication |
| Storage - Hot | Redis | Session cache, pattern cache |
| Storage - Persistent | SQLite | Knowledge base, historical data |
| Storage - Documents | Google Drive API | Completed briefs, backups |
| Design System | CSS Modules + Design Tokens (DTCG) | Consistent styling |
| Testing | Jest | Unit tests for agents |

### 6.3 Storage Architecture

**Redis (In-Memory Cache):**
```
session:{sessionId}:field:{fieldType} → { extractedData, gaps, timestamp }
pattern:{productType}:gaps → [ { gap, priority, question } ]
user:{userId}:session → { sessionId, startTime, fieldsComplete }
```

**SQLite (Persistent DB):**
```sql
CREATE TABLE product_patterns (
  id INTEGER PRIMARY KEY,
  field_type TEXT,
  input_text TEXT,
  extracted_entities JSON,
  gaps_found JSON,
  final_output JSON,
  created_at TIMESTAMP
);

CREATE TABLE knowledge_patterns (
  id INTEGER PRIMARY KEY,
  product_type TEXT,
  pattern_data JSON,
  confidence REAL,
  usage_count INTEGER,
  last_used TIMESTAMP
);
```

**Google Drive Structure:**
```
/CompuLocks-Briefs/
  ├── templates/
  │   └── brief-template.md
  ├── completed/
  │   ├── 2026/
  │   │   ├── 02/
  │   │   │   ├── brief-001-tablet-stand.md
  │   │   │   └── brief-002-display-mount.md
  └── knowledge-base/
      ├── patterns.json (synced from SQLite)
      └── terminology.json
```

---

## 7. User Flow

### 7.1 Happy Path

```
1. User navigates to /brief-helper
2. OAuth: Sign in with Google Workspace (first time only)
3. Form loads with 6 empty text boxes
4. User types in "What" field: "tablet stand for retail"
5. After 2-3 second pause:
   → text-extraction-agent extracts: "tablet stand", "retail"
   → gap-detection-agent queries knowledge base
   → Shows: "Missing: placement, sizes, VESA?"
6. User types more details OR clicks "AI Expand"
7. AI expansion shows suggestions in chat-like interface
8. User reviews, edits, accepts
9. Field shows clean bullet points
10. Repeat for remaining 5 fields
11. All fields complete → "Generate Brief" button appears
12. Click → brief-generator creates final document
13. User reviews in-app, downloads, or saves to Drive
14. knowledge-base-builder learns patterns in background
```

### 7.2 Error Handling

| Error | Behavior | Recovery |
|-------|----------|----------|
| OAuth fails | Show error, fallback to manual retry | "Reconnect Google Workspace" button |
| AI timeout (>5s) | Show warning, allow manual editing | "Try again" or continue without AI |
| Redis unavailable | Warn user, continue without cache | Save to sessionStorage only |
| SQLite locked | Retry 3x with backoff | Queue knowledge update for later |
| Drive API fails | Warn user, offer local download | "Download to device" fallback |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Brief completion time | < 10 minutes | Timestamp: start → submit |
| AI expansion usage | > 60% of fields | Track "AI Expand" clicks |
| Knowledge base hit rate | > 70% pattern matches | Cache hits / total queries |
| User satisfaction | > 4/5 rating | Post-submission survey |
| Brief download rate | > 80% | Downloads / completed briefs |
| OAuth success rate | > 95% | Successful logins / attempts |

---

## 9. Out of Scope (v1.0)

- Full MRD generation (exists in main app)
- Competitive research (exists in main app)
- Multi-user collaboration (real-time editing)
- Version history / revision tracking
- Approval workflows
- Integration with ERP/PLM systems
- Mobile native app (web is responsive)
- Multi-language support

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LangExtract accuracy low | High | Fallback to manual editing, learn from corrections |
| Google OAuth rate limits | Medium | Monitor quota, implement backoff, upgrade plan if needed |
| Knowledge base overfits | Medium | Regular pattern pruning, confidence thresholds |
| User adoption low | High | Training sessions, intuitive UI, clear value prop |
| Redis memory limits | Medium | Implement LRU eviction, monitor usage |
| Drive sync failures | Low | Retry logic, local backup, user notification |

---

## 11. Implementation Timeline

| Phase | Scope | Duration | Deliverables |
|-------|-------|----------|--------------|
| **Phase 1 (Foundation)** | Agent architecture, LangExtract integration, basic UI | 2-3 weeks | Working 6-field form, basic extraction |
| **Phase 2 (Intelligence)** | Gap detection, knowledge base, expansion agent | 2-3 weeks | Smart suggestions, AI expansion, pattern learning |
| **Phase 3 (Polish)** | Brief generation, OAuth, Drive integration | 2 weeks | Complete workflow, authentication, storage |
| **Phase 4 (Beta)** | Testing, refinement, documentation | 1 week | Production-ready, user docs |

**Total: 7-9 weeks**

---

## 12. Dependencies

### External
- **LangExtract** - Google's Gemini-powered extraction library
- **Google Cloud APIs** - OAuth 2.0, Drive API
- **Redis** - In-memory cache (can use Redis Cloud or self-host)
- **SQLite** - Included with Node.js

### Internal
- **Existing design tokens** - `styles/tokens/tokens.json`
- **Provider abstraction** - `lib/providers/` (Gemini, Claude, OpenAI)
- **Agent architecture** - `agent/core/` (BaseAgent, ExecutionContext)
- **Existing components** - Can reuse ChipSelect, buttons, inputs

---

## 13. Open Questions

1. **Competition field (future):**
   - Add now or later?
   - **Decision:** Add placeholder in UI, mark as "Coming Soon", implement in Phase 5

2. **Collaboration features:**
   - Should multiple users edit same brief?
   - **Decision:** V1.0 is single-user, V2.0 considers real-time collab

3. **Knowledge base privacy:**
   - How to handle sensitive product data?
   - **Decision:** Anonymize patterns, add opt-out toggle, separate per-tenant if needed

4. **LangExtract vs custom prompt:**
   - Use LangExtract library or custom Gemini prompts?
   - **Decision:** Start with LangExtract for POC, can switch to custom later if needed

5. **Redis hosting:**
   - Self-host or cloud (Redis Cloud, Upstash)?
   - **Decision:** POC uses local Redis, production uses Redis Cloud for simplicity

---

## Appendix A: Field Definitions

### Field 1: What
**Purpose:** Product description
**Required sub-fields:**
- Product type (stand, mount, enclosure, lock, charger)
- Primary function
- Key differentiators

### Field 2: Who
**Purpose:** Target users/customers
**Required sub-fields:**
- User personas (IT admin, retail manager, end consumer)
- Company size (SMB, Enterprise)
- Industry vertical (retail, hospitality, healthcare, education)

### Field 3: Where
**Purpose:** Use environment
**Required sub-fields:**
- Physical location (desk, wall, floor, mobile)
- Environment (indoor, outdoor, secure area)
- Specific use cases (POS, kiosk, conference room)

### Field 4: MOQ (Minimum Order Quantity)
**Purpose:** Volume expectations
**Impact:** Informs design approach (tooling, materials, customization)
**Typical ranges:**
- Low: 100-500 units (custom/premium)
- Medium: 500-2,000 units (standard product)
- High: 2,000+ units (mass market)

### Field 5: Must-Have Features
**Purpose:** Non-negotiable requirements
**Examples:**
- VESA 75x75 compatibility
- Cable management
- Tool-free installation
- Adjustable viewing angle
- Security lock

### Field 6: Nice-to-Have Features
**Purpose:** Optional enhancements
**Examples:**
- RGB lighting
- Wireless charging
- Integrated speakers
- Multiple color options
- Premium materials

---

## Appendix B: Design Token Extensions

**New tokens needed for Brief Helper UI:**

```json
{
  "component": {
    "text-box": {
      "bg-idle": { "$value": "var(--surface)" },
      "bg-active": { "$value": "var(--surface)" },
      "bg-ai-processing": { "$value": "rgba(15, 118, 110, 0.04)" },
      "border-idle": { "$value": "var(--border)" },
      "border-active": { "$value": "var(--accent)" },
      "border-error": { "$value": "var(--error)" },
      "min-height": { "$value": "120px" },
      "ai-badge-bg": { "$value": "var(--accent-soft)" },
      "ai-badge-color": { "$value": "var(--accent)" }
    },
    "gap-suggestion": {
      "bg": { "$value": "var(--warning-soft)" },
      "border": { "$value": "var(--warning)" },
      "color": { "$value": "var(--warning)" },
      "icon-color": { "$value": "var(--warning)" }
    },
    "field-complete-badge": {
      "bg": { "$value": "var(--success-soft)" },
      "color": { "$value": "var(--success)" }
    }
  }
}
```

---

*Cross-reference: Agent behavioral contracts in `docs/AGENT.md`. Design system extensions in `docs/plans/2026-02-11-simplified-brief-helper-design-system.md`.*
