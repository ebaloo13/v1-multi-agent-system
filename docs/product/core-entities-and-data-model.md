# Core Entities and Data Model

## Purpose

EBC needs a clear core entity and data model before the platform moves from local files and workflow artifacts toward a real backend.

The goal is not to overdesign the database early. The goal is to make product and engineering decisions consistent so future workspace features, activity feeds, alerts, reports, workstreams, agents, and multi-client operations are built on stable objects.

This model should help EBC:

- Connect system states, events, activity, and alerts to real product entities.
- Reduce ambiguity between product language and implementation objects.
- Prepare for database/backend design.
- Make the client workspace easier to reason about.
- Make internal operations and Slack-style alerting easier to route later.
- Preserve traceability from client-facing outputs back to workflow runs and artifacts.
- Support the product flow: **Website URL → Preaudit → Business Context → Audit → Orchestrator → Specialized Agents**.

## Naming Convention

Client-facing/product-facing term for the context step: **Business Context**.

Spanish reference: **Contexto del negocio**.

Internal legacy term: `intake`, used only where current implementation details still require it, such as existing file names, CLI flags, metadata fields, or ingestion modules.

Client-facing/product-facing term for generated reports/files: **Outputs**.

Internal technical term: `artifacts`, used for storage paths, loaders, database table names, and provenance metadata.

## Core Entities

| Entity | Represents | Level | Why it exists | First-class table later? |
| --- | --- | --- | --- | --- |
| Client | The business/account EBC is diagnosing and supporting. | Client-level | Anchor for workspace, lifecycle state, runs, workstreams, agents, artifacts, events, and alerts. | Yes |
| Contact | A person associated with a client. | Client-level | Captures lead, stakeholder, decision-maker, or operator contact details. | Yes, but can be Phase 2 |
| Client Context | Current business facts and Business Context used to run audits and guide execution. | Client-level | Stores the structured business context behind diagnosis and recommendations. | Yes |
| Workflow Run | An execution instance of preaudit, audit, orchestrator, or agent workflow. | Run-level | Tracks status, inputs, outputs, failures, duration, and provenance. | Yes |
| Artifact | A generated or uploaded output such as report, JSON, audit output, or client-facing deliverable. | Run/client-level | Links visible outputs and source files back to runs and clients. | Yes |
| Workstream | A transformation track such as Website improvement, Sales follow-up, Market study, or CRM review. | Client/workstream-level | Turns recommendations into scoped, trackable operating work. | Yes |
| Agent Definition | Catalog entry for an available agent capability. | Platform-level | Defines reusable agent types such as Sales Agent or Research Agent. | Eventually; can start static |
| Client Agent | Client-specific status of an agent recommendation, setup, or activation. | Client/agent-level | Tracks which agents are relevant, recommended, ready, or active for a client. | Yes |
| Event | Append-only record of something meaningful that happened. | Cross-entity | Powers activity history, state transitions, internal ops, and audit trails. | Yes |
| Alert | Operational item requiring attention, often derived from events or state rules. | Client/internal-ops-level | Supports internal alerting, future Slack routing, and operational follow-up. | Yes, Phase 2 acceptable |
| Note | Human-authored context, decision, or observation. | Cross-entity | Captures operator/client notes with visibility controls. | Yes |

## Entity Details

### Client

Represents the business/account being evaluated or supported.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable canonical ID. |
| `slug` | Human-readable unique slug used in URLs and artifact grouping. |
| `name` | Client/business name. |
| `website` | Primary website URL. |
| `primary_lifecycle_state` | Current client lifecycle state, for example `lead`, `audit_completed`, `execution_active`. |
| `source` | Lead/source channel, for example landing page, manual, referral, import. |
| `priority` | Optional internal priority/tier. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |
| `archived_at` | Set when archived. |

Implementation notes:

- Client is the root object for most product surfaces.
- `primary_lifecycle_state` is current state, not history. History belongs in Events.
- The current local `client_slug` maps naturally to `clients.slug`.

### Contact

