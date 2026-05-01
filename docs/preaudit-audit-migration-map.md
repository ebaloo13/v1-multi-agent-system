# Preaudit / Audit Migration Map

This is a migration inventory only. It does not move files, change imports, or change behavior.

## 1. Current File Inventory

### Preaudit Source

| Path | Current purpose |
| --- | --- |
| `src/preaudit/contract.ts` | Builds the lead pre-audit prompt from public website/business scenario input. |
| `src/preaudit/errors.ts` | Domain-specific `PreauditRunError` and error codes. |
| `src/preaudit/piClient.ts` | PI client wrapper for preaudit model calls and SDK metadata capture. |
| `src/preaudit/report.ts` | Generates the Markdown preaudit report from validated output. |
| `src/preaudit/runArtifact.ts` | Preaudit artifact type, run directory path, hashing, git commit lookup, event writing, and `run.json` writing. |
| `src/preaudit/runId.ts` | Creates preaudit-prefixed run IDs. |
| `src/preaudit/scope.ts` | Classifies site type and framework fit for preaudit prudence. |
| `src/preaudit/scoring.ts` | Deterministic SEO, speed, and UX score calculation. |
| `src/preaudit/validateOutput.ts` | Parses and validates preaudit model output against `src/schemas/preaudit.ts`. |
| `src/preaudit/webContext.ts` | Fetches and extracts public website context used by the preaudit tool harness. |

### Audit Source

| Path | Current purpose |
| --- | --- |
| `src/audit/contract.ts` | Builds the Client Audit prompt from normalized audit input. |
| `src/audit/errors.ts` | Domain-specific `AuditRunError` and error codes. |
| `src/audit/piClient.ts` | PI client wrapper for audit model calls and SDK metadata capture. |
| `src/audit/runArtifact.ts` | Audit artifact type, run directory path, hashing, git commit lookup, event writing, and `run.json` writing. |
| `src/audit/runId.ts` | Creates audit-prefixed run IDs. |
| `src/audit/validateOutput.ts` | Parses and validates audit model output against `src/schemas/audit.ts`. |
| `src/audit/ingestion/types.ts` | Types for Business Context input, preaudit-derived facts, tool facts, and normalized audit input. |
| `src/audit/ingestion/fromIntake.ts` | Normalizes Business Context / legacy intake JSON into audit input facts. |
| `src/audit/ingestion/fromPreaudit.ts` | Converts preaudit output and tool facts into audit input facts. |
| `src/audit/ingestion/buildAuditInput.ts` | Combines Business Context facts and preaudit facts into stage-1 audit input. |
| `src/audit/ingestion/createAuditIntakeDraft.ts` | Creates a Business Context draft from preaudit output and tool facts. |

### Agent Runners

| Path | Current purpose |
| --- | --- |
| `src/agents/preaudit-agent.ts` | Runnable preaudit agent orchestration: input read, prompt build, LLM call, output validation, deterministic scoring, scope classification, artifact writes, latest pointer writes. |
| `src/agents/audit-agent.ts` | Runnable audit agent orchestration: input read, prompt build, LLM call, output validation, artifact writes, latest pointer writes, source preaudit provenance fields. |

### Live Entrypoints

| Path | Current purpose |
| --- | --- |
| `scripts/live/run-preaudit-live.ts` | CLI entrypoint for public URL preaudit; fetches website facts, writes `data/clients/preaudit-live.json`, runs preaudit agent, then writes Business Context draft. |
| `scripts/live/run-preaudit-report.ts` | CLI entrypoint that finds latest preaudit run and writes `report.md`. Supports client-grouped artifacts and legacy `artifacts/runs`. |
| `scripts/live/run-audit-live.ts` | CLI entrypoint for Client Audit; reads Business Context, optionally reads preaudit context, writes `data/clients/audit-live.json`, runs audit agent. |

### Data And Artifacts

