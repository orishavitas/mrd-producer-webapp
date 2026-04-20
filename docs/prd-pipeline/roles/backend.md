# Backend Developer Role File
# Agents · Provider Abstraction · Pipeline Wiring

<!-- @MENTOR:CONTEXT Read after CLAUDE.md and architecture/agent-chain.md.
     Your job is implementing the four PRD agents and the DevLog spawn logic.
     You inherit the existing provider abstraction and agent base class.
     Do not reinvent infrastructure — extend what exists. -->

---

## YOUR SCOPE

You own:
- All four PRD agent implementations (`src/lib/agents/prd/`)
- DevLog spawn logic
- Pipeline orchestration function (`/api/pipeline/start`)
- Agent prompt engineering and iteration
- Provider abstraction usage (not modification)

You do NOT own:
- Database schema (system engineer)
- UI components (frontend)
- Frame HTML templates (UI/UX)
- API route setup beyond the pipeline endpoint (system engineer)

---

## FILE STRUCTURE TO CREATE

```
src/lib/agents/prd/
  ├── index.ts             ← exports all agents + orchestrator
  ├── agent1-intake.ts     ← MRD intake extractor
  ├── agent2-structure.ts  ← PRD skeleton builder
  ├── agent3-writer.ts     ← PRD content generator
  ├── agent4-review.ts     ← gap checker + validator
  ├── devlog-spawn.ts      ← DevLog artifact creator
  ├── prompts/
  │   ├── intake.ts        ← system + user prompts for Agent 1
  │   ├── structure.ts     ← prompts for Agent 2
  │   ├── writer.ts        ← prompts for Agent 3
  │   └── review.ts        ← prompts for Agent 4
  └── types.ts             ← all agent input/output TypeScript types
```

---

## EXTENDING THE AGENT BASE CLASS

```typescript
// src/lib/agents/prd/base-prd-agent.ts
import { BaseAgent } from '@/lib/agents/base';  // existing base class
import { db } from '@/db/client';

export abstract class BasePRDAgent extends BaseAgent {
  protected async logPipelineEvent(
    run_id: string,
    stage: string,
    data: Record<string, unknown>
  ) {
    // append to pipeline_runs table
    await db.pipelineRuns.update({
      where: { id: run_id },
      data: { [`agent_${stage}_output`]: data }
    });
  }
}
```

Match the pattern from the existing base class exactly.
Check `src/lib/agents/base.ts` before writing anything.

---

## AGENT IMPLEMENTATION PATTERN

Each agent follows the same pattern:

```typescript
// src/lib/agents/prd/agent1-intake.ts
import { BasePRDAgent } from './base-prd-agent';
import { intakeSystemPrompt, buildIntakeUserPrompt } from './prompts/intake';
import type { MRDIntakeInput, MRDIntakeOutput } from './types';

export class MRDIntakeAgent extends BasePRDAgent {
  async run(input: MRDIntakeInput): Promise<MRDIntakeOutput> {
    const response = await this.provider.complete({
      model: 'claude-sonnet-4-5',   // never change this without discussing
      system: intakeSystemPrompt,
      messages: [{ role: 'user', content: buildIntakeUserPrompt(input) }],
      max_tokens: 2048,
      temperature: 0.1,
    });

    const parsed = this.parseJSON<MRDIntakeOutput>(response);
    this.validate(parsed);           // throw if schema invalid
    return parsed;
  }

  private validate(output: MRDIntakeOutput): void {
    if (output.goals.length < 3) throw new Error('Intake: insufficient goals');
    if (output.confidence < 0.7) console.warn(`Low intake confidence: ${output.confidence}`);
    if (output.gaps.length > 5) throw new Error('Intake: too many gaps, MRD needs enrichment');
  }
}
```

---

## PROMPT ENGINEERING GUIDELINES

<!-- @MENTOR:GUARD These rules apply to all agent prompts in this pipeline -->

1. **System prompt = persona + rules + output contract.** Always include all three.
2. **End every system prompt with:** `"Return ONLY valid JSON matching the [X] schema. No preamble, no explanation, no markdown code fences."`
3. **User prompt = data only.** Pass structured data, not instructions. Instructions live in system prompt.
4. **Temperature discipline:**
   - Agent 1 (Intake): 0.1 — factual extraction
   - Agent 2 (Structure): 0.1 — deterministic mapping
   - Agent 3 (Writing): 0.2 — slight variation allowed for prose quality
   - Agent 4 (Review): 0.0 — deterministic validation
