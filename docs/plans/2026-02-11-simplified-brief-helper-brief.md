# Simplified Brief Helper - Executive Brief

> **Version:** 1.0
> **Date:** February 11, 2026
> **Status:** Design Phase

---

## What We're Building

An **intelligent form-based web app** that helps product teams capture structured product details with AI assistance. Think "fill-in-the-blanks with a smart assistant" - users type rough notes into 6 fields, and AI helps organize, expand, and structure the information into professional briefs.

---

## The Problem

Product details today are scattered across emails, notes, and spreadsheets in inconsistent formats. When someone says "tablet stand," critical specs are often missing (placement? sizes? VESA? mounting?). We waste time reformatting rough notes into documentation, and product knowledge stays trapped in people's heads.

---

## The Solution

### Six Structured Fields

1. **What** - Product description
2. **Who** - Target users/customers
3. **Where** - Use environment and cases
4. **MOQ** - Minimum order quantity (informs design approach)
5. **Must-Have Features** - Non-negotiable requirements
6. **Nice-to-Have Features** - Optional enhancements

### AI Assistance (3 Ways)

1. **Extract** - User types free-form text → AI converts to clean bullet points
2. **Detect Gaps** - AI recognizes "tablet stand" → suggests missing details (placement, sizes, VESA)
3. **Expand** - User clicks "AI Expand" → AI generates professional suggestions in chat-like interface

### Knowledge Base

The system **learns from every submission**:
- "Tablet stand" → always needs placement, sizes, VESA, mounting
- Company-specific terminology
- Common product patterns

Future submissions get **smarter suggestions** based on what the system has learned.

---

## How It Works

```
User types → Pause 2-3 sec → AI analyzes
                ↓
        Shows bullet points + gaps
                ↓
User fills gaps OR clicks "AI Expand"
                ↓
        Repeat for 6 fields
                ↓
        "Generate Brief" appears
                ↓
    Professional brief created
                ↓
Download / Save to Google Drive
```

---

## User's Own AI

**OAuth Google Workspace integration** means:
- Users sign in with their Google account
- App uses their **Gmail for Business Gemini** entitlement
- No API key management
- Users control their own AI quota
- Seamless single sign-on

---

## Storage Architecture

**Three-tier storage:**

1. **Redis** (in-memory cache)
   - Active sessions
   - Pattern cache
   - < 1ms response time

2. **SQLite** (persistent database)
   - Knowledge base
   - Historical patterns
   - Fast queries with indexes

3. **Google Drive** (document storage)
   - Completed briefs
   - Backups
   - Shareable with team

---

## Multi-Agent Architecture

Built on existing **MRD Producer agent system** (Phases 1-6 complete):

| Agent | Role | Responsibility |
|-------|------|----------------|
| `brief-orchestrator` | Coordinator | Manages entire workflow |
| `text-extraction-agent` | Processor | Uses LangExtract to parse text |
| `gap-detection-agent` | QA | Finds missing critical info |
| `expansion-agent` | Assistant | Generates professional text |
| `knowledge-base-builder` | Architect | Learns patterns over time |
| `brief-generator` | Generator | Creates final brief document |

**Integration with existing:**
- Reuses `BaseAgent`, `ExecutionContext`
- Leverages provider abstraction (Gemini, Claude, OpenAI)
- Built on design token system (`styles/tokens/`)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Brief completion time | < 10 minutes |
| AI expansion usage | > 60% of fields |
| Knowledge base hit rate | > 70% |
| User satisfaction | > 4/5 |
| OAuth success rate | > 95% |

---

## Timeline

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| **Phase 1** - Foundation | 2-3 weeks | Working 6-field form, basic extraction |
| **Phase 2** - Intelligence | 2-3 weeks | Gap detection, knowledge base, AI expansion |
| **Phase 3** - Polish | 2 weeks | Brief generation, OAuth, Drive sync |
| **Phase 4** - Beta | 1 week | Production-ready with docs |

**Total: 7-9 weeks**

---

## Key Technologies

- **LangExtract** - Google's Gemini-powered extraction library
- **Redis** - In-memory cache for speed
- **SQLite** - Persistent knowledge base
- **Google OAuth 2.0** - Authentication + Drive API
- **Next.js 14 + React 18** - UI framework
- **Design Tokens (DTCG)** - Consistent styling

---

## What's Different from Main App?

| Feature | Main MRD Producer | Brief Helper |
|---------|-------------------|--------------|
| **Purpose** | Full market research → 12-section MRD | Quick product detail capture → Simplified brief |
| **Stage** | Early concept, needs research | **Past research phase** |
| **Depth** | Deep competitive analysis, trends, pricing | Basic structured details |
| **Output** | 12-section MRD (3-5 pages) | Simplified brief (1 page) |
| **Time** | 30-60 minutes | < 10 minutes |

**They complement each other:**
- Use **MRD Producer** for new concepts needing research
- Use **Brief Helper** for products past research needing quick documentation

---

## Out of Scope (v1.0)

- Full MRD generation (use main app)
- Competitive research (use main app)
- Real-time collaboration
- Version history
- Approval workflows
- Mobile native app (web is responsive)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LangExtract accuracy low | Fallback to manual editing, learn from corrections |
| Google OAuth rate limits | Monitor quota, implement backoff |
| Knowledge base overfits | Regular pattern pruning, confidence thresholds |
| Low user adoption | Training, intuitive UI, clear value prop |

---

## Open Questions

1. **Competition field** - Add now or Phase 5?
   - **Lean:** Phase 5 (focus on core 6 fields first)

2. **Redis hosting** - Self-host or cloud?
   - **Lean:** Local for POC, Redis Cloud for production

3. **Knowledge base privacy** - Sensitive product data?
   - **Lean:** Anonymize patterns, add opt-out toggle

4. **LangExtract vs custom** - Library or custom prompts?
   - **Lean:** LangExtract for POC (faster), can switch later

---

## Next Steps

1. **Review this brief** - Get stakeholder alignment
2. **Create design system** - Extend existing tokens for new components
3. **Write implementation plan** - Break into tasks with AgentOS patterns
4. **Set up git worktree** - Isolated workspace for development
5. **Phase 1 kickoff** - Start with agent architecture + basic UI

---

*Related docs:*
- *Full PRD:* `docs/plans/2026-02-11-simplified-brief-helper-PRD.md`
- *Design System:* `docs/plans/2026-02-11-simplified-brief-helper-design-system.md`
- *Existing AGENT.md:* `docs/AGENT.md`
- *Design Tokens:* `styles/tokens/tokens.json`
