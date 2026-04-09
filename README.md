# Claude Agent B2B Lab

TypeScript multi-agent system for AI-driven SME consulting workflows (preaudit, audit, routing, and execution). **v1** focuses on reliable, repeatable agent patterns: structured prompts, Zod-validated outputs, and per-run artifacts, not production integrations or live CRM/ERP connections yet.
---

## Architecture overview

End-to-end flow:

1. **Preaudit** runs a fast digital diagnostic to surface immediate opportunities across SEO, PageSpeed, UX, and tracking.
2. **Audit v2** reads richer mock company scenarios and follows a staged internal diagnostic workflow: business understanding, pain detection, data / systems availability, prioritization, and agent recommendation.
3. **Orchestrator** takes the **validated audit JSON** from a real audit run, decides which agents to activate, then executes the selected subagents and returns a richer consolidated structured output for internal consultant review.
4. **Specialized agents** each read their own mock dataset and return schema-conforming JSON.

The system uses a hybrid LLM architecture. Fast diagnostic agents (`preaudit` and `audit`) use a provider-agnostic layer via `pi-ai`, while orchestration and execution agents use the Claude SDK. This enables cost optimization and controlled experimentation across models.

The system includes a fast pre-audit layer used to surface immediate opportunities before running a full diagnostic.

```
                    +------------------+
                    |  preaudit-agent  |
                    | (data/mock/      |
                    |  preaudit)       |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   audit-agent    |
                    | (data/mock/      |
                    |  audit)          |
                    +--------+---------+
                             | validated audit JSON
                             v
                    +------------------+
                    | orchestrator     |
                    | (routing + exec) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
 +---------------+   +---------------+   +---------------+
 | collections   |   | sales         |   | operations    |
 | (mock/        |   | (mock/        |   | (mock/        |
 |  invoices)    |   |  sales.json)  |   |  operations)  |
 +---------------+   +---------------+   +---------------+
```

Each box that calls the model writes its own run folder under `artifacts/runs/`.

---

## Agents

| Agent | Role |
|-------|------|
| **preaudit-agent** | Fast SEO / UX / PageSpeed / tracking diagnostic used for lead generation and early opportunity discovery. |
| **audit-agent** | Analyzes static audit scenarios using a staged diagnostic methodology; summarizes the business, pains, available data, and recommends `collections` / `sales` / `operations` with priority. |
| **orchestrator-agent** | Runs **audit-agent** first, feeds the result into the orchestration prompt, validates routing output, executes the selected specialized agents sequentially, and returns a consultancy-style consolidated structured output. |
| **collections-agent** | Accounts-receivable style analysis: overdue invoices, risk tiers, priority scores, suggested actions, short email drafts. |
| **sales-agent** | Revenue-focused opportunities (reactivation, follow-ups, upsells, etc.) with prioritization and message drafts. |
| **operations-agent** | Operational issues (scheduling, utilization, coordination) with prioritized actions and short internal messages where useful. |

---

## Tech stack