Represents a person connected to a client.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable contact ID. |
| `client_id` | Parent client. |
| `name` | Person name, optional early. |
| `email` | Email address. |
| `phone` | Optional. |
| `role` | Lead, owner, decision-maker, operator, finance, etc. |
| `source` | Landing page, manual, CRM import, referral. |
| `is_primary` | Primary client-facing contact. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Implementation notes:

- Contacts can be minimal at first. The current landing flow may only capture email.
- Do not block early implementation on full stakeholder modeling.

### Client Context

Represents the current structured Business Context for the client.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable context record ID. |
| `client_id` | Parent client. |
| `business_name` | Confirmed business name. |
| `industry` | Industry/category. |
| `primary_market` | Location or market. |
| `business_model` | Lead gen, bookings, services, ecommerce, recurring service, etc. |
| `goals` | Structured or JSON list of business goals. |
| `pains` | Structured or JSON list of known pains. |
| `systems` | Tools/systems in use. |
| `lead_sources` | Current lead channels. |
| `lead_handling` | Summary of lead handling process. |
| `constraints` | Budget, team, data, time, operational limits. |
| `available_assets` | Website, CRM, ads accounts, spreadsheets, PDFs, etc. |
| `available_data` | Lead data, booking data, revenue data, reports, exports. |
| `source` | Generated draft, client submitted, consultant edited, imported. |
| `completion_state` | Draft, partial, complete, needs review. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Implementation notes:

- Start with one current Client Context record per Client.
- Versioning can come later if needed.
- Historical changes should emit Events such as `business_context_saved` or `business_context_completed`.
- Current legacy `*-audit-intake*.json` maps to this entity.

### Workflow Run

Represents one execution of a workflow.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable run ID. |
| `client_id` | Parent client. |
| `type` | `preaudit`, `audit`, `orchestrator`, `agent`, `report_generation`, etc. |
| `status` | `queued`, `running`, `completed`, `failed`, `cancelled`, `retried`. |
| `display_run_id` | Human-readable run label if useful. |
| `agent_definition_id` | Optional, for agent runs. |
| `client_agent_id` | Optional, for client-specific agent runs. |
| `source_run_id` | Optional upstream run relationship. |
| `input_source` | Business Context, preaudit artifact, manual import, demo fixture, etc. |
| `started_at` | Start timestamp. |
| `completed_at` | Completion timestamp. |
| `duration_ms` | Optional duration. |
| `error_summary` | Short internal-safe error summary. |
| `metadata` | JSON for implementation-specific details. |

Implementation notes:

- Workflow Run is where operational status belongs for a specific execution.
- Run failures should emit Events and may create Alerts.
- Existing `run.json` files map to Workflow Run plus Artifact records.

### Artifact

Represents generated or uploaded outputs.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable artifact ID. |
| `client_id` | Parent client. |
| `run_id` | Run that produced it, nullable for manual uploads. |
| `workstream_id` | Optional related workstream. |
| `client_agent_id` | Optional related client agent. |
| `type` | `report`, `run_json`, `audit_output`, `preaudit_report`, `business_context_json`, `client_upload`, etc. |
| `title` | Human-readable title. |
| `path` | Local path for early implementation. |
| `url` | Future storage URL. |
| `visibility` | `client`, `internal`, or `both`. |
| `status` | `draft`, `published`, `superseded`, `stale`, `archived`. |
| `created_at` | Creation timestamp. |
| `metadata` | JSON for artifact-specific details. |

Implementation notes:

- Artifacts should make provenance explicit.
- Client-facing Reports can later be specialized Artifact records or their own Report entity.
- Stale artifacts should create internal events and possibly alerts.

### Workstream

Represents an active or potential transformation track.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable workstream ID. |
| `client_id` | Parent client. |
| `title` | Client-facing title. |
| `type` | Website improvement, Sales follow-up, Market study, CRM/back-office review, etc. |
| `state` | `identified`, `needs_input`, `ready_for_design`, `ready_to_activate`, `active`, `blocked`, `completed`, `archived`. |
| `owner_id` | Optional internal owner/user reference. |
| `priority` | Optional priority/order. |
| `linked_client_agent_id` | Optional primary supporting client agent. |
| `next_step` | Short current next action. |
| `blocker_summary` | Present when blocked. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |
| `completed_at` | Completion timestamp. |

