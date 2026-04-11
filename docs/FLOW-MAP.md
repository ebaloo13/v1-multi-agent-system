# Agent flow map — preaudit, audit, orchestrator, collections, sales, and operations

This document describes the **current** batch-agent flows as implemented in code. **Preaudit**, **audit**, **orchestrator**, **collections**, **sales**, and **operations** share the same overall pipeline and artifact contract; data paths, prompts, schemas, and LLM runtime wiring differ by stage.

**Preaudit** is a fast digital diagnostic agent: it reads lightweight website / digital-presence scenarios and returns advisory signals across SEO, speed, UX, and tracking. It is intended for lead-generation and early diagnostic use. It does not perform browser automation, live measurement, or external checks. After validation, scores are recalculated deterministically from findings, and a lightweight scope-fit classifier marks when the framework is a poor fit for the website being audited.

**Audit** is an internal diagnostic agent: it reads consolidated client scenario JSON and returns structured triage (company summary, pains, available data, recommended specialized agents, priority order, notes). Internally it follows a staged diagnostic workflow: business understanding, pain detection, data / systems availability, prioritization, and agent recommendation. It does not send messages or change external systems.

**Orchestrator** is an internal routing / execution agent: it **runs the audit agent first**, then feeds the **validated audit output** (serialized JSON) into its prompt, returns which specialized agents to activate next, and then executes the selected subagents sequentially. Its final consolidated output includes the validated audit, validated routing result, executed subagent outputs, deterministic consultancy-style findings, deterministic quick wins, deterministic recommended next actions, and a final summary.

---

## LLM Runtime Layer

This system uses a hybrid LLM architecture. Diagnostic agents (`preaudit`, `audit`) use a provider-agnostic abstraction layer via `@mariozechner/pi-ai`, while execution agents (`orchestrator`, `collections`, `sales`, `operations`) continue to use the Claude SDK. This enables controlled experimentation, cost optimization, and incremental migration.

`pi-ai` normalizes provider calls into a unified message schema and execution model. In practice, this means provider changes can be isolated to the runtime layer without changing prompt construction, parsing, validation, business logic, or artifact structure. Deterministic validation remains the compatibility boundary for all agents.

This staged migration is intentional. The hybrid runtime may introduce minor tone or phrasing differences between agent families, but outputs remain operationally consistent because each agent still passes through strict JSON parsing and schema validation before success artifacts are written.

---

## 1. Shared pipeline (execution order)

