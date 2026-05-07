# Runtime

Execution utilities live here, including helpers for coordinating runs, jobs, tools, and platform-level process behavior.

- `agentRunner.ts` defines the provider-neutral `AgentRunner` contract used by agent entrypoints and deterministic tests.
- `claudeAgentRunner.ts` is the Claude Agent SDK adapter. It owns SDK imports, stream iteration, terminal result extraction, and current Claude settings.
- Agent business logic should depend on `AgentRunner`, not provider SDK types.