Implementation notes:

- Workstream state is current state. Workstream history belongs in Events.
- A Workstream can have zero, one, or many supporting Client Agents over time. The `linked_client_agent_id` can be a convenience field early.

### Agent Definition

Represents a reusable agent capability available on the platform.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable agent definition ID. |
| `key` | Stable key, for example `sales_agent`, `operations_agent`, `research_agent`. |
| `label` | Client-facing or internal display label. |
| `category` | Sales, operations, finance, web/growth, research, reporting. |
| `description` | What this agent does. |
| `capability_type` | Diagnostic, execution, monitoring, reporting, research. |
| `is_active` | Whether this definition is available for use. |
| `created_at` | Creation timestamp if table-backed later. |

Implementation notes:

- This can start as a static catalog in code/config.
- It does not need to become a database table before Client Agent state exists.

### Client Agent

Represents the status of an agent for a specific client.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable client-agent ID. |
| `client_id` | Parent client. |
| `agent_definition_id` | Agent catalog reference. |
| `state` | `not_relevant`, `candidate`, `recommended`, `setup_needed`, `ready`, `active`, `paused`, `retired`. |
| `linked_workstream_id` | Optional primary workstream relationship. |
| `recommendation_source` | Audit, orchestrator, operator, playbook. |
| `setup_requirements` | JSON/list of required access, data, approval, or configuration. |
| `activation_notes` | Optional internal/client-safe summary. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |
| `activated_at` | Set when active. |
| `retired_at` | Set when retired. |

Implementation notes:

- Agent Definition says what the agent is. Client Agent says what it means for this client.
- Client Agent state should drive the Agents surface.
- Agent run history should be stored as Workflow Runs related to Client Agent.

### Event

Represents an append-only product/operations event.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable event ID. |
| `type` | Stable event type, for example `audit_completed`. |
| `category` | Lifecycle, workflow_run, workstream, agent, client_input, alert, system_warning. |
| `client_id` | Parent client. |
| `workstream_id` | Optional. |
| `client_agent_id` | Optional. |
| `agent_definition_id` | Optional. |
| `run_id` | Optional. |
| `artifact_id` | Optional. |
| `alert_id` | Optional. |
| `note_id` | Optional. |
| `actor_type` | `system`, `agent`, `operator`, or `client`. |
| `actor_id` | Optional actor reference. |
| `visibility` | `client`, `internal`, or `both`. |
| `severity` | `info`, `success`, `warning`, or `critical`. |
| `title` | Short display label. |
| `message` | Human-readable summary. |
| `metadata` | JSON details such as old/new state, artifact path, error code. |
| `created_at` | Timestamp. |

Implementation notes:

- Events are append-only.
- Activity should be derived primarily from Events.
- State changes should update current state and emit an Event.

### Alert

Represents an internal item requiring attention or follow-up.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable alert ID. |
| `client_id` | Parent client. |
| `type` | Failure, blocker, missing input, stale output, SLA risk, agent setup, unusual state. |
| `status` | `open`, `acknowledged`, `resolved`, `ignored`. |
| `severity` | `info`, `warning`, `critical`. |
| `owner_id` | Optional assigned owner. |
| `source_event_id` | Event that created the alert. |
| `workstream_id` | Optional. |
| `client_agent_id` | Optional. |
| `run_id` | Optional. |
| `artifact_id` | Optional. |
| `title` | Short internal label. |
| `summary` | Operationally useful description. |
| `recommended_action` | Suggested next action. |
| `created_at` | Creation timestamp. |
| `acknowledged_at` | Optional. |
| `resolved_at` | Optional. |

Implementation notes:

- Alerts can be derived from Events at first.
- A full alerts table can come after a basic internal ops list exists.
- Alerts are internal by default.

### Note

Represents human-authored context.

Likely fields:

| Field | Notes |
| --- | --- |
| `id` | Stable note ID. |
| `client_id` | Parent client. |
| `workstream_id` | Optional. |
| `client_agent_id` | Optional. |
| `run_id` | Optional. |
| `artifact_id` | Optional. |
| `author_type` | `operator`, `client`, `system`. |
| `author_id` | Optional user/contact reference. |
| `visibility` | `client`, `internal`, or `both`. |
| `body` | Note content. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

Implementation notes:

- Notes should not replace Events.
- Notes are human context. Events are structured records of what happened.
- Internal notes should never appear in client activity unless explicitly marked client-visible.

## Relationship Model

### Relationship Table

| Source | Relationship | Target | Notes |
| --- | --- | --- | --- |
| Client | has many | Contacts | One may be primary. |
| Client | has one current | Client Context | Versioning can come later. |
| Client | has many | Workflow Runs | Preaudit, audit, orchestrator, agent runs. |
| Workflow Run | generates many | Artifacts | Reports, JSON outputs, generated files. |
| Client | has many | Artifacts | Some artifacts may not come from a run. |
| Client | has many | Workstreams | Workstreams progress independently. |
| Client | has many | Client Agents | Client-specific agent state. |
| Agent Definition | has many | Client Agents | Reusable catalog to client-specific status. |
| Client Agent | may support many | Workstreams | Early implementation can use one nullable link. |
| Workstream | may have many | Client Agents | Useful once execution becomes richer. |
| Event | may reference | Client, Workstream, Client Agent, Run, Artifact, Alert, Note | Events form the activity and internal ops timeline. |
| Alert | often derives from | Event or state rule | Alerts require attention. |
| Note | may relate to | Client, Workstream, Agent, Run, Artifact | Notes add human context. |

### Hierarchy View

```txt
Client
├─ Contacts
├─ Client Context
├─ Workflow Runs
│  └─ Artifacts
├─ Workstreams
│  ├─ Notes
│  ├─ Events
│  └─ Client Agents
├─ Client Agents
│  ├─ Agent Definition
│  ├─ Workflow Runs
│  └─ Events
├─ Artifacts
├─ Events
├─ Alerts
└─ Notes
```

## Current State vs History

EBC should store current state directly on entities for fast product rendering, but preserve state changes in append-only Events.

### Store Current State On Entities

| Entity | Current state field |
| --- | --- |
| Client | `primary_lifecycle_state` |
| Client Context | `completion_state` |
| Workflow Run | `status` |
| Artifact | `status`, `visibility` |
| Workstream | `state` |
| Client Agent | `state` |
| Alert | `status`, `severity`, `owner_id` |

### Store History In Events

Events should record:

- Client lifecycle state changes.
- Business Context saved/completed.
- Workflow run started/completed/failed/retried.
- Artifact created/published/superseded/stale.
- Workstream created/activated/blocked/completed.
- Agent recommended/setup needed/ready/activated/paused/retired.
- Alert created/acknowledged/resolved.
- Operator overrides.
- Manual notes added.

### Rule Of Thumb

- Entity fields answer: "What is true now?"
- Events answer: "What happened over time?"
- Activity feeds should be derived primarily from Events.
- Internal Ops views should combine current state, open Alerts, and recent Events.
- Reports and dashboards may denormalize summaries later, but Events remain the source of history.

## Minimum Viable Database Direction

### Phase 1 Tables

| Table | Why first |
| --- | --- |
| `clients` | Root account object for every workspace and operation. |
| `client_contexts` | Stores Business Context needed for audit quality and workspace state. |
| `workflow_runs` | Tracks preaudit, audit, orchestrator, and agent execution state. |
| `artifacts` | Connects generated reports/files to clients and runs. |
| `workstreams` | Supports the workspace evolution from reports to execution tracks. |
| `client_agents` | Supports the Agents surface and client-specific agent readiness. |
| `events` | Powers Activity, history, state changes, and internal ops. |
| `notes` | Captures human context and operator decisions. |

Why this order makes sense:

- It supports the current flow without requiring a full CRM.
- It gives the workspace a stable backend shape.
- It supports Activity before Slack/alerts become complex.
- It preserves traceability from client to run to artifact.
- It makes workstreams and agents first-class without overbuilding automation.

