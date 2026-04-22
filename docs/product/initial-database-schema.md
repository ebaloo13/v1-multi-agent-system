# Initial Database Schema

## Purpose

EBC needs an initial database schema direction so future backend work can move from local files and artifacts toward stable operational product data.

This schema blueprint should help EBC:

- Prepare backend implementation without locking into a final ORM or migration plan too early.
- Reduce ambiguity across product, operations, and engineering.
- Connect clients, Business Context, workflow runs, artifacts, workstreams, agents, events, and notes.
- Support future Activity, Internal Ops, and alerting surfaces.
- Preserve traceability from file-backed artifacts to database-backed records.
- Provide a sane Phase 1 foundation before introducing contacts, alerts, reports, playbooks, integrations, or assignment models.

## Scope

This document is:

- An initial schema blueprint.
- Implementation-oriented, but not final SQL.
- Focused on operational product data.
- A bridge from the current file-backed workflow to a future DB-backed model.

This document is not:

- A final migration plan.
- A complete ORM implementation.
- A full analytics or warehouse model.
- A replacement for artifact storage.
- A complete authorization or user-management design.

## Recommended Phase 1 Tables

| Table | Purpose | Why Phase 1 | Relationship anchors | Obvious indexes |
| --- | --- | --- | --- | --- |
| `clients` | Root account/workspace record. | Every product surface needs a client anchor. | Parent for nearly all other tables. | `slug`, `primary_state`, `created_at` |
| `client_contexts` | Current Business Context used for audit quality and recommendations. | Needed to move beyond raw `*-audit-intake*.json` files. | `client_id` | `client_id`, `completion_state`, `updated_at` |
| `workflow_runs` | Preaudit, audit, orchestrator, and agent run records. | Needed for diagnosis history, failures, and provenance. | `client_id`, optional agent links later. | `client_id`, `run_type`, `status`, `started_at` |
| `artifacts` | Metadata for reports, JSON outputs, and generated files. | Keeps files/storage traceable without moving all content into DB. | `client_id`, `workflow_run_id` | `client_id`, `workflow_run_id`, `artifact_type`, `visibility` |
| `workstreams` | Client transformation tracks. | Workspace needs workstreams as first-class operating objects. | `client_id`, optional `linked_client_agent_id` | `client_id`, `state`, `priority` |
| `client_agents` | Client-specific agent relevance/readiness/activation state. | Supports Agents surface without needing a full agent registry table yet. | `client_id`, optional `linked_workstream_id` | `client_id`, `agent_key`, `state` |
| `events` | Append-only operational and activity history. | Activity and Internal Ops should come from events. | Optional links to most tables. | `client_id`, `created_at`, `category`, `type`, `visibility`, `severity` |
| `notes` | Human-authored context and decisions. | Operators need notes before a full ops/CRM layer exists. | `client_id`, polymorphic related entity. | `client_id`, `visibility`, `created_at` |

## Suggested Phase 2 Tables

| Table | Why it can wait | When it becomes necessary |
| --- | --- | --- |
| `contacts` | Early flow can store primary email/name on `clients` or `client_contexts`. | Multiple stakeholders, CRM handoff, roles, Spanish/English contact preferences, email notifications. |
| `alerts` | Alerts can initially be derived from `events` and current state rules. | Need alert ownership, acknowledgement, resolution, escalation, Slack routing. |
| `reports` | Reports can initially be represented as `artifacts`. | Need report-specific lifecycle: draft, review, publish, version, client approval. |
| `playbooks` | Workstreams can start without reusable procedures. | Repeatable implementation procedures become productized. |
| `assignments` / `owners` | Owner can start as nullable text or simple ID fields. | Multiple internal users need ownership, queues, routing, workload views. |
| `integrations` | No production integrations are active yet. | CRM, Slack, email, ads, calendar, storage, or analytics connections are introduced. |
| `agent_definitions` | Agent catalog can start as static config. | Agents need admin UI, versioning, permissions, activation controls, or reporting. |

## Phase 1 Schema Sketches

The types below are conceptual. Final SQL/ORM types can be selected later.

### `clients`

Purpose: root client/account/workspace object.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `slug` | Required unique text, URL-safe. |
| `name` | Required text once known; can be generated from website early. |
| `website_url` | Required text for current product flow. |
| `primary_email` | Nullable text until `contacts` exists. |
| `primary_state` | Required enum/text; client lifecycle state. |
| `source` | Nullable text: landing, manual, import, referral. |
| `priority` | Nullable text/int for internal priority. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |
| `archived_at` | Nullable timestamp. |

Important relationships:

- One client has many workflow runs, artifacts, workstreams, client agents, events, and notes.
- One client has one current client context in Phase 1.

