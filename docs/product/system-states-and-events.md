# System States and Events

## Purpose

EBC is becoming more than a diagnostic funnel. It is evolving into a consulting operating system where clients, workstreams, outputs, and specialized AI agents move through clear stages.

This document defines the practical state and event model behind that platform.

The goal is to make future product and operations decisions consistent:

- Workspace logic should know what state a client, workstream, or agent is in.
- Client-facing labels should map back to stable internal states.
- Activity history should be generated from events, not recreated manually in the UI.
- Internal operators should see blocked work, failed runs, retries, and missing inputs.
- Future Slack-style alerting should route important operational events to the right place.
- Future database design should have clear entities, state fields, and event tables.
- Future observability should distinguish business events from technical logs.

The model should stay practical. It should help answer:

- Where is this client in the process?
- What should happen next?
- What workstreams matter now?
- Which agents are relevant, recommended, or active?
- What happened recently?
- What needs internal attention?

## Naming Convention

The preferred client-facing/product-facing term is **Business Context**.

Spanish reference: **Contexto del negocio**.

The legacy technical term `intake` may still appear in implementation details such as existing file names, route paths, CLI flags, or schema names. The older term `discovery` may remain in internal lifecycle state names if stability is useful, but client-facing copy should describe the step as **Business Context**.

## Product Surfaces

The current workspace architecture should map to these operating concepts:

| Product surface | Primary purpose |
| --- | --- |
| Dashboard | High-level client state, current stage, next action, recent outputs, active workstreams |
| Diagnosis | Preaudit, Business Context, audit, and decision readiness |
| Workstreams | Ongoing transformation tracks such as website improvement or CRM review |
| Agents | Specialized AI-assisted modules that become candidates, recommendations, or active execution layers |
| Playbooks | Future repeatable procedures connected to workstreams and agents |
| Reports | Future client-facing outputs and progress summaries |
| Activity | Future timeline generated from client, workflow, workstream, and agent events |

## Client Lifecycle States

Client lifecycle state describes the top-level account stage. It should be stored as a stable internal value and translated into friendlier UI labels when needed.

| State | Meaning | Usual next step | Client should see | Internal team should see |
| --- | --- | --- | --- | --- |
| `lead` | A client/prospect exists, usually from a website submission or manual creation, but no diagnostic run is complete yet. | Start preaudit. | Basic workspace shell, captured website/email, "Diagnostic not started" or "Preparing diagnosis." | Source, contact info, submission details, whether required fields are missing. |
| `preaudit_running` | The public-site preaudit workflow has started and artifacts are not complete yet. | Complete or fail preaudit. | "Diagnostic running" with an expectation that results are being prepared. | Run ID, started timestamp, runner status, retry eligibility. |
| `preaudit_completed` | Preaudit artifacts exist and can be reviewed. | Review findings and collect Business Context inputs. | Preaudit summary, scores, alerts, quick wins, next step to Business Context. | Artifact paths, extracted signals, warnings, Business Context draft availability. |
| `discovery_pending` | Internal stable state meaning the client needs to provide missing Business Context before full audit quality is acceptable. | Start the Business Context step. | Clear request for missing Business Context and why it matters. | Missing fields, owner, due date, client reminders needed. |
| `discovery_in_progress` | Internal stable state meaning Business Context has been started but is not complete or not confirmed. | Save Business Context and mark audit ready. | Progress, remaining sections, saved draft state. | Field completion, validation gaps, operator notes, stale draft warnings. |
| `audit_ready` | Enough client context exists to run the full audit. | Start audit. | "Ready for full audit" and the next action. | Input file paths, preaudit dependency, readiness checks. |
| `audit_running` | The full audit workflow is running. | Complete or fail audit. | "Audit running" or "Preparing recommendations." | Run ID, started timestamp, upstream inputs, retry eligibility. |
| `audit_completed` | Audit output exists and is current against known upstream inputs. | Review recommendations, plan execution workstreams. | Company summary, pains, priorities, recommended agents, next steps. | Artifact paths, agent recommendations, stale-output checks, internal notes. |
| `execution_planned` | The team has selected workstreams or implementation paths, but active execution has not begun. | Activate one or more workstreams/agents. | Plan, selected priorities, expected next actions. | Workstream backlog, owners, dependencies, setup requirements. |
| `execution_active` | At least one workstream or agent is actively being worked. | Continue execution, resolve blockers, complete workstreams. | Progress by workstream, recent outputs, upcoming actions. | Active work, blockers, due dates, internal alerts, run history. |
| `paused` | Client work is intentionally stopped but not archived. | Resume or archive. | Paused status, reason if client-safe, next review date if available. | Pause reason, owner, commercial status, reactivation criteria. |
| `archived` | The client record is no longer active for current operations. | Reopen only if needed. | Read-only historical view, if exposed. | Archive reason, final state, retained artifacts, compliance notes. |

