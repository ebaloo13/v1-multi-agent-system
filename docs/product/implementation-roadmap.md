# Implementation Roadmap

## Purpose

EBC now has enough product, operations, and data-model direction to move from prototype iteration into a more controlled build plan.

This roadmap exists to:

- Reduce chaos and prevent random tooling decisions.
- Preserve the working product loop while the backend model becomes more formal.
- Sequence product, data, operations, and infrastructure work in the right order.
- Avoid overbuilding auth, Slack, analytics, or complex CRM features before the operating model is stable.
- Move incrementally from local file-backed records to DB-backed product data.
- Keep client-facing UX and internal operations concerns separate.

The goal is not to freeze the product. The goal is to make the next implementation steps coherent.

## Current Baseline

EBC currently has:

- A public landing experience for website/email capture.
- A client workspace foundation.
- Workspace v2 structure: Dashboard, Diagnosis, Workstreams, Agents.
- A working product flow: **Website URL → Preaudit → Business Context → Audit → Orchestrator → Specialized Agents**.
- File-backed workflow artifacts under `artifacts/clients/...`.
- File-backed client/workflow inputs under `data/clients/...`.
- Preaudit and audit runs that produce traceable Outputs, stored internally as artifacts.
- Compatibility with existing legacy `intake` implementation names where needed.
- Product/operations/data specs for:
  - system states and events
  - activity and internal ops
  - core entities and data model
  - initial database schema

The product has enough structure to begin formalizing operations, but it should not jump straight to a large backend rewrite.

## Guiding Principles

- Preserve the working loop. Do not break preaudit, Business Context, audit, or current Output generation while formalizing the model.
- Do not overbuild too early. Build the smallest durable layer that improves product reliability and clarity.
- Migrate incrementally. Files can remain the execution/artifact source while DB-backed metadata is introduced.
- Prioritize visibility. Activity, events, states, and internal ops visibility should come before complex alert routing.
- Separate surfaces. Client-facing workspace activity is not the same as internal ops, alerts, or technical logs.
- Keep artifacts outside the database at first. Store metadata and pointers in DB later, not large artifact bodies.
- Choose infrastructure after the operating model is clear. Avoid committing to auth/org/integration complexity before the core model is stable.
- Prefer formal entity concepts even before the DB exists. Current loaders/services can be shaped around Client, Client Context, Workflow Run, Artifact, Workstream, Client Agent, Event, and Note.

## Suggested Implementation Phases

### Phase 1 — Product Stabilization

Goal: make the current product feel coherent, believable, and aligned with the documented language before backend formalization.

Build/finish:

- Align all workspace labels and empty states with **Business Context** naming.
- Align generated-work labels around **Outputs**, while keeping `artifacts` as the internal storage/model term.
- Keep legacy `intake` wording only where route/file/CLI compatibility requires it.
- Polish Dashboard, Diagnosis, Workstreams, and Agents empty states.
- Make current stage, next action, and readiness cues consistent across workspace surfaces.
- Add clear placeholder treatment for future Activity, Reports, and Playbooks.
- Stabilize current file-backed preaudit → Business Context → audit flow.
- Confirm Morales-style focus areas/workstreams render cleanly as operational tracks.

Should remain file-backed:

- Current workflow inputs.
- Existing preaudit/audit Outputs, stored as artifact files.
- Current workspace context files.

Success criteria:

- A user can understand where the client is, what happened, what should happen next, and which workstreams/agents matter.
- Product-facing language is consistent.
- No major backend decision is required yet.

### Phase 2 — Operational Model In Product

Goal: introduce the first visible operating model without a full DB rewrite.

Build:

- Minimal client-facing Activity feed or Activity section placeholder backed by event-like records.
- Basic internal operational event list, even if local/file-backed.
- Formal state labels reflected in workspace surfaces.
- Workstreams rendered from a state-oriented model instead of static cards where practical.
- Agents rendered from a state-oriented model: candidate, recommended, setup needed, ready, active.
- Event naming aligned with the system states/events spec.

Initial high-signal client activity:

- `preaudit_started`
- `preaudit_completed`
- `business_context_saved`
- `business_context_completed`
- `audit_started`
- `audit_completed`
- `workstream_created`
- `workstream_activated`
- `artifact_created`
- `next_action_updated`

Initial internal ops events:

- `preaudit_failed`
- `audit_failed`
- `run_failed`
- `run_retried`
- `workstream_blocked`
- `missing_required_input`
- `stale_artifact_detected`
- `manual_note_added`

Success criteria:

- Activity starts to feel like product history, not raw logs.
- Internal-only operational concerns are separated from client-facing history.
- Workstream and agent status become easier to evolve.

### Phase 3 — Data Model Transition

Goal: align current file-backed loaders/services with the formal entity model before introducing a database.

Build:

- Define canonical IDs for Client, Workflow Run, Artifact, Workstream, Client Agent, Event, and Note.
- Create mapping utilities or service boundaries that return entity-shaped objects, even if backed by files.
- Formalize how current files map to:
  - `clients`
  - `client_contexts`
  - `workflow_runs`
  - `artifacts`
  - `workstreams`
  - `client_agents`
  - `events`
  - `notes`
- Decide which state is derived vs stored in the local/file-backed phase.
- Make stale artifact detection explicit where possible.
- Keep Agent Definition as static config.

Should remain hybrid:

- Artifact bodies stay as files.
- `run.json` remains available as raw provenance.
- Business Context can remain JSON-backed while mapped to Client Context.

Success criteria:

- The app can be refactored toward DB-backed records without changing product semantics.
- File-backed data has a clear future database target.
- The workspace depends on entity-shaped data, not ad hoc file assumptions.