Flexibility notes:

- `primary_email` can be moved to `contacts` later.
- `primary_state` should be explicit and queryable, not buried in JSON.

### `client_contexts`

Purpose: current Business Context for the client.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `context_version` | Optional integer; can default to `1`. |
| `completion_state` | Required enum/text: draft, partial, complete, needs_review. |
| `business_name` | Nullable text. |
| `industry` | Nullable text. |
| `primary_market` | Nullable text. |
| `business_model` | Nullable text. |
| `goals` | JSON/list or text array. |
| `pains` | JSON/list or text array. |
| `systems` | JSON/list or text array. |
| `lead_sources` | JSON/list or text. |
| `lead_handling` | Nullable text. |
| `constraints` | JSON/list or text. |
| `available_assets` | JSON/list. |
| `available_data` | JSON/list. |
| `source_type` | Required text: generated_draft, client_submitted, consultant_edited, imported. |
| `raw_payload` | Nullable JSON for legacy/current file shape. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

Important relationships:

- Belongs to client.
- Can be referenced by workflow runs indirectly through metadata or future FK.

Flexibility notes:

- Start with one current row per client.
- Add strict versioning later if Business Context changes need historical comparison.
- Keep core query fields normalized; keep detailed/legacy shape in `raw_payload`.

### `workflow_runs`

Purpose: track executions of preaudit, audit, orchestrator, report generation, and agent runs.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `run_type` | Required enum/text: preaudit, audit, orchestrator, agent, report_generation. |
| `status` | Required enum/text: queued, running, completed, failed, cancelled, retried. |
| `source` | Nullable text: live, demo, manual, scheduled, retry. |
| `display_run_id` | Nullable unique-ish text for human-friendly display. |
| `source_run_id` | Nullable FK/self-reference or text for upstream provenance. |
| `client_agent_id` | Nullable FK to `client_agents.id`. |
| `started_at` | Nullable timestamp. |
| `completed_at` | Nullable timestamp. |
| `duration_ms` | Nullable integer. |
| `error_summary` | Nullable text. |
| `artifact_count` | Optional denormalized integer. |
| `metadata` | Nullable JSON. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

Important relationships:

- Belongs to client.
- Has many artifacts.
- May relate to a client agent for agent runs.
- Emits events.

Flexibility notes:

- Store detailed runner metadata in `metadata`.
- Keep `run_type` and `status` normalized for filtering and ops dashboards.

### `artifacts`

Purpose: metadata for generated files, reports, JSON outputs, uploads, and future storage objects.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `workflow_run_id` | Nullable FK to `workflow_runs.id`. |
| `workstream_id` | Nullable FK to `workstreams.id`. |
| `client_agent_id` | Nullable FK to `client_agents.id`. |
| `artifact_type` | Required enum/text: run_json, report_md, preaudit_report, audit_output, business_context_json, upload, generated_report. |
| `title` | Nullable/required text depending on visibility. |
| `storage_path_or_url` | Required text for disk path or object storage URL. |
| `storage_provider` | Nullable text: local_disk, s3, r2, database, external_url. |
| `visibility` | Required enum/text: client, internal, both. |
| `status` | Required enum/text: draft, published, superseded, stale, archived. |
| `content_hash` | Nullable text for integrity/deduplication. |
| `metadata` | Nullable JSON. |
| `created_at` | Required timestamp. |

Important relationships:

- Belongs to client.
- Usually belongs to workflow run.
- May relate to workstream or client agent.

Flexibility notes:

- Keep files on disk/storage initially; DB stores metadata and pointers.
- Do not store large report bodies in DB until there is a clear need.

### `workstreams`

Purpose: track client transformation tracks.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `title` | Required text. |
| `workstream_type` | Required text: website_improvement, sales_follow_up, market_study, crm_back_office_review, etc. |
| `state` | Required enum/text: identified, needs_input, ready_for_design, ready_to_activate, active, blocked, completed, archived. |
| `priority` | Nullable integer/text. |
| `source_origin` | Nullable text: preaudit, audit, operator, playbook, agent. |
| `linked_client_agent_id` | Nullable FK to `client_agents.id`. |
| `owner_ref` | Nullable text/string until owners table exists. |
| `next_step` | Nullable text. |
| `blocker_summary` | Nullable text. |
| `metadata` | Nullable JSON. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |
| `completed_at` | Nullable timestamp. |
| `archived_at` | Nullable timestamp. |

Important relationships:

- Belongs to client.
- May link to a client agent.
- Has events, notes, and artifacts.

Flexibility notes:

- `linked_client_agent_id` is a convenience link for Phase 1.
- Many-to-many workstream-agent support can come later if needed.