| Path | Current purpose |
| --- | --- |
| `data/clients/preaudit-live.json` | Latest synthesized lead preaudit input from public website facts. |
| `data/clients/*-audit-intake.draft.json` | Generated Business Context draft, still using legacy `audit-intake` file naming. |
| `data/clients/*-audit-intake.json` | Saved/confirmed Business Context input for audit. |
| `data/clients/audit-live.json` | Latest normalized Client Audit input produced by `run-audit-live.ts`. |
| `data/clients/audit-intake.sample.json` | Sample Business Context input. |
| `artifacts/clients/<client>/preaudit/latest.json` | Latest preaudit pointer for a client. |
| `artifacts/clients/<client>/preaudit/<display-run-id>/run.json` | Preaudit run artifact payload. |
| `artifacts/clients/<client>/preaudit/<display-run-id>/events.ndjson` | Preaudit run events. |
| `artifacts/clients/<client>/preaudit/<display-run-id>/report.md` | Generated preaudit report. |
| `artifacts/clients/<client>/audit/latest.json` | Latest audit pointer for a client. |
| `artifacts/clients/<client>/audit/<display-run-id>/run.json` | Audit run artifact payload. |
| `artifacts/clients/<client>/audit/<display-run-id>/events.ndjson` | Audit run events. |

## 2. Current Responsibilities

The current implementation has four responsibility groups:

- Lead preaudit acquisition workflow: public URL fetch, deterministic website fact collection, preaudit prompt/run, deterministic scoring, scope prudence, report generation, and Business Context draft creation.
- Client Audit workflow: Business Context normalization, optional preaudit context ingestion, audit prompt/run, output validation, source preaudit provenance, and artifact writing.
- Agent runners: `src/agents/preaudit-agent.ts` and `src/agents/audit-agent.ts` combine workflow decisions with runner mechanics and artifact persistence.
- Runtime/shared utilities: run IDs, hashing, git commit lookup, artifact run paths, event line writing, `run.json` writing, slug/run naming, and latest pointer updates.

The main coupling is that lead preaudit currently imports audit ingestion code to create the Business Context draft, while Client Audit imports preaudit schema/types through `fromPreaudit.ts` and `run-audit-live.ts`.

## 3. What Belongs To `lead-preaudit` Workflow

Move later into `src/workflows/lead-preaudit/`:

| Current path | Future role |
| --- | --- |
| `src/preaudit/contract.ts` | Lead preaudit prompt contract. |
| `src/preaudit/scoring.ts` | Lead preaudit deterministic scoring. |
| `src/preaudit/scope.ts` | Lead preaudit scope/framework-fit classification. |
| `src/preaudit/report.ts` | Lead preaudit report generation. |
| `src/preaudit/validateOutput.ts` | Lead preaudit output validation. |
| `src/preaudit/errors.ts` | Keep local initially as workflow-specific error type. |
| `src/preaudit/runId.ts` | Keep local initially, then wrap generic runtime run ID helper if introduced. |
| `src/preaudit/runArtifact.ts` | Keep payload type local; extract generic mechanics to runtime later. |
| `scripts/live/run-preaudit-live.ts` internals | Eventually delegate to a workflow function while preserving the script entrypoint. |
| `scripts/live/run-preaudit-report.ts` internals | Eventually delegate to report/workflow service while preserving the script entrypoint. |

Also consider moving the Business Context draft creation that happens after preaudit into a boundary such as:

- `src/workflows/lead-preaudit/createBusinessContextDraft.ts`, if treated as acquisition handoff output.
- `src/workflows/client-audit/ingestion/createAuditIntakeDraft.ts`, if treated as Client Audit input preparation.

The safer first move is to keep `createAuditIntakeDraft` with Client Audit ingestion and expose a compatibility import.

## 4. What Belongs To `client-audit` Workflow

Move later into `src/workflows/client-audit/`:

| Current path | Future role |
| --- | --- |
| `src/audit/contract.ts` | Client Audit prompt contract. |
| `src/audit/validateOutput.ts` | Client Audit output validation. |
| `src/audit/errors.ts` | Keep local initially as workflow-specific error type. |
| `src/audit/runId.ts` | Keep local initially, then wrap generic runtime run ID helper if introduced. |
| `src/audit/runArtifact.ts` | Keep payload type local; extract generic mechanics to runtime later. |
| `src/audit/ingestion/types.ts` | Client Audit input and ingestion types. |
| `src/audit/ingestion/fromIntake.ts` | Business Context to Client Audit input adapter. |
| `src/audit/ingestion/fromPreaudit.ts` | Acquisition preaudit to Client Audit evidence adapter. |
| `src/audit/ingestion/buildAuditInput.ts` | Client Audit input builder. |
| `src/audit/ingestion/createAuditIntakeDraft.ts` | Business Context draft builder, unless separated into acquisition handoff. |
| `scripts/live/run-audit-live.ts` internals | Eventually delegate to a workflow function while preserving the script entrypoint. |

Client Audit should remain the deeper internal/platform diagnostic workflow. It can consume preaudit context, but it should not make preaudit part of the core client platform lifecycle.

## 5. What Belongs To `agents/audit`

Move later into `src/agents/audit/`:

| Current path | Future role |
| --- | --- |
| `src/agents/audit-agent.ts` | Client Audit agent runner/coordinator. |
| `src/agents/preaudit-agent.ts` | Only if the system keeps preaudit implemented as an agent runner; otherwise prefer a workflow runner under `src/workflows/lead-preaudit/`. |

Recommended split:

- Put `audit-agent.ts` under `src/agents/audit/audit-agent.ts`.
- Put preaudit runner orchestration under `src/workflows/lead-preaudit/runLeadPreaudit.ts` or `src/agents/audit/preaudit-agent.ts` only as a compatibility phase.
- Keep `src/agents/preaudit-agent.ts` as a re-export during migration so demo/batch/live scripts keep resolving.

## 6. What Belongs To Runtime / Shared

Move or extract later into `src/runtime/`:

| Current code | Future role |
| --- | --- |
| `createPreauditRunId` / `createAuditRunId` shared logic | Generic prefixed run ID helper, with domain wrappers retained. |
| `sha256Buffer`, `sha256Utf8` | Generic hashing utilities. |
| `getGitCommit` | Runtime provenance utility. |
| `writePreauditRunJson` / `writeAuditRunJson` shared mechanics | Generic JSON artifact writer, while domain artifact payload types stay local. |
| `appendPreauditRunEvent` / `appendAuditRunEvent` shared mechanics | Generic NDJSON event writer. |
| `preauditEventLineFromSdkMessage` / `auditEventLineFromSdkMessage` shared mechanics | Generic SDK result event helper. |

Keep in `src/shared/`:

| Current code | Future role |
| --- | --- |
| `src/shared/runNaming.ts` | Shared slug and display run naming helper. |
| `src/shared/clientArtifacts.ts` | Shared client artifact path and latest pointer helper for now. Could move to `src/storage/` later if persistence adapters become explicit. |

Provider-specific LLM calls in `src/preaudit/piClient.ts` and `src/audit/piClient.ts` are not runtime/shared. They should eventually move to `src/integrations/llm/` or remain workflow-local until a provider adapter boundary exists.

## 7. What Should Not Move Yet

- `scripts/live/run-preaudit-live.ts`, `scripts/live/run-preaudit-report.ts`, and `scripts/live/run-audit-live.ts`: preserve as stable entrypoints.
- `scripts/demo/run-preaudit-demo.ts`, `scripts/demo/run-audit-demo.ts`, `scripts/batch/run-preaudit-batch.ts`, and `scripts/batch/run-audit-batch.ts`: not in this migration scope, but their imports depend on current paths.
- `src/schemas/preaudit.ts` and `src/schemas/audit.ts`: root-level schemas intentionally live in `src/schemas`.
- `data/clients/*`: file-backed input and draft storage paths are consumed by scripts and web loaders.
- `artifacts/clients/*`: artifact paths, `latest.json`, `run.json`, `events.ndjson`, and `report.md` are consumed by scripts and `apps/web/src/lib/workflow.server.ts`.
- `apps/web/src/lib/workflow.server.ts`: reads preaudit/audit latest pointers and run files directly; do not change until storage compatibility is handled.
- Route/UI files under `apps/web/src/routes` and `apps/web/src/components`: out of scope.
- `src/tools/harness.ts` and website tools: preaudit uses them, but integration extraction should be a separate commit.
- Domain-specific artifact payload types: do not flatten into generic runtime types until readers are insulated.