- **TypeScript** (ES modules, `tsx` for execution)
- **[@mariozechner/pi-ai](https://www.npmjs.com/package/@mariozechner/pi-ai)** — provider-agnostic runtime for diagnostic agents
- **[@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)** — agent runs and streaming
- **Zod** — strict parsing and validation of model JSON
- **dotenv** — load local environment configuration

Development runs use the **Haiku** model with tight **turn and budget limits** per agent (as configured in code).

---

## Repository structure (high level)

| Path | Purpose |
|------|---------|
| `src/agents/` | Entry agents: preaudit, audit, orchestrator, collections, sales, operations |
| `src/schemas/` | Zod schemas shared with validation |
| `src/<agent>/` | Per-domain prompts (`contract.ts`), validation, run IDs, artifact writers, and deterministic presentation helpers where applicable |
| `scripts/` | Top-level script folders for demo, batch, and future live entrypoints |
| `data/mock/` | Mock JSON inputs (`preaudit.json`, `audit.json`, `invoices.json`, `sales.json`, `operations.json`, `orchestrator.json`) |
| `data/clients/` | Live-ingestion inputs generated for client-specific runs (for example live preaudit context) |
| `scripts/demo/` | Demo/mock script entrypoints |
| `scripts/live/` | Live execution and reporting entrypoints |
| `scripts/batch/` | Batch execution entrypoints |
| `docs/` | Additional design notes (e.g. flow maps) |

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run preaudit:demo` | Single preaudit demo run (default scenario index `0`) |
| `npm run preaudit:live -- --url=...` | Live preaudit run against one real website URL |
| `npm run preaudit:batch` | Up to 5 preaudit runs over indices `0..n-1` |
| `npm run preaudit:report` | Generate `report.md` from the latest successful preaudit artifact |
| `npm run audit:demo` | Single audit demo run (default scenario index `0`) |
| `npm run audit:batch` | Up to 5 audit runs over indices `0..n-1` |
| `npm run orchestrator:demo` | Full demo pipeline: audit → orchestrate → selected subagents |
| `npm run orchestrator:batch` | Repeat orchestrator 5 times |
| `npm run collections:demo` / `npm run sales:demo` / `npm run operations:demo` | Single demo run of that specialist |
| `npm run collections:batch` / `:batch` variants | Five consecutive runs |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Runs collections output validation tests |

---

## Running locally

**Prerequisites:** Node.js with npm (recent LTS recommended).

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a **`.env`** file in the project root (this file is **gitignored**). Set your Anthropic API key:

   ```bash
   ANTHROPIC_API_KEY=your_key_here
   ```

3. Run an agent, for example:

   ```bash
   npm run orchestrator:demo
   ```

   On success, the CLI prints `artifactDir:` pointing under `artifacts/runs/`.

4. For a live preaudit against a real website:

   ```bash
   npm run preaudit:live -- --url=https://www.example.com/
   npm run preaudit:report
   ```

   The second command writes a client-facing Markdown report beside the latest preaudit `run.json`.

---

## Artifacts, environment, and mock data

- **`artifacts/`** is **intentionally gitignored**. Each run creates a directory such as `artifacts/runs/<agent>-<timestamp>-<id>/` containing at least **`run.json`** (metadata, hashes, validation outcome, and validated output when successful) and **`events.ndjson`** (SDK message stream for traceability).
- **`.env`** is **gitignored** so secrets are not committed. Use a local file or your shell environment for `ANTHROPIC_API_KEY`.
- **Mock data** lives under **`data/mock/`** as JSON; `data/mock/preaudit.json` contains lightweight website / digital-presence scenarios, and `data/mock/audit.json` contains richer consulting-style intake scenarios for dental clinics, aesthetic clinics, fitness studios, and related service businesses. Replacing these files is the supported way to vary inputs in v1.
- **Live preaudit ingestion** can fetch a single real homepage URL, extract lightweight page context, persist the generated input under `data/clients/`, and run through the same preaudit validation and artifact pipeline.
- **Execution separation** is explicit: `scripts/demo/` is for single mock/demo runs, `scripts/batch/` is for repeated mock/demo runs, and `scripts/live/` is for live ingestion and artifact-based reporting.
- **Preaudit reports** are generated deterministically from `validated_output` only and written as `report.md` inside the run folder. They do not alter `run.json`, `events.ndjson`, schemas, or validation.

---

## Example output (orchestrator)

```json
{
  "audit": { "...": "validated audit output" },
  "orchestrator": { "...": "validated routing output" },
  "agents_executed": ["collections", "operations"],
  "results": {
    "collections": { "...": "validated collections output" },
    "operations": { "...": "validated operations output" }
  },
  "top_findings": [
    "...",
    "...",
    "..."
  ],
  "quick_wins": [
    "...",
    "...",
    "..."
  ],
  "recommended_next_actions": [
    "...",
    "...",
    "..."
  ],
  "final_summary": "Consultancy-style deterministic summary built from validated audit, routing, and subagent outputs."
}
```

`top_findings`, `quick_wins`, and `recommended_next_actions` are generated deterministically in code from validated outputs only. There is no extra LLM call for the final packaging layer.

---

## Current status (v1)

- Multi-agent **preaudit → audit → orchestrator → specialized agents** flow is implemented with **structured, Zod-validated** outputs and **persisted run artifacts**.
- **Preaudit** adds a fast digital diagnostic layer for early opportunity discovery before the deeper business diagnostic.
- **Live preaudit ingestion** is available for single-page website analysis without browser automation or crawling.
- **Preaudit reporting** now includes a deterministic Markdown export built from `validated_output`.
- **Audit v2** now uses a staged internal diagnostic prompt while keeping the same output schema and artifact contract.
- Orchestrator uses **real audit output** from an in-process audit run, not a hand-written stub.
- Orchestrator final output now includes deterministic consultancy-style fields: `top_findings`, `quick_wins`, `recommended_next_actions`, and a richer `final_summary`.
- The current system is based entirely on **mock datasets** and is optimized for reliable agent patterns, not live production integrations yet.
- **Collections** has automated tests around output validation; extend the same pattern for other agents as needed.
- Suitable for a **private** lab repo today; documentation and boundaries are written so the project can be **published later** without overclaiming capabilities.

---

## Roadmap / next steps

- Harden validation and tests across **sales** and **operations** (and orchestrator consolidation) to match **collections**.
- Optional: richer batch reporting across runs (without changing the core artifact contract).
- Later: real connectors (CRM, accounting, scheduling), deployment packaging, and stronger operational guardrails—only when requirements are explicit.
