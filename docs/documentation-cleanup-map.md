# Documentation Cleanup Map

This is a cleanup inventory only. It does not move, delete, or rewrite existing docs.

## Current Product Direction

- Product: AI operations workspace for small businesses.
- Client workspace: simple, non-technical, and focused on business operations.
- Internal ops workspace: separate from the client-facing experience.
- Pre-audit: lead acquisition hook, not part of the authenticated client platform.
- Core platform modules: Inbox, Tasks/WorkItems, Payments, Schedule, Files, Integrations.
- Vertical behavior: layered through vertical packs/modules, not hardcoded in core.
- Agents: domain coordinators plus specialist agents.
- Coding/technical agents: internal implementation capabilities, not client-facing product features.

## Recommended Cleanup Structure

- `docs/product/`: current product source of truth, client workspace model, module model, Business Context, platform language.
- `docs/architecture/`: folder architecture, migration maps, schema/runtime/storage boundaries, agent/workflow organization.
- `docs/ops/`: internal ops workspace, events, alerts, runbooks, operational visibility.
- `docs/archive/`: superseded product-surface docs, old flow maps, historical implementation notes kept for reference.

## 1. Keep Current

| Path | Current purpose | Matches current direction? | Recommended action | Reason |
| --- | --- | --- | --- | --- |
| `docs/architecture.md` | Short note defining new root architecture folders. | Yes | Keep; later move to `docs/architecture/architecture.md`. | Correctly describes `core`, `agents`, `workflows`, `integrations`, `runtime`, `storage`, and `shared`. |
| `src/core/README.md` | Placeholder for shared business objects/services. | Yes | Keep. | Still matches horizontal core direction; can later mention Inbox, WorkItems, Payments, Schedule, Files, modules. |
| `src/agents/README.md` | Placeholder for domain coordinators and specialist agents. | Yes | Keep. | Matches the agent organization direction. |
| `src/workflows/README.md` | Placeholder for orchestrated business processes. | Yes | Keep. | Matches workflow architecture. |
| `src/integrations/README.md` | Placeholder for external system adapters. | Yes | Keep. | Matches integration boundary. |
| `src/runtime/README.md` | Placeholder for execution utilities. | Yes | Keep. | Matches runtime boundary. |
| `src/storage/README.md` | Placeholder for persistence adapters. | Yes | Keep. | Matches storage boundary. |
| `src/shared/README.md` | Placeholder for cross-cutting helpers. | Yes | Keep. | Matches shared helper boundary. |

## 2. Update Needed