| # | Node | Preaudit | Collections | Sales | Operations | Audit | Orchestrator | What happens |
|---|------|----------|-------------|-------|------------|-------|--------------|--------------|
| N0 | **Script entry** | `scripts/demo/run-preaudit-demo.ts` or `scripts/live/run-preaudit-live.ts` | `scripts/demo/run-collections-demo.ts` | `scripts/demo/run-sales-demo.ts` | `scripts/demo/run-operations-demo.ts` | `scripts/demo/run-audit-demo.ts` | `scripts/demo/run-orchestrator-demo.ts` | `await run*Agent()`; on throw → log `*RunError` or generic → `process.exit(1)`. |
| N0b | **Batch (optional)** | `scripts/batch/run-preaudit-batch.ts` | `scripts/batch/run-collections-batch.ts` | `scripts/batch/run-sales-batch.ts` | `scripts/batch/run-operations-batch.ts` | `scripts/batch/run-audit-batch.ts` | `scripts/batch/run-orchestrator-batch.ts` | Five sequential `run*Agent()` calls (demo harness). |
| N1 | **Resolve repo + run id** | `src/agents/preaudit-agent.ts` | `src/agents/collections-agent.ts` | `src/agents/sales-agent.ts` | `src/agents/operations-agent.ts` | `src/agents/audit-agent.ts` | `src/agents/orchestrator-agent.ts` | `resolveRepoRootFromModuleUrl(import.meta.url)`; `createPreauditRunId()` / `createRunId()` / `createSalesRunId()` / `createOperationsRunId()` / `createAuditRunId()` / `createOrchestratorRunId()`; `mkdir artifacts/runs/{runId}`. Preaudit and audit also derive `client_slug` and human-friendly `display_run_id` via `src/common/runNaming.ts`. |
| N2 | **Git + input path** | — | — | — | — | — | — | `getGitCommit(repoRoot)`; input JSON resolved under repo root (not CWD). |
| N2p | **Live preaudit input prep** | `scripts/live/run-preaudit-live.ts` + [`src/preaudit/webContext.ts`](../src/preaudit/webContext.ts) | — | — | — | — | — | For live preaudit only: fetch one URL, extract lightweight page context, write a one-record JSON array under `data/clients/preaudit-live.json`, then set `PREAUDIT_INPUT_PATH` before calling `runPreauditAgent(0)`. |
| N3 | **Read input bytes** | `data/mock/preaudit.json` or `data/clients/preaudit-live.json` | `data/mock/invoices.json` | `data/mock/sales.json` | `data/mock/operations.json` | `data/mock/audit.json` | — | `fs.readFile` for the five domain agents. **Orchestrator:** no static orchestrator file; see N3o. |
| N3o | **Orchestrator input (audit)** | — | — | — | — | — | `runAuditAgent()` in [`src/agents/audit-agent.ts`](../src/agents/audit-agent.ts) | Awaits a full audit run (its own `run.json` / `events.ndjson`). On audit throw → orchestrator `run.json` (`input_error`) → throw `OrchestratorRunError` `INPUT_INVALID`. |
| N4 | **Build prompt** | `buildPreauditPrompt` in [`src/preaudit/contract.ts`](../src/preaudit/contract.ts) | `buildCollectionsPrompt` in [`src/collections/contract.ts`](../src/collections/contract.ts) | `buildSalesPrompt` in [`src/sales/contract.ts`](../src/sales/contract.ts) | `buildOperationsPrompt` in [`src/operations/contract.ts`](../src/operations/contract.ts) | `buildAuditPrompt` in [`src/audit/contract.ts`](../src/audit/contract.ts) | `buildOrchestratorPrompt` in [`src/orchestrator/contract.ts`](../src/orchestrator/contract.ts) | **Preaudit live only:** scope classification is computed from the synthesized input record before artifacts are finalized. **Orchestrator:** input text = `JSON.stringify(auditResult.output, null, 2)`. `prompt_sha256` = SHA-256 of UTF-8 prompt. |
| N5 | **Runtime execution** | `pi-ai complete(...)` | Claude SDK `query(...)` | Claude SDK `query(...)` | Claude SDK `query(...)` | `pi-ai complete(...)` | Claude SDK `query(...)` | Hybrid runtime layer: `preaudit` and `audit` use `pi-ai`; orchestrator and specialist agents use Claude SDK. |
| N6 | **Model selection** | Anthropic Haiku via `pi-ai` | `setModel("haiku")` | `setModel("haiku")` | `setModel("haiku")` | Anthropic Haiku via `pi-ai` | `setModel("haiku")` | Low-cost runtime tier across all agents. |
| N7 | **Events / streaming** | Single synthetic `result` event | `for await` + `appendRunEvent` | `for await` + `appendSalesRunEvent` | `for await` + `appendOperationsRunEvent` | Single synthetic `result` event | `for await` + `appendOrchestratorRunEvent` | `pi-ai` agents do not stream today; they still append one `result` line to `events.ndjson`. Claude SDK agents append one line per SDK message. |
| N8 | **Capture raw output** | `terminalResult.result = runPreauditLLM(prompt)` | Same loop | Same loop | Same loop | `terminalResult.result = runAuditLLM(prompt)` | Same loop | All agents preserve `raw_model_output` semantics for downstream parsing and artifacts. |
| N9 | **Terminal result gate** | Immediate after completion | After loop | After loop | After loop | Immediate after completion | After loop | **Gate:** use the final raw model string only. |
| N10a | **No `result`** | — | — | — | — | — | — | `run.json` (`sdk_error`) → throw `SDK_NO_RESULT`. |
| N10b | **`subtype !== success`** | — | — | — | — | — | — | `run.json` (`sdk_error` + `sdk` fields) → throw `SDK_RUN_FAILED`. |
| N10c | **Parse + Zod** | `parseAndValidatePreauditOutput` | `parseAndValidateCollectionsOutput` | `parseAndValidateSalesOutput` | `parseAndValidateOperationsOutput` | `parseAndValidateAuditOutput` | `parseAndValidateOrchestratorOutput` | Strip Markdown code fences from the model string, trim whitespace, then `JSON.parse`. Zod validate. On failure → `run.json` (`parse_error` / `schema_error`) → rethrow. |
| N10d | **Success** | — | — | — | — | — | — | `run.json` (`success`, `validated_output`, `raw_model_output`, `sdk`, `git_commit`, `prompt_sha256`, input hash fields…). **Preaudit only:** after validation, `seo_score`, `speed_score`, and `ux_score` are recalculated deterministically in code. For orchestrator, `validated_output` is the final consolidated object, while `raw_model_output` remains the routing model output only. Return `{ runId, artifactDir, output }`. |
| N11 | **Unexpected errors** | Outer `catch` | Outer `catch` | Outer `catch` | Outer `catch` | Outer `catch` | Outer `catch` | If not `*RunError`, best-effort `run.json` (`unexpected_error`) then rethrow. |
| N12 | **Deterministic report (optional)** | `scripts/live/run-preaudit-report.ts` + [`src/preaudit/report.ts`](../src/preaudit/report.ts) | — | — | — | — | — | Read latest preaudit `run.json`, extract `validated_output`, generate Markdown report, and write `report.md` into the same run directory. |

