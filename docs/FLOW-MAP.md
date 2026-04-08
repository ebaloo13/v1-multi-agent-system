# Agent flow map — collections, sales, operations, audit, and orchestrator

This document describes the **current** batch-agent flows as implemented in code. **Collections**, **sales**, **operations**, **audit**, and **orchestrator** share the same architecture; only data paths, prompts, schemas, and artifact field names differ.

**Audit** is an internal diagnostic agent: it reads consolidated client scenario JSON and returns structured triage (pains, available data, recommended specialized agents). It does not send messages or change external systems.

**Orchestrator** is an internal routing / planning agent: it **runs the audit agent first**, then feeds the **validated audit output** (serialized JSON) into its prompt and returns which specialized agents to activate next, with reasoning and a recommended next step. It does **not** invoke collections, sales, or operations yet—only audit (as input) plus its own SDK call.

---

## 1. Shared pipeline (execution order)

| # | Node | Collections | Sales | Operations | Audit | Orchestrator | What happens |
|---|------|-------------|-------|------------|-------|--------------|--------------|
| N0 | **Script entry** | `scripts/run-collections.ts` | `scripts/run-sales.ts` | `scripts/run-operations.ts` | `scripts/run-audit.ts` | `scripts/run-orchestrator.ts` | `await run*Agent()`; on throw → log `*RunError` or generic → `process.exit(1)`. |
| N0b | **Batch (optional)** | `scripts/run-collections-batch.ts` | `scripts/run-sales-batch.ts` | `scripts/run-operations-batch.ts` | `scripts/run-audit-batch.ts` | `scripts/run-orchestrator-batch.ts` | Five sequential `run*Agent()` calls (demo harness). |
| N1 | **Resolve repo + run id** | `src/agents/collections-agent.ts` | `src/agents/sales-agent.ts` | `src/agents/operations-agent.ts` | `src/agents/audit-agent.ts` | `src/agents/orchestrator-agent.ts` | `resolveRepoRootFromModuleUrl(import.meta.url)`; `createRunId()` / `createSalesRunId()` / `createOperationsRunId()` / `createAuditRunId()` / `createOrchestratorRunId()`; `mkdir artifacts/runs/{runId}`. |
| N2 | **Git + input path** | — | — | — | — | — | `getGitCommit(repoRoot)`; static JSON under repo root (not CWD). |
| N3 | **Read input bytes** | `data/invoices.json` | `data/sales.json` | `data/operations.json` | `data/audit.json` | — | `fs.readFile` for the four domain agents. **Orchestrator:** no static orchestrator file; see N3o. |
| N3o | **Orchestrator input (audit)** | — | — | — | — | `runAuditAgent()` in [`src/agents/audit-agent.ts`](../src/agents/audit-agent.ts) | Awaits a full audit run (its own `run.json` / `events.ndjson`). On audit throw → orchestrator `run.json` (`input_error`) → throw `OrchestratorRunError` `INPUT_INVALID`. |
| N4 | **Build prompt** | `buildCollectionsPrompt` in [`src/collections/contract.ts`](../src/collections/contract.ts) | `buildSalesPrompt` in [`src/sales/contract.ts`](../src/sales/contract.ts) | `buildOperationsPrompt` in [`src/operations/contract.ts`](../src/operations/contract.ts) | `buildAuditPrompt` in [`src/audit/contract.ts`](../src/audit/contract.ts) | `buildOrchestratorPrompt` in [`src/orchestrator/contract.ts`](../src/orchestrator/contract.ts) | **Orchestrator:** input text = `JSON.stringify(auditResult.output, null, 2)`. `prompt_sha256` = SHA-256 of UTF-8 prompt. |
| N5 | **`query` + options** | — | — | — | — | — | Claude Agent SDK: `maxTurns: 2`, `maxBudgetUsd: 0.1`, `allowedTools: []`, `settingSources: ["project"]`. |
| N6 | **`setModel("haiku")`** | — | — | — | — | — | Model override (low cost). |
| N7 | **Stream loop** | `for await` + `appendRunEvent` | `for await` + `appendSalesRunEvent` | `for await` + `appendOperationsRunEvent` | `for await` + `appendAuditRunEvent` | `for await` + `appendOrchestratorRunEvent` | Each SDK message → **append** one line to `events.ndjson` (ts, type, subtype?, summary?). |
| N8 | **Buffer terminal `result`** | Same loop | Same loop | Same loop | Same loop | Same loop | On `message.type === "result"`, **overwrite** `terminalResult`. |
| N9 | **Iterator complete** | After loop | After loop | After loop | After loop | After loop | **Gate:** use buffered `terminalResult` only. |
| N10a | **No `result`** | — | — | — | — | — | `run.json` (`sdk_error`) → throw `SDK_NO_RESULT`. |
| N10b | **`subtype !== success`** | — | — | — | — | — | `run.json` (`sdk_error` + `sdk` fields) → throw `SDK_RUN_FAILED`. |
| N10c | **Parse + Zod** | `parseAndValidateCollectionsOutput` | `parseAndValidateSalesOutput` | `parseAndValidateOperationsOutput` | `parseAndValidateAuditOutput` | `parseAndValidateOrchestratorOutput` | Strip Markdown code fences from the model string, trim whitespace, then `JSON.parse`. Zod validate. On failure → `run.json` (`parse_error` / `schema_error`) → rethrow. |
| N10d | **Success** | — | — | — | — | — | `run.json` (`success`, `validated_output`, `raw_model_output`, `sdk`, `git_commit`, `prompt_sha256`, input hash fields…). Return `{ runId, artifactDir, output }`. |
| N11 | **Unexpected errors** | Outer `catch` | Outer `catch` | Outer `catch` | Outer `catch` | Outer `catch` | If not `*RunError`, best-effort `run.json` (`unexpected_error`) then rethrow. |