| Path | Current purpose | Matches current direction? | Recommended action | Reason |
| --- | --- | --- | --- | --- |
| `README.md` | Root project overview and local workflow guide. | Partially | Update in place. | Still useful for current commands, but frames the repo as SME consulting workflows and lists `src/tools/` as the tool harness home. It should explain the AI operations workspace direction, pre-audit as acquisition, Client Audit as platform workflow, and new `src/shared`/`src/runtime` utility ownership. |
| `CLAUDE.md` | Agent/coding guidance for the repo. | Partially | Update in place. | It references old `src/common` and `src/tools` ownership and centers a consulting workflow. It should emphasize horizontal operations modules, separate internal ops, no client-facing coding agents, and the new architecture folders. |
| `apps/web/README.md` | Web app product/runtime guide. | Partially | Update in place. | It already mentions horizontal modules and vertical packs, but still presents `Dashboard / Diagnosis / Workstreams / Agents` as workspace v2. Needs simpler client workspace model and separate internal ops workspace. |
| `apps/web/CLAUDE.md` | Frontend-specific implementation guidance. | Partially | Update in place. | Still useful, but says Workspace v2 is organized around Diagnosis, Workstreams, and Agents. Needs client-facing simplicity, internal-only technical/agent surfaces, and modular operations language. |
| `docs/product/product-source-of-truth.md` | Master product alignment doc. | No, as source of truth | Rewrite in place before using as authoritative. | It currently defines the official client flow as `Website URL -> Preaudit -> Business Context -> Audit -> Orchestrator -> Specialized Agents` and makes Diagnosis/Workstreams/Agents client-facing. This conflicts with pre-audit as lead hook and the simpler operations workspace direction. |
| `docs/product/core-entities-and-data-model.md` | Product entity/data model. | Partially | Update in place. | Good entity thinking, but it centers Workstreams and Client Agents. Add core horizontal entities such as Inbox/Conversation, WorkItem, Payment, Schedule item, File, Integration, Module, VerticalPack, and separate internal agent/run entities from client-facing objects. |
| `docs/product/initial-database-schema.md` | Initial DB schema blueprint. | Partially | Update in place. | Useful schema foundation, but Phase 1 tables are still based on clients, workstreams, client agents, artifacts, and events. Needs module-oriented operations tables and vertical-pack layering. |
| `docs/product/implementation-roadmap.md` | Build sequencing. | Partially | Update in place. | Current phases prioritize Dashboard, Diagnosis, Workstreams, and Agents. Re-sequence toward client operations modules, internal ops, storage/runtime boundaries, and Client Audit as the platform workflow. |
| `docs/product/system-states-and-events.md` | Lifecycle and event model. | Partially | Update in place. | Strong event/state foundation, but client surfaces and lifecycle still place preaudit and agents inside the client journey. Split acquisition events from platform events and separate client-safe Activity from internal ops. |
| `docs/product/activity-and-internal-ops.md` | Activity, internal ops, and alert model. | Partially | Update in place; likely move to `docs/ops/`. | Good internal ops material, but client-facing Activity is too tied to preaudit/audit/workstreams/agents. Preserve internal ops and alert guidance while simplifying client-facing activity. |
| `docs/product/stage-based-workflow-and-readiness-model.md` | Governed stage/readiness model. | Partially | Update in place. | The stage/readiness model is useful for horizontal workflows, but examples center consulting delivery and preaudit-to-audit. Add module workflows for Inbox, WorkItems, Payments, Schedule, Files, and vertical packs. |
| `docs/product/audit-intake-form.md` | Business Context form spec. | Partially | Update in place. | Useful context collection spec, but describes the form as transition from preaudit to full audit and lead-to-client conversion. Reframe as Client Audit/Business Context input after acquisition. |
| `docs/product/preaudit-to-audit-flow.md` | Preaudit-to-audit product handoff. | Mostly | Update and move under `docs/product/` or `docs/architecture/` depending on use. | It correctly says preaudit is the hook and not a full diagnosis, but still ends in orchestrator and specialized agents as a product flow. Clarify that preaudit lives outside the client platform and Client Audit starts the platform workflow. |
| `docs/product/activity-section-blueprint.md` | Client-facing Activity section design. | Partially | Update or merge into new client workspace doc. | Useful client-safe event principles, but assumes Activity as a major client-facing section and includes agent/workstream events. Current direction needs a simpler client workspace and internal ops separation. |
| `docs/product/impact-section-blueprint.md` | Future client-facing Impact section design. | Partially | Update or merge into new client workspace doc. | Useful business-value framing, but may overstate Impact as a standalone section. Recast as simple client value summaries unless the product keeps a dedicated Impact module. |
| `docs/product/ai-core-definition.md` | AI Core conceptual model. | Partially | Update in place. | Strong platform-core concept, but it centers Diagnosis/Workstreams/Agents/Activity and “consulting operating system.” Reframe around horizontal operations modules and internal agent orchestration. |
| `docs/architecture-migration-map.md` | Source-file migration inventory. | Partially | Update after utility migration. | It still references `src/common` and `src/tools` ownership as current. Update to reflect `src/shared/runNaming.ts`, `src/shared/clientArtifacts.ts`, and `src/runtime/tools/*` after the runtime/shared migration. Later move to `docs/architecture/`. |
| `docs/FLOW-MAP.md` | Detailed current implementation flow map. | Partially | Update current paths or archive after replacement. | It is useful for implementation history, but references old `src/tools` helper ownership and presents the current architecture as source of truth. It should not remain the main source after architecture docs are reorganized. |

