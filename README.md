# Claude Agent B2B Lab

TypeScript multi-agent system for AI-driven SME consulting workflows. The current system combines live preaudit fact collection, structured audit ingestion, validated agent outputs, and per-run artifacts designed for traceability rather than autonomous execution.

## Current flow

`preaudit:live` -> `preaudit:report` -> Business Context draft (`*-audit-intake.draft.json`) -> `audit:live` -> `orchestrator` -> specialized agents

Naming convention:

- Client-facing label: **Business Context**
- Spanish reference: **Contexto del negocio**
- Internal legacy term: `intake`, still used by existing file names and CLI flags

- **Preaudit** can analyze a real public website URL, apply deterministic scoring, and add a prudence layer for site fit.
- **Preaudit report** generates a client-facing Markdown summary from validated output.
- **Business Context draft** is generated automatically after a successful live preaudit so the next audit stage starts with prefilled context.
- **Audit live** can run from structured real-world input built from Business Context + preaudit facts.
- **Orchestrator** still runs after audit and activates the relevant specialist agents.

## Architecture

- `preaudit-agent` and `audit-agent` use **`pi-ai`**
- `orchestrator-agent`, `collections-agent`, `sales-agent`, and `operations-agent` use the **Claude Agent SDK**

This is intentional: fast diagnostic stages use a provider-agnostic layer, while orchestration and execution remain on the Claude SDK.

## Live capabilities

- `preaudit:live` fetches one public website URL through a deterministic business tool harness
- `preaudit:live` writes a live input record under `data/clients/`
- `preaudit:live` generates an editable Business Context draft for the next stage
- `preaudit:report` writes `report.md` for the latest preaudit run
- `audit:live` builds normalized stage-1 audit input from confirmed Business Context plus optional preaudit context

## Scope note

The preaudit framework is optimized for SME, lead-generation, and service-business websites. It is not a browser automation or full technical crawl system. For enterprise, global, or platform-like sites, the system may soften conclusions through:

- `site_type`
- `framework_fit`
- `scope_confidence`

Reports may include scope warnings when the site falls outside the intended SME/service scope.

## Tool harness

The current live preaudit tool harness is deterministic and runner-controlled. It is not model-invoked and it is not a generic coding-agent system.

Current tools:

- `fetch_web_page`
- `extract_social_profiles`
- `detect_tracking_markers`

Not included:

- bash access
- edit/write tools for the model
- browser automation

## Artifacts

New preaudit and audit artifacts are stored under:

`artifacts/clients/<client-slug>/<agent>/<display-run-id>/`

Examples:

- `artifacts/clients/morales-propiedades/preaudit/preaudit-morales-propiedades-0001/`
- `artifacts/clients/morales-propiedades/audit/audit-morales-propiedades-0001/`

Each client/agent folder also stores `latest.json` pointing to the latest run for that client and agent.

Internal `run_id` is still preserved inside `run.json`. Historical folders under `artifacts/runs/` remain legacy and are not migrated automatically.

## Key paths

- `src/tools/` — deterministic preaudit tool harness
- `src/audit/ingestion/` — stage-1 audit ingestion modules
- `data/mock/` — demo fixtures
- `data/clients/` — editable live inputs, generated drafts, and structured audit inputs
- `artifacts/clients/` — human-readable client-grouped preaudit and audit artifacts

## Scripts

- `npm run preaudit:demo`
- `npm run preaudit:live -- --url=https://www.example.com/`
- `npm run preaudit:report`
- `npm run audit:demo`
- `npm run audit:live -- --intake=data/clients/audit-intake.sample.json`

The `--intake` flag is a legacy internal implementation name. Product-facing documentation should call this input **Business Context**.

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` with your Anthropic key:

```bash
ANTHROPIC_API_KEY=your_key_here
```

3. Run a live preaudit:

```bash
npm run preaudit:live -- --url=https://www.example.com/
npm run preaudit:report
```

4. Complete the generated Business Context draft in `data/clients/`, then run audit live:

```bash
npm run audit:live -- --intake=data/clients/example-audit-intake.draft.json
```

## Current status

- Live preaudit is implemented for single-page public website analysis
- Automatic Business Context draft generation is implemented
- Stage-1 audit ingestion is implemented for Business Context + preaudit facts
- Preaudit and audit artifacts are client-grouped and human-readable
- Orchestrator and specialist agents still use mock/demo data flows
- The system is still optimized for safe, auditable workflows rather than production integrations
