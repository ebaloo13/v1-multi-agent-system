# `apps/web`

TanStack Start UX layer for the local B2B audit product shell.

This frontend is now split into two product layers:

- public landing and lead capture at `/`
- client workspace shell under `/workspace/$clientSlug`

The repo-root agent engine is unchanged. This app still invokes the existing
local scripts and reads or writes the same file-backed workflow artifacts.

## Local Dev Runtime

For local `pnpm dev`, the app now runs without the Cloudflare Vite plugin so
TanStack Start server work executes in a Node-compatible environment. This is
intentional for now because the current workflow bridge needs direct filesystem
and child-process access to the repo-root engine.

Production-oriented builds still keep the Cloudflare plugin enabled.

## Current Route Structure

- `/`
  Business-facing marketing landing page with website + email capture.
- `/workspace/$clientSlug`
  Workspace v2 dashboard for stage, next action, workstreams, and readiness.
- `/workspace/$clientSlug/diagnosis`
  Unified diagnosis hub for preaudit, intake, and audit material.
- `/workspace/$clientSlug/workstreams`
  Workstreams hub that turns findings into active consulting tracks.
- `/workspace/$clientSlug/agents`
  Agent gallery and readiness surface for client-specific execution modules.

Legacy routes still exist as compatibility redirects:

- `/preaudit-result`
- `/audit-intake`
- `/audit-result`
- `/workspace/$clientSlug/preaudit`
- `/workspace/$clientSlug/intake`
- `/workspace/$clientSlug/audit`

## Current Flow

`landing -> preaudit:live -> workspace/diagnosis -> audit:live -> workstreams / agents`

Concretely:

1. A prospect submits `website URL + email` on `/`.
2. The app runs the existing repo-root preaudit workflow.
3. The app stores lightweight client context locally in
   `data/clients/<client-slug>-workspace.json`.
4. The app redirects into the client workspace and continues using the same
   artifact and intake files that already exist in the repo workflow.
5. Diagnosis acts as the operational hub for preaudit, intake editing, and
   audit review.
6. Workstreams and Agents turn those findings into a more scalable product
   model for future execution.

## Local Persistence

There is still:

- no auth
- no database
- no real email delivery
- no CRM integration
- no production-safe multi-user persistence

The app depends on local files only:

- `artifacts/clients/<client-slug>/preaudit/...`
- `artifacts/clients/<client-slug>/audit/...`
- `data/clients/<client-slug>-audit-intake.draft.json`
- `data/clients/<client-slug>-audit-intake.json`
- `data/clients/<client-slug>-workspace.json`

`*-workspace.json` is the lightweight client association file used by the UX
layer. It currently stores:

- `client_slug`
- `client_name`
- `website`
- `email`
- `created_at`
- `updated_at`

This exists only so a free preaudit submission can be linked to a client
workspace until a real backend is added.

## Architectural Constraints Kept

- `apps/web` remains UX-only.
- The repo-root engine was not moved or rewritten.
- Existing `preaudit:live` and `audit:live` scripts are still the workflow
  bridge.
- Existing artifacts and intake JSON remain the source of truth.
- Public navigation and workspace navigation are separated so dead or
  misleading links are not exposed.
- Workspace v2 uses a new navigation model:
  `Dashboard / Diagnosis / Workstreams / Agents`
- Future-facing sections remain visible but non-interactive:
  `Playbooks / Reports / Activity`

## Production Gaps

To make this production-ready, the next major pieces are:

1. Real backend persistence for leads, clients, and workflow state.
2. Authentication and client-specific access control for `/workspace/*`.
3. Real email sending or CRM handoff for captured leads.
4. A proper multi-user audit history model instead of local files.
5. Decisions about whether to keep or remove legacy redirect routes once public
   links are updated.

## Run Locally

```bash
cd apps/web
corepack pnpm dev
```
