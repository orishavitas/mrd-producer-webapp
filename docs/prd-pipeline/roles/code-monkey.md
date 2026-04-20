# Code Monkey Task File
# Implementation Tasks · No Architecture Decisions Required

<!-- READ THIS FIRST: Your job is implementation, not design.
     Every task below is fully specced. If something is unclear,
     ask your team lead before deviating. Do not make architecture
     decisions — escalate them. -->

---

## RULES FOR THIS FILE

1. **Do exactly what the task says.** No more, no less.
2. **If a task says "match the existing pattern", find that pattern first.** Read the file it references before writing.
3. **If you're unsure about something, stop and ask.** Do not guess on implementation details.
4. **Every task has a "Done when" definition.** Only mark it done when that condition is met.
5. **Do not touch files outside your task's scope.**

---

## TASK GROUP A — Database Helpers

### A1: Create Drizzle schema file for PRD tables

**Read first:** `src/db/schema/mrd.ts` — match this pattern exactly.

**Create:** `src/db/schema/prd.ts`

Tables to define (SQL is in `roles/system-engineer.md`):
- `prd_documents`
- `prd_frames`
- `devlog_documents`
- `devlog_entries`
- `pipeline_runs`

**Done when:** `pnpm drizzle-kit generate` runs without errors and produces migration files.

---

### A2: Create DB query helpers

**Create:** `src/lib/db/prd.ts`

Implement these functions (use existing `src/lib/db/mrd.ts` as pattern):

```typescript
export async function getPRDById(id: string): Promise<PRDDocument | null>
export async function getPRDFrames(prd_id: string): Promise<FrameRecord[]>
export async function savePRD(data: PRDWritingOutput): Promise<string>  // returns prd_id
export async function getDevLogById(id: string): Promise<DevLogDocument | null>
export async function getDevLogEntries(devlog_id: string): Promise<DevLogEntry[]>
export async function appendDevLogEntry(entry: NewDevLogEntry): Promise<string>
export async function getPRDByMRDId(mrd_id: string): Promise<PRDDocument | null>
```

**Done when:** All functions exported, TypeScript compiles clean, and basic unit tests pass.

---

## TASK GROUP B — Agent Scaffolding

### B1: Scaffold Agent 1 file

**Read first:** `src/lib/agents/base.ts` AND `methodology/pipeline-logic.md` section "AGENT 1"

**Create:** `src/lib/agents/prd/agent1-intake.ts`

Scaffold only — class structure, constructor, `run()` method signature, input/output types imported.
Leave `run()` body as `throw new Error('not implemented')` for now.

**Done when:** File exists, TypeScript compiles, class is exported correctly.

---

### B2: Scaffold Agents 2, 3, 4

Same as B1 for:
- `src/lib/agents/prd/agent2-structure.ts`
- `src/lib/agents/prd/agent3-writer.ts`
- `src/lib/agents/prd/agent4-review.ts`

**Done when:** All four files exist, compile clean, exported correctly.

---

### B3: Create agent types file

**Read first:** `methodology/pipeline-logic.md` — all Input/Output interfaces.

**Create:** `src/lib/agents/prd/types.ts`

Export all TypeScript interfaces exactly as defined in the methodology file:
- `MRDIntakeInput`, `MRDIntakeOutput`
- `PRDStructuringInput`, `PRDSkeletonOutput`
- `PRDWritingInput`, `PRDWritingOutput`
- `PRDReviewInput`, `PRDReviewOutput`
- `DEFAULT_HARDWARE_STAGES` constant

**Done when:** All types exported, no TypeScript errors anywhere that imports them.

---

### B4: Create prompts directory

**Create:** `src/lib/agents/prd/prompts/`

Four files, each exports two functions:
- `[name]SystemPrompt(): string` — returns the system prompt string
- `build[Name]UserPrompt(input): string` — takes agent input, returns user prompt string

Copy system prompts verbatim from `methodology/pipeline-logic.md`.
User prompt functions should serialize the input as formatted JSON.

**Done when:** All four prompt files created, functions exported, no TypeScript errors.

---

## TASK GROUP C — API Route Scaffolding

### C1: Create pipeline start route

**Read first:** `roles/system-engineer.md` section "API CONTRACTS" → POST /api/pipeline/start

**Create:** `src/app/api/pipeline/start/route.ts`

Scaffold only:
```typescript
export async function POST(req: Request) {
  const { mrd_id } = await req.json();
  // TODO: wire to runPRDPipeline
  return Response.json({ status: 'not_implemented' }, { status: 501 });
}
```

**Done when:** Route exists, `pnpm dev` starts without errors, POST returns 501.

---

### C2: Create PRD fetch route

**Create:** `src/app/api/prd/[id]/route.ts`

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // TODO: wire to getPRDById + getPRDFrames
  return Response.json({ status: 'not_implemented' }, { status: 501 });
}
```

**Done when:** Route exists, responds 501.

---

### C3: Create DevLog fetch and entry routes

**Create:**
- `src/app/api/devlog/[id]/route.ts` — GET
- `src/app/api/devlog/[id]/entry/route.ts` — POST

Same scaffold pattern as C2.

**Done when:** Both routes exist, respond 501.

---

## TASK GROUP D — Frame Component Scaffolding

### D1: Scaffold all frame components

**Read first:** `roles/ui-ux.md` for visual specs. `roles/frontend.md` for component pattern.

**Create** these files in `src/components/frames/`:

Each file: one default export React component, accepts `{ data: unknown }` prop,
returns a placeholder `<div data-frame="[type]">Frame: [type]</div>` for now.

Files:
- `HeaderFrame.tsx`
- `OverviewFrame.tsx`
- `GoalsFrame.tsx`
- `ScopeFrame.tsx`
- `EnvironmentsFrame.tsx`
- `RequirementsFrame.tsx`
- `AcceptanceFrame.tsx`
- `AssumptionsFrame.tsx`
- `ChecklistFrame.tsx`
- `StageResolutionFrame.tsx`
- `DecisionLogFrame.tsx`

**Done when:** All 11 files exist, `FrameRenderer.tsx` can import all of them without errors.

---

### D2: Create FrameRenderer dispatch component

**Read first:** `roles/frontend.md` section "FRAME RENDERER ARCHITECTURE"

**Create:** `src/components/frames/FrameRenderer.tsx`

Wire up the FRAME_MAP and the render dispatch. Use the scaffold components from D1.

**Done when:** Component renders without errors for all 11 frame types.

---

## TASK GROUP E — Page Scaffolding

### E1: Create PRD page

**Create:** `src/app/prd/[id]/page.tsx`

```tsx
export default async function PRDPage({ params }: { params: { id: string } }) {
  return <div>PRD page for {params.id} — not implemented</div>;
}
```

**Done when:** Navigating to `/prd/test` shows the placeholder, no errors.

---

### E2: Create DevLog page

Same as E1 for `src/app/devlog/[id]/page.tsx`.

---

## ESCALATION CHECKLIST

If you hit any of these, stop and escalate to your team lead:

- TypeScript errors in files you didn't create
- A task requires changing a file not mentioned in the task
- The "pattern to match" doesn't exist where the task says it should
- Two tasks seem to conflict with each other
- A task would require you to make a design or architecture decision

Do not push broken code. Do not guess. Escalate.