### Client State Rules

- A client should have exactly one current lifecycle state.
- Events should record how and when the state changed.
- State names should stay stable even if UI labels change.
- Terminal or low-activity states are `paused` and `archived`, but both can still receive internal notes.
- `audit_completed` should only mean the audit is current relative to known upstream inputs. If Business Context or preaudit changes later, the client may return to `audit_ready`.

## Workstream Lifecycle States

Workstreams represent concrete transformation tracks. Examples include:

- Website improvement
- Sales follow-up
- Market study
- CRM / back-office review

A workstream is not the same as a page section. It is a track of work that can have an owner, dependencies, status, events, artifacts, and possibly one or more agents.

| State | Meaning | Trigger into state | Likely next state | Client-visible? |
| --- | --- | --- | --- | --- |
| `identified` | The system or team has identified the workstream as relevant, but it has not been scoped. | Preaudit, audit, or manual operator note creates the workstream. | `needs_input` or `ready_for_design`. | Yes, if framed as a potential focus area. |
| `needs_input` | More client or internal context is required before the workstream can be designed. | Missing goals, systems, access, data, owner, or decision context. | `ready_for_design` or `blocked`. | Yes, if the missing input is actionable for the client. |
| `ready_for_design` | The problem is understood enough to design an approach or playbook. | Required inputs are captured and reviewed. | `ready_to_activate`. | Usually yes. |
| `ready_to_activate` | Scope, dependencies, and next action are clear enough to begin execution. | Workstream design is approved or selected. | `active`. | Yes. |
| `active` | Work is underway. This can include human execution, agent support, or both. | Team activates the workstream or linked agent. | `blocked`, `completed`, or `paused` through client state. | Yes. |
| `blocked` | Work cannot continue until a dependency is resolved. | Missing access, failed run, unclear owner, client delay, data unavailable, or internal issue. | `active`, `needs_input`, or `archived`. | Sometimes. Client sees it only when the blocker is client-relevant or affects timeline. |
| `completed` | The workstream's defined outcome has been delivered or closed. | Deliverable completed, output approved, or workstream outcome reached. | `archived` or reopened as `active` if more work is needed. | Yes. |
| `archived` | The workstream is no longer active or relevant. | Client archived, workstream deprioritized, or completed and removed from active operations. | Reopen as `identified` or `ready_for_design` if relevant again. | Usually no, except in historical activity/reporting. |

### Workstream State Rules

- A client can have many workstreams.
- Workstreams should be allowed to progress independently of the client lifecycle.
- A client in `execution_active` should usually have at least one `active` workstream.
- A blocked workstream should create an internal alert event.
- Client-visible workstream states should use plain language, for example "Needs input", "Ready to start", "In progress", "Blocked", "Complete."

## Agent Lifecycle States

Agents represent specialized capabilities that may support diagnosis, execution, or operations. Examples include:

- Sales Agent
- Operations Agent
- Collections Agent
- Web/Growth Agent
- Research Agent

Agent state should describe relevance and operational readiness, not just whether code exists.

