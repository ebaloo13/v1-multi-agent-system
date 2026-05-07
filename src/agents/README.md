# Agents

Domain coordinators and specialist agents live here. Existing flat agent files remain in place until a future migration moves logic into these domain folders.

Collections, sales, operations, and orchestrator agents use the provider-neutral `AgentRunner` contract from `src/runtime/agentRunner.ts` and default to the Claude adapter in `src/runtime/claudeAgentRunner.ts`.

Those agents accept injectable runner and `runDir` seams where applicable, so deterministic tests can use faux runners and temporary artifact directories without calling provider SDKs.