## 8. Proposed Final Folder Destinations

| Current path | Proposed final destination |
| --- | --- |
| `src/preaudit/contract.ts` | `src/workflows/lead-preaudit/contract.ts` |
| `src/preaudit/errors.ts` | `src/workflows/lead-preaudit/errors.ts` |
| `src/preaudit/piClient.ts` | `src/integrations/llm/piClient.ts` or `src/workflows/lead-preaudit/piClient.ts` initially |
| `src/preaudit/report.ts` | `src/workflows/lead-preaudit/report.ts` |
| `src/preaudit/runArtifact.ts` | `src/workflows/lead-preaudit/runArtifact.ts` with runtime helper imports |
| `src/preaudit/runId.ts` | `src/workflows/lead-preaudit/runId.ts` wrapping `src/runtime/runId.ts` later |
| `src/preaudit/scope.ts` | `src/workflows/lead-preaudit/scope.ts` |
| `src/preaudit/scoring.ts` | `src/workflows/lead-preaudit/scoring.ts` |
| `src/preaudit/validateOutput.ts` | `src/workflows/lead-preaudit/validateOutput.ts` |
| `src/preaudit/webContext.ts` | `src/integrations/website/webContext.ts` or `src/workflows/lead-preaudit/webContext.ts` temporarily |
| `src/audit/contract.ts` | `src/workflows/client-audit/contract.ts` |
| `src/audit/errors.ts` | `src/workflows/client-audit/errors.ts` |
| `src/audit/piClient.ts` | `src/integrations/llm/piClient.ts` or `src/workflows/client-audit/piClient.ts` initially |
| `src/audit/runArtifact.ts` | `src/workflows/client-audit/runArtifact.ts` with runtime helper imports |
| `src/audit/runId.ts` | `src/workflows/client-audit/runId.ts` wrapping `src/runtime/runId.ts` later |
| `src/audit/validateOutput.ts` | `src/workflows/client-audit/validateOutput.ts` |
| `src/audit/ingestion/*` | `src/workflows/client-audit/ingestion/*` |
| `src/agents/audit-agent.ts` | `src/agents/audit/audit-agent.ts` |
| `src/agents/preaudit-agent.ts` | `src/workflows/lead-preaudit/runLeadPreaudit.ts` or compatibility wrapper to a workflow runner |
| Generic pieces from `src/preaudit/runArtifact.ts` and `src/audit/runArtifact.ts` | `src/runtime/artifacts.ts`, `src/runtime/hash.ts`, `src/runtime/git.ts`, `src/runtime/events.ts` |

Compatibility paths to keep during migration:

- `src/preaudit/*` re-exporting from `src/workflows/lead-preaudit/*`.
- `src/audit/*` re-exporting from `src/workflows/client-audit/*`.
- `src/audit/ingestion/*` re-exporting from `src/workflows/client-audit/ingestion/*`.
- `src/agents/audit-agent.ts` re-exporting from `src/agents/audit/audit-agent.ts`.
- `src/agents/preaudit-agent.ts` re-exporting from its new workflow/agent runner location.

## 9. Recommended Migration Order In Small Commits

1. Add compatibility tests or at least run current lightweight checks before moving anything.
   - Focus on import resolution, `preaudit:report`, and collections test/typecheck where available.

2. Extract generic runtime helpers without moving domain files.
   - Create generic helpers for run IDs, hashes, git commit, JSON artifact writing, and NDJSON event writing.
   - Update preaudit/audit run artifact files to call runtime helpers.
   - Keep artifact payload types and paths unchanged.