| State | Meaning | When an agent reaches this state | Client-visible? |
| --- | --- | --- | --- |
| `not_relevant` | The agent is not useful for this client or current workstream. | Audit or operator rules determine no fit. | No. |
| `candidate` | The agent may be useful, but there is not enough evidence to recommend it. | Preaudit/audit signals suggest possible relevance. | Usually no, or shown only as "possible future module." |
| `recommended` | The audit or operator recommends this agent for the client. | Audit output, orchestrator decision, or manual recommendation. | Yes, if positioned as a recommended capability. |
| `setup_needed` | The agent is recommended, but prerequisites are missing. | Missing access, source data, integration, prompts, approval, or configuration. | Sometimes. Client should see only actionable setup requirements. |
| `ready` | The agent has required setup and can be activated. | Prerequisites are satisfied and internal checks pass. | Yes, if the client is involved in selecting/activating it. |
| `active` | The agent is being used for analysis, execution, monitoring, or workflow support. | Operator/client activates the agent or an approved automation starts it. | Yes, with clear boundaries around what it is doing. |
| `paused` | The agent is temporarily stopped. | Client pause, internal safety check, failed dependency, budget limit, or manual stop. | Sometimes. Client sees pause if it affects work. |
| `retired` | The agent is no longer used for this client. | Work completed, agent no longer relevant, replaced by another agent, or client archived. | Usually no, except historical activity. |

### Agent State Rules

- Agent state is client-specific. A Sales Agent can be `recommended` for one client and `not_relevant` for another.
- Agent state may also be workstream-specific. A Research Agent may be active for a Market Study workstream but not for CRM review.
- `recommended` should not imply the agent is operationally ready.
- `active` agents should emit activity events and internal run events.
- Technical failures should not be exposed directly to clients unless they affect timing or deliverables.

## Event Model

Events are immutable records of something meaningful that happened. They should be used to power:

- Activity history
- Internal operations timelines
- Slack-style alerting
- Audit/debug trails
- Future workflow orchestration
- State transitions

Events should be append-only. Current state can be stored directly on entities for speed, but state changes should also emit events.

### Event Shape

A practical first version of an event should include:

| Field | Purpose |
| --- | --- |
| `id` | Unique event ID. |
| `type` | Stable event type, for example `audit_completed`. |
| `category` | Event category, for example `workflow_run`. |
| `client_id` | Client/account this event belongs to. |
| `workstream_id` | Optional workstream relationship. |
| `agent_id` | Optional agent relationship. |
| `run_id` | Optional workflow or agent run relationship. |
| `actor_type` | `system`, `agent`, `operator`, or `client`. |
| `actor_id` | Optional user, operator, or system identifier. |
| `visibility` | `client`, `internal`, or `both`. |
| `severity` | `info`, `success`, `warning`, or `critical`. |
| `title` | Short display label. |
| `message` | Human-readable summary. |
| `metadata` | Structured details such as artifact paths, error codes, old/new states. |
| `created_at` | Timestamp. |

### Event Categories

| Category | Why it matters | Visibility |
| --- | --- | --- |
| Lifecycle events | Record major state changes for the client/account. These drive workspace stage labels and history. | Both, with internal metadata filtered from client view. |
| Workflow/run events | Track preaudit, Business Context, audit, agent, and orchestrator runs. These support debugging, retries, activity history, and operational reliability. | Both for milestones; internal-only for technical details and failures unless client-impacting. |
| Workstream events | Track creation, activation, blocking, completion, and archived state for execution tracks. | Both when client-relevant; internal-only for internal blockers or resourcing. |
| Agent events | Track recommendation, setup, activation, pause, failure, and retirement of agents. | Both for high-level agent status; internal-only for configuration, debug, or safety issues. |
| Client-input events | Record Business Context saves, uploaded files, form submissions, approvals, or comments. | Both. Internal view may include validation and missing-field metadata. |
| Internal operational alerts | Surface items that require team attention, such as stale drafts, failed runs, missing access, or blocked workstreams. | Internal-only and Slack-alert eligible. |
| System failures / warnings | Capture technical failures, degraded runs, retry exhaustion, malformed outputs, missing artifacts, or integration errors. | Internal-only by default. Client-facing only if the issue changes timeline or next action. |

### Concrete Event Types

#### Lifecycle Events

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `client_created` | A client/prospect record was created. | Internal |
| `client_state_changed` | Client lifecycle state changed. | Both |
| `client_paused` | Client work was paused. | Both if client-relevant |
| `client_archived` | Client record was archived. | Internal |