**Run ID prefixes:** `collections-…`, `sales-…`, `operations-…`, `audit-…`, and `orchestrator-…` (each `{ISO-stamp}-{8-hex}`).

**Event trace:** `artifacts/runs/{runId}/events.ndjson` — one JSON object per line; compact metadata only (no raw payloads).

**Canonical outcome:** `artifacts/runs/{runId}/run.json` — exactly one file per run.

---

## 2. Module map

| Concern | Collections | Sales | Operations | Audit | Orchestrator |
|---------|-------------|-------|------------|-------|--------------|
| Agent runner | [`src/agents/collections-agent.ts`](../src/agents/collections-agent.ts) | [`src/agents/sales-agent.ts`](../src/agents/sales-agent.ts) | [`src/agents/operations-agent.ts`](../src/agents/operations-agent.ts) | [`src/agents/audit-agent.ts`](../src/agents/audit-agent.ts) | [`src/agents/orchestrator-agent.ts`](../src/agents/orchestrator-agent.ts) |
| Support modules | [`src/collections/`](../src/collections/) (`errors`, `contract`, `runId`, `runArtifact`, `validateOutput`) | [`src/sales/`](../src/sales/) (same roles) | [`src/operations/`](../src/operations/) (same roles) | [`src/audit/`](../src/audit/) (same roles) | [`src/orchestrator/`](../src/orchestrator/) (same roles) |
| Zod schema | [`src/schemas/collections.ts`](../src/schemas/collections.ts) | [`src/schemas/sales.ts`](../src/schemas/sales.ts) | [`src/schemas/operations.ts`](../src/schemas/operations.ts) | [`src/schemas/audit.ts`](../src/schemas/audit.ts) | [`src/schemas/orchestrator.ts`](../src/schemas/orchestrator.ts) |
| npm script | `npm run collections` | `npm run sales` | `npm run operations` | `npm run audit` | `npm run orchestrator` |
| Batch script | `npm run collections:batch` | `npm run sales:batch` | `npm run operations:batch` | `npm run audit:batch` | `npm run orchestrator:batch` |

---

## 3. `run.json` shape (v1)

All agents use `schema_version: 1` and the same status / exit_code semantics. Differences:

| Field | Collections | Sales | Operations | Audit | Orchestrator |
|-------|-------------|-------|------------|-------|--------------|
| Input path | `invoice_path` | `sales_data_path` | `operations_data_path` | `audit_data_path` | `orchestrator_data_path` (logical id, same as input source) |
| Input source label | — | — | — | — | `orchestrator_input_source` = `"audit-agent"` |
| Input hash | `invoice_sha256` | `sales_data_sha256` | `operations_data_sha256` | `audit_data_sha256` | `orchestrator_data_sha256` = SHA-256 of UTF-8 **serialized validated audit output** (pretty-printed JSON) |
| Validated shape | `summary` + `actions[]` | `summary` + `opportunities[]` | `summary` + `issues[]` | `company_summary`, `industry`, `main_pains[]`, `available_data[]`, `recommended_agents[]`, `priority_order[]`, `notes` | `activated_agents[]`, `reasoning_summary`, `execution_priority[]`, `recommended_next_step` |