3. Move Client Audit ingestion first.
   - Move `src/audit/ingestion/*` to `src/workflows/client-audit/ingestion/*`.
   - Leave `src/audit/ingestion/*` re-export wrappers.
   - Update only direct imports in live scripts after wrappers exist.

4. Move Client Audit workflow files.
   - Move `contract`, `errors`, `validateOutput`, `runId`, and `runArtifact` into `src/workflows/client-audit/`.
   - Keep `src/audit/*` re-export wrappers.
   - Preserve artifact paths under `artifacts/clients/<client>/audit/...`.

5. Move Audit agent runner.
   - Move `src/agents/audit-agent.ts` to `src/agents/audit/audit-agent.ts`.
   - Keep `src/agents/audit-agent.ts` as a re-export.
   - Update only low-risk imports where helpful; scripts can continue through the wrapper initially.

6. Move Lead Preaudit workflow files.
   - Move `contract`, `errors`, `report`, `validateOutput`, `scoring`, `scope`, `runId`, and `runArtifact` into `src/workflows/lead-preaudit/`.
   - Keep `src/preaudit/*` re-export wrappers.
   - Preserve artifact paths under `artifacts/clients/<client>/preaudit/...`.

7. Split or move preaudit runner orchestration.
   - Either move `src/agents/preaudit-agent.ts` to `src/workflows/lead-preaudit/runLeadPreaudit.ts`, or temporarily to `src/agents/audit/preaudit-agent.ts` with clear acquisition naming.
   - Keep `src/agents/preaudit-agent.ts` as a wrapper.

8. Extract integrations separately.
   - Move `webContext` and website tools into `src/integrations/website/`.
   - Move PI client wrappers into `src/integrations/llm/` only after both workflows can consume a shared provider adapter.

9. Update web loaders only after storage adapters exist.
   - Keep current artifact readers intact until `src/storage` exposes compatible readers for `latest.json`, `run.json`, `report.md`, and Business Context files.

## 10. Import / Artifact Compatibility Risks

- NodeNext ESM imports use explicit `.js` specifiers. Every moved file needs matching relative `.js` import updates or compatibility re-exports.
- Live scripts are package/script entrypoints and should keep their file paths and CLI flags: `--url`, `--intake`, `--preaudit-run-json`, and `--preaudit-summary`.
- Demo and batch scripts import `src/agents/preaudit-agent.ts`, `src/agents/audit-agent.ts`, `src/preaudit/errors.ts`, and `src/audit/errors.ts`. Wrappers are required before moving implementations.
- `scripts/live/run-preaudit-report.ts` imports `src/preaudit/report.ts` and supports legacy `artifacts/runs`; keep a wrapper or update cautiously.
- `apps/web/src/lib/workflow.server.ts` reads `artifacts/clients/<client>/<agent>/latest.json`, `run.json`, and `report.md` directly. Artifact path and pointer shape must remain stable.
- Existing `run.json` fields are consumed implicitly by scripts and web loaders: `validated_output`, `display_run_id`, `client_slug`, `preaudit_data_path`, `preaudit_record_index`, `audit_data_path`, `intake_path`, and source preaudit fields.
- `data/clients/preaudit-live.json` and `data/clients/audit-live.json` are mutable latest-input files. Moving workflow code should not change these paths until readers are migrated.
- `createAuditIntakeDraft` is semantically a handoff between acquisition and Client Audit. Moving it too early can create confusing ownership; keep a compatibility wrapper either way.
- `src/tools/fetchWebPage.ts` imports `src/preaudit/webContext.ts`. Moving `webContext` requires updating tool imports or adding a preaudit wrapper.
- `src/audit/ingestion/fromPreaudit.ts` imports `src/schemas/preaudit.ts`. This is acceptable because schemas remain root-level, but it reinforces the handoff contract between acquisition and Client Audit.
- Preaudit and audit PI client wrappers duplicate provider logic but depend on domain artifact SDK types. Provider extraction should not happen until runtime artifact typing is disentangled.
- Domain artifact payload types should stay local to workflows; generic runtime helpers should not force a single run JSON schema.
- Artifact path preservation is more important than folder purity in early commits.
