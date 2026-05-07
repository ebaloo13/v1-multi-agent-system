# Architecture Migration Map

This is a documentation-only inventory for moving the current repository toward the modular AI operations platform architecture. It proposes destinations only; no files should move as part of this inventory.

## 1. Current Structure Summary

The repository currently has a compact root `src` implementation with agent runners, domain workflow helpers, schemas, tools, and shared artifact utilities:

- `src/agents`: flat runnable agent implementations for audit, preaudit, orchestrator, sales, collections, and operations. Collections, sales, operations, and orchestrator use injectable runtime runners and no longer import provider SDKs directly.
- `src/audit`: client audit prompt contract, validation, run artifacts, PI client, errors, and intake/preaudit ingestion helpers.
- `src/preaudit`: lead pre-audit prompt contract, validation, scoring, report generation, web context, PI client, errors, and run artifacts.
- `src/sales`, `src/collections`, `src/operations`, `src/orchestrator`: specialist agent contracts, validation, run ids, run artifacts, and errors.
- `src/schemas`: root-level Zod schemas and exported types for audit, preaudit, sales, operations, collections, and orchestrator outputs.
- `src/tools`: preaudit fact collection tools and a small in-process tool harness.
- `src/common`: shared artifact paths and run naming helpers.
- `src/runtime`: provider-neutral runner contract, Claude SDK adapter, and runtime tool helpers.
- `src/core`, `src/workflows`, `src/integrations`, `src/storage`, `src/shared`: architectural homes with README or `.gitkeep` placeholders.

Other important roots:

- `scripts/demo`, `scripts/batch`, `scripts/live`: CLI entrypoints used by package scripts and by the web app.
- `apps/web/src`: TanStack web app, routes, route tree, UI components, product shell copy/config, workspace view models, and server functions.
- `data/clients`: current client input JSON, live payloads, samples, and draft intake files.
- `data/mock`: mock inputs for demo agents.
- `artifacts/clients`: generated run outputs, event logs, reports, and latest pointers.
- `docs`: product and architecture documentation.

## 2. Proposed Destination For Existing Agent-Related Files

Agents should be organized as domain coordinators plus specialist agents. Keep the public function names stable during migration and move one agent family at a time.

| Current file | Proposed destination | Notes |
| --- | --- | --- |
| `src/agents/audit-agent.ts` | `src/agents/audit/audit-agent.ts` | Client Audit coordinator/specialist for the real platform audit workflow. |
| `src/agents/preaudit-agent.ts` | `src/agents/audit/preaudit-agent.ts` or `src/workflows/lead-preaudit/preaudit-agent.ts` | Pre-audit is a lead hook. Prefer keeping orchestration under `workflows/lead-preaudit`; only place here if it remains an agent runner. |
| `src/agents/orchestrator-agent.ts` | `src/agents/operations/orchestrator-agent.ts` | Domain coordinator that routes work to specialists. Consider renaming later to `operations-coordinator-agent.ts` or `platform-coordinator-agent.ts`. |
| `src/agents/sales-agent.ts` | `src/agents/sales/sales-agent.ts` | Sales specialist agent. |
| `src/agents/collections-agent.ts` | `src/agents/collections/collections-agent.ts` | Collections specialist agent. |
| `src/agents/operations-agent.ts` | `src/agents/operations/operations-agent.ts` | Operations specialist agent. |

Supporting domain files that are agent-specific should eventually move with their agent family:

| Current files | Proposed destination | Notes |
| --- | --- | --- |
| `src/sales/contract.ts`, `errors.ts`, `validateOutput.ts`, `runId.ts`, `runArtifact.ts` | `src/agents/sales/` or split into `src/agents/sales/` plus `src/runtime/` | Prompt contract and validation belong near the agent initially. Artifact/run helpers may later be centralized. |
| `src/collections/contract.ts`, `errors.ts`, `validateOutput.ts`, `runId.ts`, `runArtifact.ts`, `validateOutput.test.ts` | `src/agents/collections/` or split into `src/agents/collections/` plus `src/runtime/` | Move the test with the validator when this family migrates. |
| `src/operations/contract.ts`, `errors.ts`, `validateOutput.ts`, `runId.ts`, `runArtifact.ts` | `src/agents/operations/` or split into `src/agents/operations/` plus `src/runtime/` | Avoid hardcoding vertical-specific behavior in this core operations specialist. |
| `src/orchestrator/contract.ts`, `errors.ts`, `validateOutput.ts`, `runId.ts`, `runArtifact.ts` | `src/agents/operations/` for orchestration-specific logic, `src/runtime/` for generic run helpers | Keep routing policy separate from reusable run/artifact mechanics. |