Shared fields include: `run_id`, `started_at`, `finished_at`, `status`, `exit_code`, `model`, `git_commit`, `prompt_sha256`, optional `sdk`, `raw_model_output`, `validated_output`, `validation_errors`, `parse_error_message`, `unexpected_message`. Writes also attach `local_time` for human-readable logs.

**Audit** `recommended_agents` and `priority_order` entries are constrained to `collections` \| `sales` \| `operations` (see schema).

**Orchestrator** `activated_agents` and `execution_priority` entries use the same enum (`collections` \| `sales` \| `operations`); output is routing / execution-order planning only.

---

## 4. Tools, inputs, outputs, decision points

### Tools

| Config | Effect |
|--------|--------|
| `allowedTools: []` | No agent tools; **all** tabular/context data is **only** in the prompt. |

### Inputs

| Input | Collections | Sales | Operations | Audit | Orchestrator |
|-------|-------------|-------|------------|-------|--------------|
| Fixture JSON | `data/invoices.json` | `data/sales.json` | `data/operations.json` | `data/audit.json` (array of client scenarios: e.g. `company_name`, `industry`, `services`, `known_problems`, `systems_available`, `notes`) | **None for orchestrator** — prompt input is the **live validated output** of `runAuditAgent()` (which itself reads `data/audit.json`). |
| API key | `ANTHROPIC_API_KEY` via `dotenv` (loaded in agent modules) | Same | Same | Same | Same |
| Project settings | `settingSources: ["project"]` | Same | Same | Same | Same |

### Outputs

| Output | Where |
|--------|-------|
| Validated payload | `run.json` → `validated_output` **only** when `status === "success"` |
| Audit / debug | `run.json` (hashes, `git_commit`, `prompt_sha256`, `sdk`, …) |
| Stream ordering | `events.ndjson` |

### Decision points

1. Input file read → `input_error` vs continue (orchestrator: **audit run** failure → same `input_error` / `INPUT_INVALID`).
2. After stream: presence of terminal `result` → `SDK_NO_RESULT` vs continue.
3. `subtype === "success"` vs SDK error → `sdk_error` vs continue.
4. Parse + Zod → `parse_error` / `schema_error` vs `success`.

---

## 5. Sensitive actions and external dependencies

- Customer / clinic–like identifiers and notes appear in prompts and may appear in `raw_model_output` and `validated_output`.
- **Collections:** `email_draft`, `escalate`, `risk_tier` are advisory-only; no automated send.
- **Sales:** `message_draft` and opportunity fields are advisory-only.
- **Operations:** `message_draft` and issue fields are advisory-only (internal coordination drafts).
- **Audit:** Structured triage only; must not invent facts beyond input. `recommended_agents` / `priority_order` are internal planning hints for which other agents to run—no automation.
- **Orchestrator:** Routing plan only; must not invent facts beyond the **audit agent output** embedded in the prompt. Does not call collections, sales, or operations—only audit (for input) and its own model pass. Output is for a human or future runner to consume.
- **External:** Anthropic API, Claude Agent SDK, optional project settings on disk.
- **Local:** `artifacts/` (should stay out of VCS; often gitignored).

---

## 6. Opaque areas

- SDK-internal stream types and ordering beyond what `events.ndjson` records.
- Full token usage not duplicated in `run.json` (only `sdk`-related cost/turn fields when present).

---

## 7. Remaining risks

1. **Tight budget / turns** — `error_max_budget_usd` / `error_max_turns` still possible.
2. **JSON from model** — Heavier markdown or invalid JSON still yields `parse_error` / `schema_error`.
3. **Artifact sensitivity** — `run.json` may store `raw_model_output` and `validated_output`; treat `artifacts/` as sensitive.
4. **Fixture language / style** — Mixed-language notes in demo data may affect model consistency.
5. **`git_commit` null** — If the repo is not a git checkout, the field is `null` (stderr noise from `git` is possible).
6. **Audit / orchestrator hallucination** — Prompts instruct not to invent data; validation does not cross-check claims against source JSON. Orchestrator may disagree with audit `recommended_agents`; that is model judgment unless wired to deterministic rules later.

---

## 8. Allowed actions (SDK)

- Return a **text** final result (must parse to JSON matching the agent schema after the small fence cleanup), within **2 turns** and **$0.10** budget.
- **No** filesystem tools from `allowedTools`.

---

*Entry points: `npm run collections` / `npm run sales` / `npm run operations` / `npm run audit` / `npm run orchestrator` → `src/agents/*-agent.ts` + `src/collections/*`, `src/sales/*`, `src/operations/*`, `src/audit/*`, or `src/orchestrator/*`.*