### `client_agents`

Purpose: client-specific agent recommendation, readiness, and activation state.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `agent_key` | Required text matching static Agent Definition catalog. |
| `label` | Nullable denormalized display label. |
| `state` | Required enum/text: not_relevant, candidate, recommended, setup_needed, ready, active, paused, retired. |
| `linked_workstream_id` | Nullable FK to `workstreams.id`. |
| `relevance` | Nullable text/enum: low, medium, high, required. |
| `recommendation_source` | Nullable text: audit, orchestrator, operator, playbook. |
| `required_inputs` | Nullable JSON/list. |
| `setup_status` | Nullable text or JSON summary. |
| `last_status_at` | Nullable timestamp. |
| `activated_at` | Nullable timestamp. |
| `retired_at` | Nullable timestamp. |
| `metadata` | Nullable JSON. |
| `created_at` | Required timestamp. |
| `updated_at` | Required timestamp. |

Important relationships:

- Belongs to client.
- May link to workstream.
- May have workflow runs.

Flexibility notes:

- Agent Definition can remain static/config-backed while `agent_key` is stored here.
- Add `agent_definitions` table later when the catalog needs DB administration or versioning.

### `events`

Purpose: append-only event stream for Activity, Internal Ops, and future alert derivation.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `workstream_id` | Nullable FK to `workstreams.id`. |
| `client_agent_id` | Nullable FK to `client_agents.id`. |
| `workflow_run_id` | Nullable FK to `workflow_runs.id`. |
| `artifact_id` | Nullable FK to `artifacts.id`. |
| `note_id` | Nullable FK to `notes.id`. |
| `category` | Required enum/text: lifecycle, workflow_run, workstream, agent, client_input, internal_ops, system_warning. |
| `type` | Required text: `audit_completed`, `business_context_saved`, `workstream_blocked`, etc. |
| `visibility` | Required enum/text: client, internal, both. |
| `severity` | Required enum/text: info, success, warning, critical. |
| `source` | Required text: system, operator, client, agent. |
| `title` | Nullable/required display text. |
| `message` | Nullable display text. |
| `payload` | Nullable JSON event-specific payload. |
| `created_at` | Required timestamp. |

Important relationships:

- Belongs to client.
- Optionally references one or more related entities.

Flexibility notes:

- Events should be append-only.
- `payload` should remain flexible.
- Core filtering fields should be normalized columns.

### `notes`

Purpose: human-authored context, decisions, observations, and client/internal notes.

| Column | Direction |
| --- | --- |
| `id` | Required UUID/string primary key. |
| `client_id` | Required FK to `clients.id`. |
| `related_entity_type` | Nullable text: client, workstream, client_agent, workflow_run, artifact. |
| `related_entity_id` | Nullable string ID. |
| `visibility` | Required enum/text: client, internal, both. |
| `author_type` | Required text: operator, client, system. |
| `author_ref` | Nullable string until users/contacts exist. |
| `body` | Required text. |
| `created_at` | Required timestamp. |
| `updated_at` | Nullable timestamp. |

Important relationships:

- Belongs to client.
- Polymorphically references a related entity.

Flexibility notes:

- Polymorphic notes avoid many join tables early.
- If notes become central to collaboration, split into explicit relation tables later.

## Normalized vs Flexible Fields

### Normalize As Columns

These fields should be queryable and should not live only in JSON:

- Client slug, website URL, primary state.
- Client Context completion state and high-level business fields.
- Workflow run type, status, start/end timestamps.
- Artifact type, visibility, status, storage pointer.
- Workstream type, state, priority.
- Client Agent agent key and state.
- Event category, type, visibility, severity, created timestamp.
- Note visibility and author type.

### Use Enum/State Fields

State and status fields should be explicit:

- `clients.primary_state`
- `client_contexts.completion_state`
- `workflow_runs.status`
- `artifacts.status`
- `artifacts.visibility`
- `workstreams.state`
- `client_agents.state`
- `events.visibility`
- `events.severity`
- `notes.visibility`

Exact enum enforcement can happen in application code first, then DB constraints later.

### Keep Flexible As JSON

Use JSON/document-style fields for details that will change or vary by workflow:

- `client_contexts.raw_payload`
- `workflow_runs.metadata`
- `artifacts.metadata`
- `workstreams.metadata`
- `client_agents.required_inputs`
- `client_agents.metadata`
- `events.payload`

JSON should not become a dumping ground for core product state. If the UI needs to filter by it often, promote it to a real column.

### Append-Only Payloads

Event `payload` should preserve context at the time of the event:

- old/new states
- error summaries
- source artifact paths
- missing required fields
- alert trigger details
- operator override reason

