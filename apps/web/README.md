# `apps/web`

TanStack Start UX layer for the AI operations workspace.

The web app has two product surfaces:

- Client-facing workspace under `/workspace/$clientSlug`.
- Internal ops workspace under `/internal/$clientSlug`.

The repo-root agent engine is unchanged. This app still invokes existing local workflows and reads or writes the same file-backed state and outputs.

## Product Direction

The client workspace should stay simple, non-technical, and operations-focused:

- Inbox
- WorkItems / Tasks
- Payments
- Schedule
- Files
- Settings

The internal ops workspace can expose diagnostics, run history, agent boards, review tools, artifacts, and implementation details. Client-facing routes should not depend on internal-only concepts.

Pre-audit is a lead acquisition hook. It can capture a prospect, run the existing diagnostic flow, and seed Business Context, but it is not part of the core client platform.

## Platform Model

The product is a horizontal AI operations workspace for small businesses, not a vertical-specific app. Business-specific behavior should layer in through reusable modules and vertical packs instead of being hardcoded into the core workspace.

`WorkItem` is the shared operational object for requests, messages, leads, tasks, payments, bookings, events, confirmations, file reviews, and support items.

Core schemas live at the repository root in `src/schemas`. Shared and runtime utilities live under `src/shared` and `src/runtime`.

## Current Route Shape

- `/`
  Public landing and lead capture.
- `/workspace/$clientSlug`
  Client-facing workspace shell.
- `/workspace/$clientSlug/files`
  Client-facing file surface.
- `/workspace/$clientSlug/settings`
  Client-facing settings surface.
- `/internal/$clientSlug`
  Internal operations workspace.
- `/internal/$clientSlug/*`
  Internal diagnostics, workstreams, agents, reviews, artifacts, activity, impact, and run history.

Legacy compatibility routes still exist, including older preaudit, audit, intake, diagnosis, workstreams, and agent routes. These route names are implementation compatibility paths, not preferred product labels.

## Local Persistence

There is still:

- no auth
- no database
- no real email delivery
- no CRM integration
- no production-safe multi-user persistence

The app depends on local files only:

- `artifacts/clients/<client-slug>/...`
- `data/clients/<client-slug>-audit-intake.draft.json`
- `data/clients/<client-slug>-audit-intake.json`
- `data/clients/<client-slug>-workspace.json`

Legacy terms such as `intake` and `artifacts` remain in implementation paths. Product-facing language should prefer **Business Context** and **Outputs** where relevant.

## Architectural Constraints

- `apps/web` remains UX-only.
- The repo-root engine was not moved or rewritten.
- Existing local workflows remain the bridge to agent execution.
- Client and internal navigation must remain clearly separated.
- Technical/coding agents are internal implementation capabilities, not client-facing product agents.

## Run Locally

```bash
cd apps/web
corepack pnpm dev
```