### Phase 4 — Initial Database Implementation

Goal: introduce DB-backed operational metadata while preserving artifact compatibility.

Recommended direction:

- Start with Postgres unless there is a strong platform reason not to.
- Implement Phase 1 tables only:
  - `clients`
  - `client_contexts`
  - `workflow_runs`
  - `artifacts`
  - `workstreams`
  - `client_agents`
  - `events`
  - `notes`
- Store artifact metadata in DB, but keep artifact files on disk or object storage.
- Keep Agent Definition as static config with `agent_key` stored in `client_agents`.
- Use one current `client_contexts` row per client before adding versioning.
- Treat `events` as append-only from the start.
- Do not build a full alerts subsystem yet.

Migration approach:

- Start by writing DB metadata alongside current file outputs.
- Do not remove file readers immediately.
- Add DB-backed reads for workspace summaries once metadata is reliable.
- Keep a fallback path to existing artifact files during transition.

Success criteria:

- New runs produce DB records for Client, Workflow Run, Artifact, and Event metadata.
- Workspace surfaces can increasingly read from DB-backed metadata.
- Existing artifacts remain usable and traceable.

### Phase 5 — Internal Operations And Alerting

Goal: turn internal operational visibility into an actionable surface.

Build:

- Internal ops view for recent failures, blockers, stale artifacts, missing inputs, and manual notes.
- Alert-worthy event detection.
- Basic alert state, even if alerts are initially derived from Events.
- Workstream-level history.
- Agent-level history.
- Operator notes with visibility controls.
- SLA/timing risk rules only after there is enough real usage to define thresholds.

Alert categories to support first:

- failure alerts
- blocker alerts
- missing input alerts
- stale output alerts
- agent setup alerts
- unusual state transition alerts

Do not build yet:

- Slack integration.
- Complex escalation routing.
- Full assignment/team management.

Success criteria:

- Internal team can see what needs attention without reading raw logs.
- Client-facing Activity remains clean.
- Alert-worthy events are identifiable before notification routing exists.

### Phase 6 — Infrastructure Formalization

Goal: choose and harden infrastructure after product/data needs are clearer.

Evaluate:

- Railway or equivalent backend deployment path.
- Drizzle/Postgres or another schema/migration stack.
- Object storage for artifacts.
- Auth model for real client workspace access.
- Organization/team model.
- WorkOS or similar only when B2B workspace access requirements justify it.
- Slack integration after alert rules and routing categories are stable.

Success criteria:

- Infrastructure decisions support the operating model instead of driving it prematurely.
- The system has a clear path from local prototype to production service.

## File-Backed vs DB-Backed Transition Plan

### Keep File-Backed First

These can remain file-backed during early phases:

- Full `run.json` payloads.
- Markdown reports.
- Generated artifacts.
- Historical artifact folders.
- Large uploaded files.
- Existing `latest.json` pointers during transition.
- Legacy `*-audit-intake*.json` files while Client Context mapping stabilizes.

Reason: files are already the working traceability layer and should not be moved before metadata and entity mapping are stable.

### Move To DB First

These should become DB-backed first:

- Client identity and lifecycle state.
- Business Context metadata/current state.
- Workflow Run metadata.
- Artifact metadata and pointers.
- Workstream state.
- Client Agent state.
- Event records.
- Notes.

Reason: these are operational product data. The workspace, Activity, Internal Ops, and future alerts need to query them directly.

### Hybrid For A While

These should be hybrid during transition:

- Artifacts: file/object storage body, DB metadata.
- Reports: artifact records first, dedicated reports table later.
- Business Context: DB current record plus raw legacy JSON as metadata or file reference.
- Events: DB events for new work, possible import from `events.ndjson` later.
- Agent definitions: static config plus DB client-agent state.

## Dependencies

| Work | Depends on |
| --- | --- |
| Activity feed | Event model, visibility rules, basic event records. |
| Internal ops list | Internal event records, failure/blocker/stale detection. |
| Workstream state UI | Workstream entity shape and state definitions. |
| Agent state UI | Client Agent entity shape and agent lifecycle definitions. |
| DB implementation | Entity model, schema blueprint, canonical IDs. |
| Alert panel | Internal events, alert-worthy category definitions. |
| Slack routing | Alert rules, alert severity, routing categories, operational volume. |
| Auth/org model | Real client access requirements and internal user model. |
| Reports table | Artifact lifecycle becomes too complex for generic artifacts. |
| Playbooks | Workstreams become repeatable enough to encode procedures. |

## What Not To Do Yet

- Do not build full auth before workspace access requirements are clear.
- Do not build Slack integration before alert rules and event volume are understood.
- Do not overbuild contacts, owners, assignments, or CRM behavior in Phase 1.
- Do not move large artifact bodies into the database too early.
- Do not create a reports table before artifacts prove insufficient.
- Do not make Agent Definition DB-backed until the catalog needs admin/versioning.
- Do not rebuild architecture repeatedly around tools before the entity model is stable.
- Do not expose raw technical logs as client Activity.
- Do not make every event an alert.

## Recommended Next 3 Practical Actions

1. Polish workspace labels, empty states, and Activity placeholders around the client-facing flow: **Preaudit → Business Context → Audit**.
2. Align current workspace loaders/services with formal entity naming, even while they still read from files.
3. Define the migration strategy from file-backed workflow records to DB-backed metadata for Client, Client Context, Workflow Run, Artifact, Event, Workstream, and Client Agent.

These actions keep momentum on the product while preparing the backend transition without forcing a premature rewrite.
