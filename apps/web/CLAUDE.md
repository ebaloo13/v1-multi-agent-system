# Frontend App Context

This directory contains the TanStack Start frontend shell for the product UX.
It is not the agent engine.

## Product Layers

The web app is intentionally split into two layers:

- Public layer:
  marketing, positioning, lead capture, and free preaudit entry at `/`
- Client workspace layer:
  Workspace v2 under `/workspace/$clientSlug`

Workspace v2 is organized around:

- `Dashboard`
- `Diagnosis`
- `Workstreams`
- `Agents`

Visible future-facing sections may appear as `Soon`, but they should not route
to broken pages:

- `Playbooks`
- `Reports`
- `Activity`

Legacy standalone workflow routes remain only as compatibility redirects.

Naming convention:

- Client-facing label: **Business Context**
- Spanish reference: **Contexto del negocio**
- Internal legacy term: `intake`, still used by existing file names, route paths, and workflow flags

## Scope

- Keep work inside `apps/web` unless a very small repo-level metadata change is
  required.
- Do not restructure or relocate the repo-root engine.
- Do not move or rewrite existing root `src/`, `scripts/`, `docs/`, `data/`,
  or `artifacts/` trees from here.

## Workflow Boundary

The app still bridges into the existing local workflow:

`landing -> preaudit:live -> workspace/diagnosis -> audit:live`

The server-function bridge:

- invokes the existing live scripts from the repo root
- reads `artifacts/clients/<client-slug>/<agent>/latest.json`
- reads per-run `run.json` and `report.md`
- reads and writes `data/clients/*audit-intake*.json` as the legacy storage format for Business Context
- stores lightweight local client context in `data/clients/*-workspace.json`

Local dev currently runs this bridge in a Node-compatible Vite/TanStack Start
path so filesystem access works against the existing repo workflow. Treat that
as a temporary development adapter, not the long-term production architecture.

## Local Client Context

There is still no real auth, email delivery, or backend CRM model.

For now, the public landing captures `website + email` and stores that email in
a local workspace context file so the client workspace can show the linked lead
record.

Keep this simple and swappable. Do not overbuild a second persistence layer.

## Source Of Truth

Use these docs when changing UX or form structure:

- `../../docs/product/audit-intake-form.md` (Business Context form; filename is legacy)
- `../../docs/product/preaudit-to-audit-flow.md`

Treat the existing file workflow as the source of truth. The frontend should
present it more clearly, not replace it.

## Implementation Notes

- Preserve TanStack Start conventions already scaffolded here.
- Keep public copy business-facing and easy to understand.
- Keep workspace copy structured, calm, and operational.
- Treat the workspace as a client operating system, not a report page.
- Reduce duplication aggressively by keeping shared client metadata and primary
  next-action framing at the shell level.
- Keep public navigation and workspace navigation separate.
- Do not expose broken routes or fake sections.
- Avoid inventing internal business facts in the Business Context draft. Only prefill
  what public-site evidence could plausibly support.
- Diagnosis is the hub for preaudit, Business Context, and audit. Older workspace routes
  can redirect into it when needed.
- Workstreams and Agents should stay connected to the real workflow artifacts
  and audit conclusions, even if execution is still future-facing.

## Current Limitations

- no real authentication
- no production persistence
- no email sending
- no CRM integrations
- local-first behavior only