### Phase 2 Tables

| Table | Why later |
| --- | --- |
| `contacts` | Useful for CRM depth, but early flow can start with email on Client or Client Context. |
| `alerts` | Can initially be derived from Events; later needs owner/status/routing. |
| `playbooks` | Useful after repeatable workstream procedures are defined. |
| `reports` | May start as Artifacts; specialize later if report lifecycle grows. |
| `assignments` or `owners` | Needed once multiple operators share responsibility. |
| `integrations` | Needed for CRM, Slack, ads, calendar, email, or data connectors. |

## Flexibility And Early Implementation Guidance

Avoid overengineering the first backend version.

Practical simplifications:

- Contacts can be minimal or deferred. Store primary email on Client early if needed.
- Client Context can start as one current record before versioning.
- Agent Definition can start as a static catalog in code or config.
- Workstream-to-agent relationships can be nullable and simple.
- Alerts can initially be derived from Events before becoming full records.
- Artifact `path` can support local files before a storage URL exists.
- Owners can be simple strings or nullable IDs before a user/team model exists.
- Metadata JSON is acceptable for workflow-specific details early, but core query fields should remain explicit.
- Some relationships can be nullable until the product flow demands strict enforcement.

Do not simplify away:

- Stable Client IDs.
- Current state fields.
- Append-only Events.
- Run-to-artifact provenance.
- Visibility fields for Events, Artifacts, and Notes.
- Clear separation between Client Agent and Agent Definition.

## Mapping To Product Surfaces

| Product surface | Entity support |
| --- | --- |
| Dashboard | Client, Client Context, Workstreams, Client Agents, latest Events, open Alerts, latest Outputs. |
| Diagnosis | Workflow Runs, Artifacts, Client Context, Events for preaudit/Business Context/audit progression, and client-facing Outputs. |
| Workstreams | Workstreams, related Client Agents, Notes, Events, and linked Outputs. |
| Agents | Agent Definitions, Client Agents, agent Workflow Runs, setup requirements, agent Events. |
| Activity | Events filtered by visibility and entity relationships. |
| Reports | Artifacts first; later Reports table if report lifecycle needs publishing/versioning. |
| Playbooks | Workstreams first; later Playbooks table connected to Workstream type and Agent Definition. |
| Internal Ops | Clients, current states, Workflow Runs, Events, Alerts, Notes, stale Artifacts, blocked Workstreams. |
| Slack/internal notifications | Alerts and selected Events with routing rules. |

## Mapping Current File-Backed Data To Future Entities

| Current file/artifact concept | Future entity |
| --- | --- |
| `data/clients/*-workspace.json` | Client, Contact |
| `data/clients/*-audit-intake.draft.json` | Client Context draft |
| `data/clients/*-audit-intake.json` | Client Context current/confirmed |
| `artifacts/clients/<client>/preaudit/<run>/run.json` | Workflow Run + Artifact |
| `artifacts/clients/<client>/preaudit/<run>/report.md` | Artifact |
| `artifacts/clients/<client>/audit/<run>/run.json` | Workflow Run + Artifact |
| `artifacts/clients/<client>/<agent>/latest.json` | Convenience pointer; should become query for latest Workflow Run/Artifact |
| `events.ndjson` | Event records |

## Recommended Next Implementation Steps

1. Align current workspace data loaders to this formal entity model, even before a database exists.
2. Define canonical IDs and relationship conventions for Client, Workflow Run, Artifact, Workstream, and Client Agent.
3. Decide which current file-backed data maps to Client, Client Context, Workflow Run, and Artifact records.
4. Design the initial database schema around Phase 1 tables.
5. Keep Agent Definition as static config until the product needs a table-backed catalog.
6. Add an append-only Event model before building richer Activity or Internal Ops surfaces.
7. Plan a migration path from local files to DB-backed records without breaking existing artifacts.
8. Add Alerts only after internal Events can identify failures, blockers, stale outputs, and missing inputs reliably.