## 3. Archive Candidate

| Path | Current purpose | Matches current direction? | Recommended action | Reason |
| --- | --- | --- | --- | --- |
| `docs/FLOW-MAP.md` | Detailed old/current agent flow map. | Partially | Archive candidate once a new `docs/architecture/current-runtime-flow.md` exists. | Valuable historical detail, but too implementation-specific and includes older path ownership. |
| `docs/product/activity-section-blueprint.md` | Standalone client Activity section blueprint. | Partially | Archive candidate if client Activity is no longer a primary section. | Keep only if the client workspace keeps a visible Activity surface; otherwise fold client-safe principles into a simpler workspace doc and archive the standalone blueprint. |
| `docs/product/impact-section-blueprint.md` | Standalone Impact section blueprint. | Partially | Archive candidate if Impact is not a near-term client module. | The value framing is useful, but the section-level design may be ahead of the simplified client workspace direction. |
| `docs/product/preaudit-to-audit-flow.md` | Acquisition-to-platform handoff flow. | Mostly | Archive candidate only after a new acquisition/client-audit boundary doc replaces it. | It contains correct product logic about preaudit as a hook, but it belongs as a historical handoff doc if the new docs separate acquisition from platform. |

## 4. Delete Candidate Only If Clearly Duplicate Or Empty

| Path | Current purpose | Matches current direction? | Recommended action | Reason |
| --- | --- | --- | --- | --- |
| None identified | N/A | N/A | Do not delete anything yet. | No reviewed project doc is empty or purely duplicate. Short `src/*/README.md` files are useful placeholders for tracked architecture folders. |

## Proposed Cleanup Order

1. Create the folder structure: `docs/architecture/`, `docs/ops/`, and `docs/archive/`.
2. Rewrite `docs/product/product-source-of-truth.md` first so later edits have one current authority.
3. Update `README.md`, `CLAUDE.md`, `apps/web/README.md`, and `apps/web/CLAUDE.md` to match the new source of truth.
4. Move architecture docs into `docs/architecture/` and update stale path ownership from `src/common`/`src/tools` to `src/shared`/`src/runtime`.
5. Move internal ops and alerting material into `docs/ops/`.
6. Update the entity/schema docs around horizontal modules: Inbox, Conversations, WorkItems, Payments, Schedule, Files, Integrations, Modules, and VerticalPacks.
7. Decide whether Activity and Impact remain standalone client sections. If not, merge useful principles into a simpler client workspace doc and archive the standalone blueprints.
8. Archive old flow maps only after replacement docs exist.

## New Docs Worth Creating

- `docs/product/product-source-of-truth.md`: rewrite as the single current authority.
- `docs/product/client-workspace.md`: simple non-technical client workspace model.
- `docs/product/internal-ops-workspace.md` or `docs/ops/internal-ops-workspace.md`: internal operational control surface.
- `docs/product/platform-modules.md`: Inbox, WorkItems, Payments, Schedule, Files, Integrations, and module relationships.
- `docs/product/vertical-packs.md`: rules for layering vertical behavior without hardcoding it into core.
- `docs/architecture/current-runtime-flow.md`: replacement for `docs/FLOW-MAP.md`.
- `docs/architecture/source-layout.md`: current folder ownership including `src/shared` and `src/runtime`.
- `docs/architecture/agents-and-workflows.md`: domain coordinators, specialist agents, workflows, and internal technical agent boundaries.

## Notes For Future Cleanup

- Keep pre-audit language explicitly acquisition-oriented.
- Treat Client Audit as the first real platform audit workflow.
- Avoid making Diagnosis, Workstreams, and Agents the default client-facing navigation unless the product direction changes again.
- Keep coding and technical agents out of client-facing product docs except as internal implementation capabilities.
- When docs mention integrations, distinguish product modules from external adapter code under `src/integrations`.
- When docs mention vertical examples, describe them as vertical packs/modules layered on the horizontal core.
