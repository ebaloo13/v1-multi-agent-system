# B2B Automation Runtime

[![CI](https://github.com/ebaloo13/b2b-automation-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/ebaloo13/b2b-automation-runtime/actions/workflows/ci.yml)

AI operations workspace for small businesses. The repository currently combines a client-facing workspace, a separate internal operations workspace, file-backed local runtime state, validated schemas, provider-neutral agent runners, and GitHub Actions CI.

## Product Direction

The client-facing workspace is intentionally simple and non-technical. It should focus on the operational areas a small business expects to manage:

- Inbox
- WorkItems / Tasks
- Payments
- Schedule
- Files
- Settings

Internal operations are separate under `/internal/:clientSlug`. Internal views can expose diagnostics, run history, agent boards, artifacts, implementation details, and review tooling that should not appear in the client workspace.

Pre-audit remains a lead acquisition hook. It can collect website facts, generate a diagnostic output, and seed Business Context, but it is not the core client platform.

## Client Workspace

The client workspace is a simple operational surface backed by real local WorkItems. It includes:

- A client request funnel with status-backed columns.
- WorkItem cards persisted in local client data files.
- Reviews and Files views derived from real WorkItems.
- A request drawer for stage movement, assistant conversations, and suggested actions.
- No mock client fallbacks in the active workspace path.

## Funnels

Client funnels are file-backed and persisted per client at `data/clients/<clientSlug>-funnels.json`.

- The default WorkItem funnel is status-backed.
- Stage name and description are editable.
- Stage type/state is editable: `open`, `won`, `lost`, or `closed`.
- Each stage can define an `assistantKey`.
- Each stage can define an `automationPolicy`.
- Empty stages can be added, reordered, and deleted.
- Safe delete blocks stages that currently contain WorkItems.

## WorkItem Assistants

Each funnel stage can have an assigned assistant. Opening a WorkItem card drawer loads a persisted conversation thread for that WorkItem and lets the user send messages to the current stage assistant.

Provider-backed assistant runs return validated structured output. Assistant results and conversation messages are persisted locally. Assistants can suggest structured actions, including `move_stage`; those actions are applied only after a human clicks Apply.

## Architecture

- `src/schemas/` contains the core Zod schemas and shared domain contracts.
- `src/shared/` contains shared utilities used across workflows and apps.
- `src/runtime/` contains runtime utilities, tool abstractions, the provider-neutral `AgentRunner` contract, and provider adapters such as the Claude SDK runner.
- `src/core/funnels/` contains local funnel persistence and stage editing behavior.
- `src/core/work-items/` contains local WorkItem, assistant result, and conversation persistence.
- `src/agents/` contains current agent entrypoints.
- `src/agents/work-item-assistant-agent.ts` contains the stage assistant prompt and structured output parsing.
- `apps/web/` contains the TanStack Start UX layer.
- `apps/web/src/lib/client-work-items.functions.ts` contains server functions used by the client workspace.
- `apps/web/src/components/ClientWorkspaceApp.tsx` contains the client workspace UI.
- `data/clients/` and `artifacts/clients/` hold local file-backed workflow state and outputs.
- `.github/workflows/ci.yml` defines GitHub Actions CI.

Business-specific behavior should be implemented through reusable modules and vertical packs. Avoid hardcoding one vertical as its own app when the behavior can be represented as module configuration, schema extensions, routing policy, or a vertical pack.

## Agent Model

Agents should be organized as domain coordinators plus specialist agents. Coordinators route and sequence work inside a domain; specialists handle narrower tasks such as collections, sales, scheduling, file review, or implementation support.

Technical and coding agents are internal implementation capabilities. They should not be presented as client-facing product agents.

## Existing Workflow Notes

The repository still includes preaudit, audit, orchestrator, collections, sales, and operations workflows. These should be interpreted through the newer operations workspace direction:

- Preaudit is for lead acquisition and initial Business Context.
- Audit is a diagnostic input into internal operations and work planning.
- Orchestrator behavior should evolve toward domain coordination.
- Specialist agents should support reusable business modules.
- Collections, sales, operations, and orchestrator agents execute model calls through runtime runner adapters instead of importing provider SDKs directly.

Legacy implementation terms such as `intake` and `artifacts` still appear in paths, flags, and metadata. Product-facing language should prefer **Business Context** and **Outputs** where relevant.

## Running Locally

Install root dependencies:

```bash
npm install
```

Run the web app from the repository root:

```bash
npm run dev
```

The root `npm run dev` command launches `apps/web`.

Run checks:

```bash
npm run check
```

Run tests:

```bash
npm test
```

`npm test` runs deterministic validation and agent tests with faux runners and temporary artifact directories. Those tests do not call provider APIs or spend tokens.

Provider-backed demo and batch scripts are available for selected workflows. Batch scripts require cost guards where implemented, including `--confirm-provider-cost`, `--max-runs=N`, a default of 1 run, and a cap of 5 runs.

```bash
npm run collections:batch -- --confirm-provider-cost --max-runs=1
```

## Current Status

This is still a local, file-backed lab environment.

- There is no autonomous stage movement without a human Apply action.
- Slack and WhatsApp integrations are not implemented yet.
- Drag-and-drop funnel editing is not implemented yet.
- Production authentication and database persistence are not implemented yet.
- Local data files are ignored runtime state.
- Provider-backed demo and batch scripts should be run only with the available cost guards.
