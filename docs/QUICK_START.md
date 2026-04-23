# Quick Start — Multi-Agent System

## Run the MRD Orchestrator

```typescript
import { MRDOrchestratorAgent } from '@/agent/orchestrators/mrd-orchestrator';
import { createExecutionContext } from '@/agent/core/execution-context';
import { loadAgentConfig } from '@/agent/core/config-loader';

const config = await loadAgentConfig();
const context = createExecutionContext({ requestId: 'req-123', config });
const orchestrator = new MRDOrchestratorAgent();

const result = await orchestrator.execute(
  { productConcept: 'AI-powered smart thermostat', targetMarket: 'Residential homeowners', additionalDetails: 'Focus on energy savings' },
  context
);

if (result.success) console.log('MRD generated:', result.data.mrd);
```

## Run Research Agents

```typescript
import { ResearchOrchestratorAgent } from '@/agent/orchestrators/research-orchestrator';

const result = await new ResearchOrchestratorAgent().execute(
  { productConcept: 'Smart thermostat', targetMarket: 'Residential homeowners', clarifications: [] },
  context
);

// result.data.research.competitive | .trends | .pricing | .sources
```

## Use Provider Chain

```typescript
import { getProviderChain } from '@/lib/providers/provider-chain';

const { result, providerUsed } = await getProviderChain().executeWithFallback(
  async (provider) => provider.generateText('Analyze the smart home market', 'You are a market research analyst')
);
```

## Create a New Agent

```typescript
import { BaseAgent } from '@/agent/core/base-agent';

class MyAgent extends BaseAgent<MyInput, MyOutput> {
  readonly id = 'my-agent';
  readonly name = 'My Custom Agent';
  readonly version = '1.0.0';
  readonly description = 'Does something specific';

  protected async executeCore(input: MyInput, context: ExecutionContext): Promise<MyOutput> {
    const response = await context.getProvider().generateText(this.buildPrompt(input), this.getSystemPrompt());
    return this.parseResponse(response);
  }
}
```