#### Workflow and Run Events

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `preaudit_started` | Public-site diagnostic run started. | Both |
| `preaudit_completed` | Preaudit completed and artifacts are available. | Both |
| `preaudit_failed` | Preaudit failed. | Internal by default |
| `business_context_started` | Business Context was opened or assigned. | Both |
| `business_context_saved` | Business Context was saved. | Both |
| `business_context_completed` | Business Context has enough confirmed context for audit. | Both |
| `audit_started` | Full audit run started. | Both |
| `audit_completed` | Full audit completed and recommendations are available. | Both |
| `audit_failed` | Full audit failed. | Internal by default |
| `run_failed` | Any workflow or agent run failed. | Internal |
| `run_retried` | A failed or incomplete run was retried. | Internal |
| `artifact_created` | A report, JSON file, or output artifact was generated. | Both if client-facing output |

#### Workstream Events

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `workstream_created` | A workstream was added to the client workspace. | Both |
| `workstream_input_requested` | More information is needed to progress the workstream. | Both if client action is needed |
| `workstream_ready_for_design` | Workstream has enough context for design. | Internal or both |
| `workstream_ready_to_activate` | Workstream is scoped and ready to begin. | Both |
| `workstream_activated` | Workstream moved into active execution. | Both |
| `workstream_blocked` | Workstream cannot proceed. | Both if client-impacting, otherwise internal |
| `workstream_unblocked` | Blocker was resolved. | Both if previously client-visible |
| `workstream_completed` | Workstream outcome was completed. | Both |
| `workstream_archived` | Workstream was removed from active operations. | Internal |

#### Agent Events

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `agent_marked_candidate` | Agent may be useful but is not yet recommended. | Internal |
| `agent_recommended` | Agent is recommended for the client or workstream. | Both |
| `agent_setup_needed` | Agent needs access, data, approval, or configuration. | Both if client action is needed |
| `agent_ready` | Agent can be activated. | Both |
| `agent_activated` | Agent is active for a client or workstream. | Both |
| `agent_paused` | Agent has been paused. | Both if client-impacting |
| `agent_run_started` | Agent run began. | Internal, or client if used as visible progress |
| `agent_run_completed` | Agent run completed. | Internal, or both if it produced a client output |
| `agent_run_failed` | Agent run failed. | Internal |
| `agent_retired` | Agent no longer applies to the client or workstream. | Internal |

#### Client Input and Manual Events

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `client_form_submitted` | Client submitted a form, lead capture, or Business Context update. | Both |
| `client_input_requested` | Client is asked for more information. | Both |
| `client_input_received` | Requested input was received. | Both |
| `client_file_uploaded` | Client or operator added a file. | Both if file is client-relevant |
| `manual_note_added` | Operator added a note. | Internal by default, optionally client-visible if marked safe |
| `recommendation_approved` | Client or operator approved a recommendation. | Both |
| `next_action_updated` | The primary next action changed. | Both |

#### Internal Operational Alerts

| Event | Meaning | Typical visibility |
| --- | --- | --- |
| `missing_required_input` | Required field, access, file, or decision is missing. | Internal, or both if client action is needed |
| `stale_artifact_detected` | A downstream artifact is older than upstream context. | Internal |
| `blocked_workstream_alert` | A blocked workstream needs operator attention. | Internal |
| `agent_setup_alert` | Recommended/ready agent cannot proceed because setup is incomplete. | Internal |
| `client_inactive_alert` | Client has not progressed after a defined threshold. | Internal |
| `sla_risk_alert` | Response or delivery timing is at risk. | Internal |
| `unexpected_state_transition` | A state change violated expected rules. | Internal |

## Visibility Model

Visibility should be decided at the event and field level. A client can see a high-level event while internal operators see additional metadata.

### Client Workspace

The client workspace should show:

- Current lifecycle stage.
- Primary next action.
- Completed outputs, reports, and artifacts.
- Client-safe progress updates.
- Client-visible workstream status.
- Recommended agents when they are relevant and explainable.
- Requests for client input.
- Completed milestones.
- Notes explicitly marked as client-visible.

The client workspace should not show:

- Raw stack traces.
- Debug logs.
- Internal retry details.
- Prompt failures.
- Internal assignment notes.
- Commercial or resourcing issues unless intentionally exposed.
- Speculative agent candidates that are not yet recommended.