**Run ID prefixes:** `preaudit-…`, `collections-…`, `sales-…`, `operations-…`, `audit-…`, and `orchestrator-…` (each `{ISO-stamp}-{8-hex}`).

**Event trace:** `artifacts/runs/{runId}/events.ndjson` — one JSON object per line; compact metadata only (no raw payloads).

**Canonical outcome:** `artifacts/runs/{runId}/run.json` — exactly one file per run.

---

## 2. Module map

| Concern | Preaudit | Collections | Sales | Operations | Audit | Orchestrator |
|---------|----------|-------------|-------|------------|-------|--------------|
| Agent runner | [`src/agents/preaudit-agent.ts`](../src/agents/preaudit-agent.ts) | [`src/agents/collections-agent.ts`](../src/agents/collections-agent.ts) | [`src/agents/sales-agent.ts`](../src/agents/sales-agent.ts) | [`src/agents/operations-agent.ts`](../src/agents/operations-agent.ts) | [`src/agents/audit-agent.ts`](../src/agents/audit-agent.ts) | [`src/agents/orchestrator-agent.ts`](../src/agents/orchestrator-agent.ts) |
| Support modules | [`src/preaudit/`](../src/preaudit/) (`errors`, `contract`, `piClient`, `runId`, `runArtifact`, `validateOutput`, `webContext`, `scoring`, `scope`, `report`) + [`src/common/runNaming.ts`](../src/common/runNaming.ts) | [`src/collections/`](../src/collections/) (`errors`, `contract`, `runId`, `runArtifact`, `validateOutput`) | [`src/sales/`](../src/sales/) (same roles) | [`src/operations/`](../src/operations/) (same roles) | [`src/audit/`](../src/audit/) (`errors`, `contract`, `piClient`, `runId`, `runArtifact`, `validateOutput`) + [`src/common/runNaming.ts`](../src/common/runNaming.ts) | [`src/orchestrator/`](../src/orchestrator/) (same roles) |
| Zod schema | [`src/schemas/preaudit.ts`](../src/schemas/preaudit.ts) | [`src/schemas/collections.ts`](../src/schemas/collections.ts) | [`src/schemas/sales.ts`](../src/schemas/sales.ts) | [`src/schemas/operations.ts`](../src/schemas/operations.ts) | [`src/schemas/audit.ts`](../src/schemas/audit.ts) | [`src/schemas/orchestrator.ts`](../src/schemas/orchestrator.ts) |
| npm script | `npm run preaudit:demo` / `npm run preaudit:live` / `npm run preaudit:report` | `npm run collections:demo` | `npm run sales:demo` | `npm run operations:demo` | `npm run audit:demo` | `npm run orchestrator:demo` |
| Batch script | `npm run preaudit:batch` | `npm run collections:batch` | `npm run sales:batch` | `npm run operations:batch` | `npm run audit:batch` | `npm run orchestrator:batch` |
| LLM runtime | `pi-ai` | Claude SDK | Claude SDK | Claude SDK | `pi-ai` | Claude SDK |