5. **Grounding over generation.** Agent 3 prompts must include the full MRD context as grounding. Every generated requirement must be traceable to MRD content.

---

## LOOP AND RETRY LOGIC

```typescript
// src/lib/agents/prd/index.ts
export async function runPRDPipeline(mrd_id: string, run_id: string) {
  const mrd = await fetchMRD(mrd_id);

  // Agent 1
  const intake = await new MRDIntakeAgent().run({ mrd_id, mrd_json: mrd });

  // Agent 2
  const skeleton = await new PRDStructuringAgent().run({ intake });

  // Optional human gate (configurable)
  if (process.env.PIPELINE_HUMAN_REVIEW_GATE === 'true') {
    await pauseForHumanReview(run_id, skeleton);
    // polling loop — check DB flag every 30s
  }

  // Agent 3 + Agent 4 with retry
  let draft = await new PRDWritingAgent().run({ skeleton, intake, mrd_full: mrd });
  let review = await new PRDReviewAgent().run({ prd_output: draft, intake });
  let retries = 0;

  while (review.loop_required && retries < 2) {
    // Only re-run frames with critical gaps — not full regeneration
    const failedFrames = review.gaps
      .filter(g => g.severity === 'critical')
      .map(g => g.affected_frame);

    draft = await new PRDWritingAgent().run({
      skeleton, intake, mrd_full: mrd,
      retry_frames: failedFrames   // Agent 3 only rewrites these
    });
    review = await new PRDReviewAgent().run({ prd_output: draft, intake });
    retries++;
  }

  return { draft, review, intake };
}
```

---

## DEVLOG SPAWN

```typescript
// src/lib/agents/prd/devlog-spawn.ts
import { DEFAULT_HARDWARE_STAGES } from './types';

export async function spawnDevLog(
  prd: PRDWritingOutput,
  mrd_id: string
): Promise<string> {
  const devlog_id = crypto.randomUUID();

  await db.devlogDocuments.create({
    data: {
      id: devlog_id,
      prd_id: prd.prd_id,
      mrd_id,
      product_name: prd.frames.find(f => f.frame_type === 'header')?.data.product_name ?? '',
      stages_json: DEFAULT_HARDWARE_STAGES,
      feature_baseline_json: prd.feature_checklist,
    }
  });

  return devlog_id;
}

export const DEFAULT_HARDWARE_STAGES = [
  { id: 'concept',    name: 'Concept',    order: 1 },
  { id: 'proto1',     name: 'Proto 1',    order: 2 },
  { id: 'dfm',        name: 'DFM Review', order: 3 },
  { id: 'pilot',      name: 'Pilot Run',  order: 4 },
  { id: 'production', name: 'Production', order: 5 },
];
```

---

## PROVIDER ABSTRACTION USAGE

```typescript
// How to use the existing provider abstraction
// Do NOT import from anthropic SDK directly

import { getProvider } from '@/lib/ai/provider';

const provider = getProvider('anthropic');  // or 'openai' etc.
const response = await provider.complete({ model, system, messages, ... });
```

Check `src/lib/ai/provider.ts` for the exact interface before writing agent code.
The abstraction handles API keys, rate limiting, and retry logic already.

---

## TESTING REQUIREMENTS

Every agent needs:
1. **Unit test** — mock provider, test prompt construction + output parsing
2. **Validation test** — test that invalid agent output throws correctly
3. **Integration test** — run against a real MRD fixture (no live API calls — use recorded responses)

Test fixtures go in: `src/lib/agents/prd/__tests__/fixtures/`
Include: `sample-mrd.json`, `expected-intake.json`, `expected-skeleton.json`

Run with: `pnpm test src/lib/agents/prd`

---

## HANDOFF CHECKLIST

- [ ] All four agents implemented and unit tested
- [ ] Prompts reviewed for all four agents (at least one human review cycle)
- [ ] Loop logic tested with a real MRD
- [ ] DevLog spawn tested
- [ ] Pipeline run logs appearing in `pipeline_runs` table
- [ ] Hand off `/api/pipeline/start` to system engineer for webhook wiring