### Internal Operations Layer

The internal layer should show:

- All client lifecycle state changes.
- All workflow and run events.
- All blocked workstreams.
- Missing inputs and validation issues.
- Stale artifacts and outdated outputs.
- Agent setup requirements.
- Retry attempts and failure reasons.
- Manual notes and operator decisions.
- Client-facing event previews before publishing, if needed.

### Future Slack/Internal Alert Feed

Slack-style alerts should be reserved for events that require attention. Not every event belongs in Slack.

Good Slack candidates:

- `preaudit_failed`
- `audit_failed`
- `run_failed`
- `workstream_blocked`
- `missing_required_input`
- `stale_artifact_detected`
- `agent_setup_alert`
- `sla_risk_alert`
- `unexpected_state_transition`
- High-value `client_form_submitted`
- `audit_completed` for important clients or active deals

Slack alerts should include:

- Client name.
- Event type.
- Severity.
- What changed.
- Owner or next action when known.
- Link to workspace or internal record.

### Future Activity History

Activity history should be a filtered event timeline.

Client-facing activity should emphasize:

- Stage changes.
- Started/completed diagnostics.
- Business Context saved or completed.
- Audit completed.
- Workstream activated/completed.
- Agent recommended/activated when relevant.
- Reports or artifacts published.
- Client input requested/received.
- Next action updates.

Internal activity should include:

- Everything client-facing.
- Technical run events.
- Failures and retries.
- Blockers.
- Internal notes.
- Stale output detection.
- Operator overrides.
- Agent setup and safety events.

## Future Data Model Implications

This operating model suggests a backend schema with separate stateful entities and append-only event records.

Likely entities:

| Entity | Purpose |
| --- | --- |
| `clients` | Account/client record with current lifecycle state and core profile fields. |
| `client_contexts` | Website, lead email, Business Context fields, source metadata. |
| `workflow_runs` | Preaudit, audit, orchestrator, and agent run records. |
| `artifacts` | Reports, JSON outputs, generated files, and published client outputs. |
| `workstreams` | Client-specific work tracks with current state, owner, priority, and dependencies. |
| `agents` | Available agent definitions and capabilities. |
| `client_agents` | Client-specific agent relevance, recommendation, setup, and activation state. |
| `events` | Append-only event stream. |
| `notes` | Manual notes with visibility and relationship to clients/workstreams/agents. |
| `alerts` | Internal alert records derived from events or state rules. |

State fields should answer "what is true now." Events should answer "what happened and when."

## Observability and Reliability Implications

EBC should distinguish product events from technical logs.

Product events:

- Client state changed.
- Audit completed.
- Workstream blocked.
- Agent recommended.
- Client input received.

Technical logs:

- HTTP request failed.
- Model response validation failed.
- File write failed.
- Retry attempt started.
- Stack trace captured.

Both matter, but they serve different audiences. Product events power workspace history and operations. Technical logs support debugging and platform reliability.

Over time, the event model should support:

- Multi-client operations views.
- Internal queue dashboards.
- Agent reliability reporting.
- Failure-rate tracking by workflow.
- Time-in-state metrics.
- Conversion tracking from lead to execution.
- Workstream throughput.
- Alert routing and escalation.

## State Transition Notes

The first implementation does not need a complex state machine, but it should avoid impossible transitions.

Examples:

- `preaudit_completed` should follow `preaudit_running` or a manual artifact import.
- `audit_running` should require `audit_ready`.
- `execution_active` should usually require at least one active workstream.
- `agent_activated` should require the agent to be `ready`, unless an operator override is recorded.
- `workstream_completed` should require the workstream to have been `active` or explicitly completed by operator override.
- `archived` clients should not start new runs unless reopened.

Operator overrides are acceptable, but they should emit events with a reason.

## Recommended Next Implementation Steps

1. Align workspace UI labels with the formal states in this document.
2. Add an activity feed model backed by append-only events.
3. Define an internal event stream for workflow runs, blockers, failures, and manual notes.
4. Design database entities around clients, workstreams, agents, runs, artifacts, notes, alerts, and events.
5. Add Slack/internal alert routing later for failed runs, blocked workstreams, missing inputs, stale artifacts, and SLA risks.