## 3. Proposed Destination For Workflow-Related Files

Workflows should model end-to-end business processes. They should call agents, core services, integrations, runtime helpers, and storage adapters rather than owning all details directly.

| Current files | Proposed destination | Notes |
| --- | --- | --- |
| `src/preaudit/contract.ts`, `validateOutput.ts`, `errors.ts`, `runId.ts`, `runArtifact.ts`, `scoring.ts`, `report.ts`, `scope.ts` | `src/workflows/lead-preaudit/` | Pre-audit should remain a lead acquisition hook, not part of the authenticated client platform core. |
| `src/preaudit/piClient.ts` | `src/integrations/` or `src/workflows/lead-preaudit/` initially | It is provider-specific LLM access. Prefer an integration adapter once provider boundaries are introduced. |
| `src/preaudit/webContext.ts` | `src/integrations/website/` or `src/workflows/lead-preaudit/` initially | Current structure has no `website` folder yet. Add one later if needed instead of forcing it into `slack`, `railway`, or `crm`. |
| `src/audit/contract.ts`, `validateOutput.ts`, `errors.ts`, `runId.ts`, `runArtifact.ts` | `src/workflows/client-audit/` | Client Audit is the real platform audit workflow. |
| `src/audit/ingestion/*` | `src/workflows/client-audit/ingestion/` | Converts preaudit/intake facts into audit input. Keep separate from UI form code. |
| `src/audit/piClient.ts` | `src/integrations/` or `src/workflows/client-audit/` initially | Same provider-boundary concern as preaudit. |
| `apps/web/src/lib/workflow.server.ts` workflow runners | Eventually split: UI loaders stay in `apps/web`; process orchestration moves toward `src/workflows/*` | Current web server functions read data/artifacts and shell out to scripts. Migrate only after stable storage/runtime APIs exist. |

Future workflow homes with no current direct implementation:

- `src/workflows/conversation-intake`: future intake/conversation capture process.
- `src/workflows/payment-followup`: future payment and collections follow-up process.
- `src/workflows/scheduling-confirmation`: future scheduling workflow.

## 4. Proposed Destination For Runtime And Shared Utilities

| Current files | Proposed destination | Notes |
| --- | --- | --- |
| `src/runtime/agentRunner.ts` | Remain in `src/runtime/agentRunner.ts` | Provider-neutral `AgentRunner` contract for agent execution seams. |
| `src/runtime/claudeAgentRunner.ts` | Remain in `src/runtime/claudeAgentRunner.ts` | Claude Agent SDK adapter; owns SDK imports, settings, stream iteration, and terminal result extraction. |
| `src/common/clientArtifacts.ts` | `src/storage/artifacts.ts` or `src/runtime/artifacts.ts` | It currently owns artifact directory conventions and should become a persistence/runtime boundary. |
| `src/common/runNaming.ts` | `src/shared/runNaming.ts` | Cross-cutting slug/run naming helper. |
| `*/runId.ts` files | `src/runtime/run-id/` or local agent/workflow folders first | They are nearly identical. Consolidate only after agent/workflow moves settle. |
| `*/runArtifact.ts` files | `src/runtime/artifacts/` plus workflow-specific wrappers | They duplicate hashing, git commit capture, event lines, and artifact JSON writing. |
| `*/errors.ts` files | Keep local initially | Domain error classes are low-risk to leave near agent/workflow boundaries until imports stabilize. |
| `*/validateOutput.ts` files | Keep local initially | Validation belongs close to the schema and workflow/agent output contract during early migration. |
| `src/tools/types.ts`, `src/tools/validation.ts` | `src/runtime/tools/` or `src/shared/tools/` | These are cross-cutting tool framework helpers. |
| `src/tools/harness.ts` | `src/runtime/tools/harness.ts` or `src/workflows/lead-preaudit/facts-harness.ts` | The harness is currently preaudit-specific despite using generic tool mechanics. |
| `src/schemas/*` | Remain in `src/schemas` | Root-level schemas now live here; do not move until a schema ownership decision changes. |