Do not rely on current entity state alone to reconstruct past activity.

## Relationship Model

| Relationship | Direction |
| --- | --- |
| `client_contexts.client_id` | `clients.id` |
| `workflow_runs.client_id` | `clients.id` |
| `workflow_runs.client_agent_id` | `client_agents.id` nullable |
| `artifacts.client_id` | `clients.id` |
| `artifacts.workflow_run_id` | `workflow_runs.id` nullable |
| `artifacts.workstream_id` | `workstreams.id` nullable |
| `artifacts.client_agent_id` | `client_agents.id` nullable |
| `workstreams.client_id` | `clients.id` |
| `workstreams.linked_client_agent_id` | `client_agents.id` nullable |
| `client_agents.client_id` | `clients.id` |
| `client_agents.linked_workstream_id` | `workstreams.id` nullable |
| `events.client_id` | `clients.id` |
| `events.workstream_id` | `workstreams.id` nullable |
| `events.client_agent_id` | `client_agents.id` nullable |
| `events.workflow_run_id` | `workflow_runs.id` nullable |
| `events.artifact_id` | `artifacts.id` nullable |
| `events.note_id` | `notes.id` nullable |
| `notes.client_id` | `clients.id` |
| `notes.related_entity_type` + `notes.related_entity_id` | Polymorphic reference |

### Optional And Polymorphic Link Decisions

- Events can reference multiple entities because one event may involve a client, run, artifact, and workstream.
- Notes use a polymorphic link early to avoid overbuilding many join tables.
- Workstream-agent relationships can be nullable and simple in Phase 1.
- Many-to-many relationships can be introduced later when the product needs them.

## File-Backed To DB-Backed Mapping

| Current file-backed concept | Future DB mapping |
| --- | --- |
| `data/clients/*-workspace.json` | `clients` row, possibly future `contacts` row. |
| Captured website URL + email | `clients.website_url`, `clients.primary_email`; later `contacts.email`. |
| `data/clients/*-audit-intake.draft.json` | `client_contexts` with `completion_state = draft` or partial. |
| `data/clients/*-audit-intake.json` | `client_contexts` current confirmed Business Context. |
| `artifacts/clients/<client>/preaudit/<run>/run.json` | `workflow_runs` row plus `artifacts` row for run JSON. |
| `artifacts/clients/<client>/preaudit/<run>/report.md` | `artifacts` row with `artifact_type = preaudit_report` or report_md. |
| `artifacts/clients/<client>/audit/<run>/run.json` | `workflow_runs` row plus `artifacts` row for audit output. |
| `artifacts/clients/<client>/<agent>/latest.json` | Query latest `workflow_runs`/`artifacts`; may remain as file pointer during transition. |
| `events.ndjson` | `events` rows. |
| Workspace current stage derived from files | `clients.primary_state` plus current Workflow Run/Artifact state plus Events. |
| Focus areas/workstreams derived from audit | `workstreams` rows with source origin audit/operator. |
| Recommended agents from audit | `client_agents` rows with state recommended/candidate. |
| Manual operator notes | `notes` rows plus optional `events` row. |

### What Can Stay File-Backed For A While

- Full report bodies.
- Raw `run.json` files.
- Generated Markdown.
- Large uploaded files.
- Historical artifacts that are not yet migrated.

The database should store metadata, pointers, visibility, status, and relationships first.

## First Implementation Recommendations

1. Start with Postgres unless there is a strong platform reason not to.
2. Implement Phase 1 tables only.
3. Keep artifact files on disk or object storage while storing metadata in `artifacts`.
4. Keep Agent Definition as static config and store `agent_key` in `client_agents`.
5. Use one current `client_contexts` row per client first; add versioning later.
6. Implement `events` early and treat them as append-only.
7. Do not overbuild `alerts` or `reports` tables until event volume and product needs justify them.
8. Keep JSON fields for workflow-specific metadata, but promote frequently queried fields to columns.
9. Design loaders around entity concepts now, even if they still read from files during the transition.
10. Preserve compatibility with existing artifact paths during migration.

## Open Questions

- Should `client_contexts` be strictly versioned from day one, or start as one current row plus Events?
- Should reports get a dedicated `reports` table early, or remain `artifacts` until publishing/review workflow exists?
- Are contacts needed immediately, or is `clients.primary_email` enough for the first DB-backed version?
- When should internal users, owners, and assignment tables be introduced?
- Should playbooks be DB-backed early or static/config-backed like Agent Definition?
- Should event type/category values be enforced as DB enums or application-level constants first?
- What storage backend should replace local artifact paths: filesystem, S3/R2, database blobs, or mixed?
- How much legacy `run.json` content should be parsed into columns versus preserved as artifact metadata?