---

## 3. `run.json` shape (v1)

All agents use `schema_version: 1` and the same status / exit_code semantics. Differences:

| Field | Preaudit | Collections | Sales | Operations | Audit | Orchestrator |
|-------|----------|-------------|-------|------------|-------|--------------|
| Input path | `preaudit_data_path` | `invoice_path` | `sales_data_path` | `operations_data_path` | `audit_data_path` | `orchestrator_data_path` (logical id, same as input source) |
| Input source label | — | — | — | — | — | `orchestrator_input_source` = `"audit-agent"` |
| Variant label | — | — | — | — | `audit_variant` = `"baseline"` \| `"pi-ai"` | — |
| Input hash | `preaudit_data_sha256` | `invoice_sha256` | `sales_data_sha256` | `operations_data_sha256` | `audit_data_sha256` | `orchestrator_data_sha256` = SHA-256 of UTF-8 **serialized validated audit output** (pretty-printed JSON) |
| Validated shape | `company_summary`, `seo_score`, `speed_score`, `ux_score`, `priority_alerts[]`, `seo_findings[]`, `speed_findings[]`, `ux_findings[]`, `tracking_findings[]`, `quick_wins[]`, `summary` | `summary` + `actions[]` | `summary` + `opportunities[]` | `summary` + `issues[]` | `company_summary`, `industry`, `main_pains[]`, `available_data[]`, `recommended_agents[]`, `priority_order[]`, `notes` | `audit`, `orchestrator`, `agents_executed[]`, `results`, `top_findings[]`, `quick_wins[]`, `recommended_next_actions[]`, `final_summary` |

Shared fields include: `run_id`, `started_at`, `finished_at`, `status`, `exit_code`, `model`, `git_commit`, `prompt_sha256`, optional `sdk`, `raw_model_output`, `validated_output`, `validation_errors`, `parse_error_message`, `unexpected_message`. Writes also attach `local_time` for human-readable logs.

**Preaudit / audit observability extensions:** `display_run_id`, `client_slug`, `input_source`, `runtime`, `duration_ms`; plus `score_source` for both, and `site_type`, `framework_fit`, `scope_confidence` for preaudit.

**Preaudit** findings are advisory-only digital diagnostic signals; they are not produced by live browser automation, PageSpeed measurements, analytics inspection, or external API checks. In live mode, the model sees a single extracted homepage context only.

**Audit** `recommended_agents` and `priority_order` entries are constrained to `collections` \| `sales` \| `operations` (see schema).

**Orchestrator** `activated_agents` and `execution_priority` entries use the same enum (`collections` \| `sales` \| `operations`). Its final consolidated output is deterministic code-built packaging around validated routing and validated subagent outputs.

---

## 4. Tools, inputs, outputs, decision points

### Tools

| Config | Effect |
|--------|--------|
| `allowedTools: []` | No agent tools; **all** tabular/context data is **only** in the prompt. |

### Inputs

