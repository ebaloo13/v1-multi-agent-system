# Frontend App Context

This directory contains the TanStack Start frontend shell for the B2B audit
workflow. It is not the agent engine.

## Scope

- Keep work inside `apps/web` unless a small repo-level metadata change is
  explicitly required.
- Do not restructure the repo root engine.
- Do not move or rewrite the existing root `src/`, `scripts/`, `docs/`,
  `data/`, or `artifacts/` trees from here.

## Product Boundary

The UX flow represented here is:

`preaudit:live -> preaudit report -> audit intake form -> audit:live`

For now this app is a shell:

- route structure
- business-facing screen copy
- editable intake form shape
- placeholder audit output structure

It now includes a thin local server-function bridge that:

- invokes the existing live scripts from the repo root
- reads `artifacts/clients/<client-slug>/<agent>/latest.json`
- reads per-run `run.json` and `report.md`
- reads and writes `data/clients/*audit-intake*.json`

It still does not introduce a separate backend architecture.

## Source of Truth

Use these docs when changing UX or form structure:

- `../../docs/product/audit-intake-form.md`
- `../../docs/product/preaudit-to-audit-flow.md`

## Implementation Notes

- Preserve TanStack Start conventions already scaffolded here.
- Keep navigation and route structure simple unless a real integration requires
  more.
- Avoid inventing internal business facts in the intake draft. Only prefill
  what public-site evidence could plausibly support.
- Treat the repo file workflow as the source of truth. Avoid adding alternative
  persistence layers here.