## 5. Proposed Destination For Integrations

| Current files | Proposed destination | Notes |
| --- | --- | --- |
| `src/preaudit/piClient.ts`, `src/audit/piClient.ts` | `src/integrations/llm/pi-client.ts` or `src/integrations/pi/` | Provider-specific model calls should not live inside core workflow logic long term. Requires adding a new integration folder. |
| `src/tools/fetchWebPage.ts` | `src/integrations/website/fetch-web-page.ts` | External website retrieval adapter. |
| `src/tools/extractSocialProfiles.ts` | `src/integrations/website/extract-social-profiles.ts` | Website/social parsing helper. |
| `src/tools/detectTrackingMarkers.ts` | `src/integrations/website/detect-tracking-markers.ts` | Website measurement marker detection. |
| `src/integrations/slack` | No current files | Reserved for future Slack adapter. |
| `src/integrations/railway` | No current files | Reserved for future Railway adapter or deployment/runtime integration. |
| `src/integrations/crm` | No current files | Reserved for future CRM adapters. |

Do not place vertical-specific business rules in integrations. Integrations should translate external system APIs into platform-safe inputs and outputs.

## 6. Files That Should Remain In `apps/web`

The web app should retain route, UI, route-tree, styling, and client-facing view logic:

- `apps/web/src/routes/*`: all TanStack routes should remain in the app. Do not move route modules into root `src`.
- `apps/web/src/components/*`: UI components should remain in the app unless a shared UI package is introduced.
- `apps/web/src/styles.css`: app styling remains in the app.
- `apps/web/src/router.tsx` and `apps/web/src/routeTree.gen.ts`: router setup and generated route tree remain in the app.
- `apps/web/src/lib/product-shell.ts`: app product navigation/copy/config should remain app-owned for now.
- `apps/web/src/lib/workflow.functions.ts`: TanStack server function wrappers should remain app-owned.
- `apps/web/src/lib/workflow.ts`: view-model types can remain in the app until core entities and storage adapters are available.
- `apps/web/src/lib/automation-workspace.ts`: UI-oriented workspace configuration should remain app-owned.

`apps/web/src/lib/workflow.server.ts` is mixed. Leave it in place initially because it currently owns app data loading, artifact reads, and script execution. Later commits can extract reusable storage/workflow services while leaving route-facing loader functions in the app.

## 7. Files That Should Remain In `scripts` As Entrypoints

Scripts should remain thin CLI entrypoints even after logic moves under `src/workflows`, `src/agents`, `src/runtime`, and `src/storage`:

- `scripts/live/run-preaudit-live.ts`
- `scripts/live/run-preaudit-report.ts`
- `scripts/live/run-audit-live.ts`
- `scripts/batch/run-preaudit-batch.ts`
- `scripts/batch/run-audit-batch.ts`
- `scripts/batch/run-sales-batch.ts`
- `scripts/batch/run-operations-batch.ts`
- `scripts/batch/run-collections-batch.ts`
- `scripts/batch/run-orchestrator-batch.ts`
- `scripts/demo/run-preaudit-demo.ts`
- `scripts/demo/run-audit-demo.ts`
- `scripts/demo/run-sales-demo.ts`
- `scripts/demo/run-operations-demo.ts`
- `scripts/demo/run-collections-demo.ts`
- `scripts/demo/run-orchestrator-demo.ts`

During migration, update imports in scripts only when the underlying implementation moves. Do not replace scripts with direct package commands until callers in `package.json` and `apps/web/src/lib/workflow.server.ts` have been updated together.

## 8. Files That Should Not Be Moved Yet

Do not move these until the new boundaries have tests or compatibility wrappers:

- `src/schemas/*`: schema root has already been established.
- `apps/web/src/routes/*`: route movement would change route generation and UI behavior.
- `apps/web/src/routeTree.gen.ts`: generated by TanStack tooling.
- `apps/web/src/lib/workflow.server.ts`: too coupled to current data/artifact paths and script execution to move in one step.
- `data/clients/*`: current local client store and samples.
- `data/mock/*`: demo fixture inputs.
- `artifacts/clients/*`: generated outputs, latest pointers, reports, and event logs.
- `artifacts/.DS_Store`: local metadata; should not be part of architecture migration.
- Existing product docs under `docs/product/*`: keep as product source material; update only when decisions change.
- Placeholder READMEs and `.gitkeep` files under the new architecture folders: keep until real files replace them.

## 9. Recommended Migration Order By Small Commits

1. Add compatibility barrels without moving files.
   - Introduce `index.ts` exports only where they reduce future import churn.
   - Keep existing direct imports valid.

2. Extract shared naming and artifact path helpers.
   - Move or wrap `src/common/runNaming.ts` and `src/common/clientArtifacts.ts` behind `src/shared` or `src/storage` APIs.
   - Update scripts and web server imports in one small commit.

3. Consolidate generic runtime helpers.
   - Create shared run id and artifact/event helper modules in `src/runtime`.
   - Keep domain-specific artifact schemas and JSON shapes local.
   - Provider isolation for collections, sales, operations, and orchestrator now goes through `src/runtime/agentRunner.ts` and `src/runtime/claudeAgentRunner.ts`.

4. Move one specialist agent family at a time.
   - Start with `collections` because it has focused validation and agent tests.
   - Then move `sales`, `operations`, and the orchestrator coordinator.
   - Keep prompt contracts and validators close to each moved agent unless runtime/shared ownership is obvious.

5. Move Client Audit workflow files.
   - Move `src/audit/ingestion/*` into `src/workflows/client-audit/ingestion/`.
   - Then move audit contract, validation, run id, artifact, errors, and agent imports in a separate commit.

6. Move Lead Preaudit workflow files.
   - Move preaudit scoring, scope, report, validation, and artifact logic into `src/workflows/lead-preaudit/`.
   - Keep the product boundary explicit: pre-audit is acquisition, not the platform audit.

7. Extract website and LLM integrations.
   - Move website fetch/social/tracking adapters into a website integration folder.
   - Move PI client adapters behind a provider-specific integration boundary.

8. Refactor `apps/web/src/lib/workflow.server.ts`.
   - Leave app-facing loader/server functions in the app.
   - Pull reusable artifact reads, client data reads, and workflow launchers into `src/storage`, `src/runtime`, and `src/workflows`.

9. Add vertical/module pack boundaries.
   - Put vertical-specific behavior under `src/core/modules` or a future `src/modules` convention.
   - Keep core entities and services horizontal for small-business operations.

## 10. Risks And Import Considerations

- The project uses NodeNext ESM with explicit `.js` import specifiers. Every moved TypeScript file will require careful relative import updates.
- `package.json` scripts call fixed files under `scripts/*`; keep scripts stable or update package scripts in the same commit as entrypoint changes.
- `apps/web/src/lib/workflow.server.ts` shells out to `scripts/live/run-preaudit-live.ts` and `scripts/live/run-audit-live.ts`. Moving those scripts or changing their CLI arguments would affect the web app.
- `apps/web/src/routeTree.gen.ts` is generated from route file paths. Do not move route files as part of architecture migration.
- `data/clients` and `artifacts/clients` paths are hardcoded in root source, scripts, and the web server loader. Storage extraction should preserve path compatibility first.
- Several `runArtifact.ts` files duplicate behavior but likely encode domain-specific JSON fields. Consolidate mechanics before consolidating payload types.
- Preaudit and Client Audit currently share handoff logic through audit ingestion and draft intake generation. Preserve the product distinction while keeping the handoff intact.
- The current collections, sales, operations, and orchestrator agents use the runtime Claude adapter instead of importing `@anthropic-ai/claude-agent-sdk` directly. Audit and preaudit still have separate provider/client concerns.
- Tests currently cover collections validation and deterministic agent behavior for collections, sales, and operations. Add comparable seams before moving higher-risk workflow code.
- Vertical-specific assumptions should not migrate into `src/core`. Put future vertical behavior in modules or vertical packs so the platform remains horizontal.