| Input | Preaudit | Collections | Sales | Operations | Audit | Orchestrator |
|-------|----------|-------------|-------|------------|-------|--------------|
| Fixture JSON | `data/mock/preaudit.json` for demo, or `data/clients/preaudit-live.json` for live single-site ingestion (array with one synthesized record containing extracted page context) | `data/mock/invoices.json` | `data/mock/sales.json` | `data/mock/operations.json` | `data/mock/audit.json` (array of richer client scenarios: e.g. `company_name`, `industry`, `services`, `business_model`, `known_problems`, `systems_available`, `sales_notes`, `operations_notes`, `collections_notes`, `digital_presence`, `notes`) | **None for orchestrator** — routing prompt input is the **live validated output** of `runAuditAgent()` (which itself reads `data/mock/audit.json`). |
| API key | `ANTHROPIC_API_KEY` via `dotenv` (loaded in agent modules) | Same | Same | Same | Same | Same |
| Project settings | `settingSources: ["project"]` | Same | Same | Same | Same | Same |

### Outputs

| Output | Where |
|--------|-------|
| Validated payload | `run.json` → `validated_output` **only** when `status === "success"` |
| Audit / debug | `run.json` (hashes, `git_commit`, `prompt_sha256`, `sdk`, …) |
| Stream ordering | `events.ndjson` |
| Preaudit report | `report.md` in the same preaudit run directory when generated via `preaudit:report`; may include a short scope note when the site is outside the intended SME/service framework |

### Decision points

1. Input file read → `input_error` vs continue (orchestrator: **audit run** failure → same `input_error` / `INPUT_INVALID`).
2. After stream: presence of terminal `result` → `SDK_NO_RESULT` vs continue.
3. `subtype === "success"` vs SDK error → `sdk_error` vs continue.
4. Parse + Zod → `parse_error` / `schema_error` vs `success`.

---

## 5. Sensitive actions and external dependencies

- Customer / clinic-like identifiers and notes appear in prompts and may appear in `raw_model_output` and `validated_output`.
- **Preaudit:** Fast digital diagnostic only; SEO, speed, UX, and tracking findings are advisory signals based on scenario inputs. No browser automation, live measurement, or external validation. Scope-fit classification is heuristic and is meant to temper certainty, not replace human judgment.
- **Preaudit report generation:** deterministic Markdown formatting only, built from `validated_output`; it does not modify artifacts other than writing `report.md`.
- **Collections:** `email_draft`, `escalate`, `risk_tier` are advisory-only; no automated send.
- **Sales:** `message_draft` and opportunity fields are advisory-only.
- **Operations:** `message_draft` and issue fields are advisory-only (internal coordination drafts).
- **Audit:** Structured diagnostic triage only; must not invent facts beyond input. `recommended_agents` / `priority_order` are internal planning hints for which other agents to run — no automation.
- **Orchestrator:** Routing prompt must not invent facts beyond the **audit agent output** embedded in the prompt. After routing validation, the orchestrator executes the selected collections, sales, and/or operations subagents sequentially, then assembles a deterministic consultancy-style consolidated output for human review.
- **External:** Anthropic API, `@mariozechner/pi-ai`, Claude Agent SDK, optional project settings on disk.
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
6. **Hybrid runtime drift** — Running `pi-ai` and Claude SDK side by side may introduce minor phrasing or tone differences even when schemas match.
7. **Preadudit / audit / orchestrator hallucination** — Prompts instruct not to invent data; validation does not cross-check claims against source JSON. Preaudit is explicitly non-measured and advisory. Scope-fit classification and deterministic scoring reduce overconfidence but do not guarantee factual correctness. Orchestrator may disagree with audit `recommended_agents`; that is model judgment unless wired to deterministic rules later. The consultancy-style consolidated fields are deterministic, but they still depend on the factual quality of the validated agent outputs they summarize.

---

## 8. Allowed actions (SDK)

- Return a **text** final result (must parse to JSON matching the agent schema after the small fence cleanup), within **2 turns** and **$0.10** budget.
- **No** filesystem tools from `allowedTools`.

---

*Entry points: `npm run preaudit:demo`, `npm run preaudit:live`, `npm run preaudit:report`, `npm run collections:demo`, `npm run sales:demo`, `npm run operations:demo`, `npm run audit:demo`, and `npm run orchestrator:demo`, plus the matching `:batch` commands. Demo entrypoints live under `scripts/demo/`, batch entrypoints under `scripts/batch/`, and live ingestion/reporting entrypoints live under `scripts/live/`.*
