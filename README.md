# B2B Automation Runtime

AI operations workspace for small businesses. The repository currently combines local TypeScript agent workflows, validated schemas, deterministic utilities, and a web UX for client and internal operations surfaces.

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

## Architecture

- `src/schemas/` contains the core Zod schemas and shared domain contracts.
- `src/shared/` contains shared utilities used across workflows and apps.
- `src/runtime/` contains runtime utilities, tool abstractions, the provider-neutral `AgentRunner` contract, and provider adapters such as the Claude SDK runner.
- `src/agents/` contains current agent entrypoints.
- `apps/web/` contains the TanStack Start UX layer.
- `data/clients/` and `artifacts/clients/` hold local file-backed workflow state and outputs.

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

Run the lead pre-audit hook:

```bash
npm run preaudit:demo
```

Run the root type check from the repository root:

```bash
npm run check
```

`npm test` runs deterministic validation and agent tests with faux runners and temporary artifact directories. Those tests do not call provider APIs or spend tokens.

Run the web app:

```bash
cd apps/web
corepack pnpm dev
```

## Current Status

This is still a local, file-backed lab environment. It does not yet provide production authentication, database persistence, real email delivery, CRM integrations, or production-safe multi-user access control.
