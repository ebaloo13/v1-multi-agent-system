# Activity and Internal Ops Blueprint

## Purpose

EBC needs an Activity and Internal Ops layer because the product is becoming a consulting operating system, not just a set of reports.

The platform should make progress visible to clients while giving the internal team enough operational visibility to coordinate work, troubleshoot failures, and scale across more clients, workstreams, runs, and agents.

This layer matters because it will:

- Make the workspace feel alive, with a real history of progress.
- Help clients understand what happened, what changed, and what comes next.
- Reduce internal confusion about run status, blockers, ownership, and missing inputs.
- Support troubleshooting without exposing raw technical noise to clients.
- Create the foundation for future Slack/internal alerts.
- Prepare EBC for multi-client operations where many diagnostics, workstreams, and agents are active at once.

Activity should not be treated as "logs." Activity is a meaningful business and operational history. Logs are lower-level technical records.

## Definitions

| Concept | Meaning | Primary audience | Example |
| --- | --- | --- | --- |
| Activity | A meaningful timeline of business, workflow, workstream, agent, and artifact events. | Clients and internal team | "Audit completed", "Business Context saved", "Workstream activated" |
| Internal Ops | Internal visibility for coordination, troubleshooting, ownership, and operational risk. | EBC team | "Audit failed", "Workstream blocked", "Missing required input" |
| Alerts | A subset of internal operational events that require attention or action. | EBC team, later Slack/internal notifications | "Run failed after retry", "Client inactive for 7 days", "Agent setup missing" |
| Technical logs | Low-level system records used for debugging, observability, and reliability. | Engineers/operators | Stack traces, HTTP failures, validation details, raw model errors |

### Practical Distinction

- Activity answers: "What meaningful thing happened?"
- Internal Ops answers: "What does the team need to know to coordinate or fix this?"
- Alerts answer: "What requires attention now or soon?"
- Logs answer: "What happened technically under the hood?"

Activity can be generated from the event model, but not every event should become visible activity. Internal Ops can include more events than the client sees. Alerts should be fewer and more intentional than Internal Ops events.

## Client-Facing Activity

Client-facing activity should show progress, milestones, and clear next steps. It should reinforce trust without exposing implementation details, debug noise, or internal uncertainty.

| Activity item | Why the client should see it | Detail level | Do not expose |
| --- | --- | --- | --- |
| `preaudit_started` | Shows that the diagnostic has begun and the platform is doing work. | Short status update with site/client reference. | Runner details, retry metadata, raw fetch/debug output. |
| `preaudit_completed` | Confirms that the first diagnostic output is available. | Summary, link to report or diagnosis page, next action. | Raw model output, scoring internals, warnings not relevant to client action. |
| `business_context_saved` | Shows that client-provided context was captured. | "Business Context saved" with optional section/progress summary. | Internal validation objects, legacy `intake` terminology, file paths. |
| `business_context_completed` | Marks readiness for the full audit. | Clear milestone: enough context exists to run audit. | Internal schema names or missing optional fields that do not matter. |
| `audit_started` | Shows deeper analysis is underway. | Short progress event and expected next output. | Run IDs, prompts, retry state, execution internals. |
| `audit_completed` | Confirms recommendations and priorities are available. | Link to audit review, summary of available outputs. | Raw agent JSON, validation details, internal confidence/debug notes unless translated. |
| `workstream_created` | Shows a transformation track has been identified. | Workstream name and why it matters. | Speculative internal scoring or unreviewed internal notes. |
| `workstream_activated` | Shows active execution has started. | Workstream name, current focus, next step. | Internal assignment chatter, private resourcing constraints. |
| `workstream_completed` | Shows a concrete outcome or milestone was completed. | Outcome, artifact/report link if available, next step. | Internal QA notes unless client-approved. |
| `agent_recommended` | Shows a suggested capability based on diagnosis/audit. | Agent name, purpose, what it could help with. | Experimental agent details, prompt/configuration, unsupported claims. |
| `agent_activated` | Shows an approved agent/module is now supporting the work. | What the agent is doing in client-safe language. | Internal tool calls, raw outputs, implementation uncertainty. |
| `artifact_created` | Shows a new report, output, or deliverable is available. | Artifact title, type, link, and short context. | Local file paths, generation metadata, raw intermediate files. |
| `next_action_updated` | Keeps the client oriented around what should happen next. | Clear next action, owner if client-facing, due timing if known. | Internal debate, unassigned tasks, hidden blockers. |

### Client Activity Principles

- Use plain product language: **Preaudit → Business Context → Audit**.
- Keep entries short and action-oriented.
- Prefer milestone language over technical language.
- Client-visible activity should be safe to read without internal explanation.
- If an event is negative, translate it into client-relevant impact rather than exposing internals.
- Do not expose raw logs, stack traces, prompts, retry details, internal state mismatches, or private notes.

## Internal Operations Activity

Internal Ops activity should give the EBC team enough visibility to keep work moving. It should include more detail than the client activity feed, but still avoid becoming a raw log dump.

| Internal item | Who needs it | Why it is useful | Avoid surfacing directly if |
| --- | --- | --- | --- |
| Failed runs | Operators, engineers | Shows diagnostics/audits/agent runs that need retry or debugging. | It is a transient retry that resolved automatically and has no client impact. |
| Retries | Operators, engineers | Helps explain delays and reliability issues. | Every low-level retry would create noise. Summarize repeated retries. |
| Blocked workstreams | Operators, account owner | Shows where client transformation work is stuck. | The blocker is already resolved or only affects an archived workstream. |
| Stale artifacts | Operators | Shows when audit/report outputs are older than upstream Business Context or preaudit inputs. | The artifact is not being used or the client is archived. |
| Missing required input | Account owner, operations | Shows what is preventing audit quality or execution readiness. | It is optional or low-value context that should not block progress. |
| Agent setup problems | Operator, agent owner | Shows missing prerequisites such as access, data, configuration, or approval. | The agent is only a speculative candidate. |
| Manual notes | Account owner, team | Captures human judgment, call notes, overrides, and internal reasoning. | The note is too granular, duplicative, or belongs in a task system. |
| SLA/timing risk | Account owner, ops lead | Shows risk around response time, delivery date, or stalled progression. | There is no meaningful owner or next action. |
| Internal state mismatches | Operators, engineers | Shows impossible or suspicious state transitions. | It is a known migration artifact already handled. |
| Operator overrides | Operators, leadership | Preserves accountability when a state or recommendation is manually changed. | The override is trivial and already covered by another event. |

### Internal Ops Principles

- Internal Ops should help someone take action or understand state.
- Every surfaced item should ideally have an owner, severity, timestamp, and related client.
- Repeated low-level events should be grouped or summarized.
- Internal Ops should include enough context to debug without opening raw logs first.
- Raw technical logs should remain available separately for engineers, not mixed into the main ops feed.

## Alerts Model

Alerts are not just events. Alerts are events that need attention, escalation, or follow-up. They should be fewer than activity events.

| Alert category | Trigger | Default severity | Who should care | Slack later? |
| --- | --- | --- | --- | --- |
| Failure alerts | Preaudit, audit, workflow, artifact generation, or agent run fails and is not automatically resolved. | `warning` or `critical` | Operator, engineer, account owner if client-impacting | Yes for unresolved failures, especially audit/agent failures. |
| Blocker alerts | Workstream enters `blocked` or agent cannot proceed because a dependency is missing. | `warning` | Account owner, workstream owner | Yes when the blocker affects active work. |
| Missing input alerts | Required Business Context, access, file, approval, or decision is missing. | `info` or `warning` | Account owner, client-facing operator | Sometimes. Slack only if overdue or blocking audit/execution. |
| Stale output alerts | Audit/report/artifact is older than upstream Business Context, preaudit, or source context. | `warning` | Operator, account owner | Yes if the stale output is client-visible or being used for decisions. |
| Timing/SLA alerts | Client has stalled, run has exceeded expected time, or delivery date is at risk. | `warning` or `critical` | Account owner, ops lead | Yes when timing matters or the client is active. |
| Agent setup alerts | Recommended/ready agent cannot activate due to missing setup, data, access, or approval. | `info` or `warning` | Agent owner, account owner | Yes if the agent is selected for active execution. |
| Unusual state transition alerts | Entity enters an impossible, skipped, or suspicious state sequence. | `warning` or `critical` | Operator, engineer | Yes for critical state integrity issues. |

### Severity Guidance

| Severity | Meaning | Example |
| --- | --- | --- |
| `info` | Needs awareness but not immediate action. | Business Context is missing optional context. |
| `warning` | Needs follow-up or could block progress. | Workstream blocked, stale audit detected, agent setup incomplete. |
| `critical` | Client-impacting or system-integrity issue requiring prompt attention. | Audit failed after retries, impossible state transition, active client deliverable blocked. |

### Alert Rules

- Not every failure should alert immediately if automatic retry is expected.
- Repeated events should collapse into one alert with a count.
- Alerts should have clear resolution states: open, acknowledged, resolved, ignored.
- Alerts should link to the client, workstream, agent, run, or artifact involved.
- Alerts should have a human-readable recommended next action when possible.

## Slack / Future Notification Strategy

Slack is not being implemented now. This section defines what should deserve Slack-style routing later.

Slack should be treated as an escalation and awareness channel, not a full activity feed.

### Should Route To Slack Later

- `preaudit_failed` when not automatically resolved.
- `audit_failed` when not automatically resolved.
- `run_failed` for active clients or selected agents.
- `workstream_blocked` for active workstreams.
- `missing_required_input` when overdue or blocking a next step.
- `stale_artifact_detected` when client-facing outputs may be outdated.
- `agent_setup_alert` for selected/active agents.
- `sla_risk_alert` for active clients.
- `unexpected_state_transition` when state integrity is at risk.
- Important `audit_completed` events for active opportunities or active clients.
- High-value `client_form_submitted` events when sales/ops follow-up is expected.

### Should Stay In The Internal App

- Normal stage changes.
- Most client-facing activity milestones.
- Routine artifact creation.
- Successful retries.
- Non-blocking optional missing fields.
- Internal notes that are useful historically but not urgent.
- Agent candidate/recommendation events that do not require action.

### Too Noisy For Slack

- Every run start.
- Every successful low-level run completion.
- Every file write.
- Every validation warning.
- Every retry attempt.
- Every page view or UI interaction.
- Raw technical logs.
- Repeated identical warnings without grouping.

### Possible Future Channels

| Channel | Purpose |
| --- | --- |
| `#ebc-failures` | Workflow, agent, artifact, and system failures requiring attention. |
| `#ebc-blockers` | Blocked workstreams, missing required inputs, and stalled clients. |
| `#ebc-client-progress` | Important client progression milestones such as audit completed or execution activated. |
| `#ebc-agent-ops` | Agent setup, activation, run failures, and agent-specific operational issues. |
| `#ebc-sales-followup` | High-value submissions, Business Context completion, or active deal progression. |

EBC may not need all channels early. Start with one internal ops channel if volume is low, then split by category once noise becomes a problem.

## Activity Surfaces In The Product

Activity and Internal Ops should appear in different surfaces depending on audience and context.

| Surface | Audience | Purpose | Should include |
| --- | --- | --- | --- |
| Client workspace Activity section | Client and client-facing team | Client-safe timeline of progress and outputs. | Stage changes, Business Context saved/completed, audit completed, workstream milestones, reports, next actions. |
| Internal team ops dashboard | EBC team | Multi-client operational control center. | Failed runs, blockers, missing inputs, stale artifacts, SLA risks, open alerts, recently completed milestones. |
| Workstream-level history | Client-facing team, possibly client | History of one transformation track. | Created, scoped, activated, blocked, unblocked, completed, related artifacts and notes. |
| Agent-level history | Internal team, sometimes client | Understand agent recommendation, setup, activation, and run outcomes. | Recommended, setup needed, ready, activated, paused, completed runs, failures. |
| Report/artifact history | Client and internal team | Track generated outputs and whether they are current. | Artifact created, published, superseded, stale, regenerated. |
| Alert inbox/internal ops panel | Internal team | Manage items requiring action. | Open alerts, severity, owner, next action, acknowledged/resolved state. |
| Client overview/dashboard | Client and team | Show only the most important recent activity and next action. | Last 3-5 high-signal events and current next action. |

## Multi-Client Operations

The Activity and Internal Ops layer should eventually support multi-client operations. The team should be able to answer:

- Which clients are stuck?
- Which audits failed?
- Which clients need Business Context completion?
- Which active workstreams are blocked?
- Which agents are ready but not activated?
- Which reports are stale?
- Which clients have not progressed recently?
- What changed today across all active clients?

Useful multi-client filters:

- Client lifecycle state.
- Workstream state.
- Agent state.
- Alert severity.
- Alert status.
- Owner.
- Event category.
- Time window.
- Client priority or account tier.

## Prioritization For Implementation

### Phase 1: Basic Activity And Internal Events

Build:

- Simple client-facing Activity feed in the workspace.
- Simple internal operational event list.
- Event visibility field: `client`, `internal`, or `both`.
- A small set of high-signal event types.

Recommended Phase 1 client events:

- `preaudit_started`
- `preaudit_completed`
- `business_context_saved`
- `business_context_completed`
- `audit_started`
- `audit_completed`
- `workstream_created`
- `workstream_activated`
- `workstream_completed`
- `agent_recommended`
- `artifact_created`
- `next_action_updated`

Recommended Phase 1 internal events:

- `preaudit_failed`
- `audit_failed`
- `run_failed`
- `run_retried`
- `workstream_blocked`
- `missing_required_input`
- `stale_artifact_detected`
- `manual_note_added`
- `operator_override_applied`

### Phase 2: Alert Panel And Entity Histories

Build:

- Internal alert panel.
- Alert status: open, acknowledged, resolved, ignored.
- Workstream-level history.
- Agent-level history.
- Artifact/report history.
- Grouping for repeated failures or repeated missing input events.

### Phase 3: Slack Routing And Multi-Client Ops

Build:

- Slack routing rules for selected alert categories.
- Alert escalation rules.
- Multi-client operational dashboard.
- SLA/timing rules.
- Client progression dashboard.
- Agent reliability and run history summaries.

## Recommended First Implementation Slice

The first practical slice should be small and opinionated:

1. Add a minimal Activity section in the client workspace.
2. Back it with an append-only event stream, even if stored locally at first.
3. Include only high-signal client-safe events: preaudit, Business Context, audit, workstream milestones, artifacts, and next action updates.
4. Add a separate internal event list for failures, retries, blockers, stale artifacts, missing inputs, and manual notes.
5. Define a compact alert-worthy subset, but do not route to Slack yet.
6. Avoid exposing raw logs directly in Activity.

The key product decision is to separate four layers from the start:

- Client Activity for progress and trust.
- Internal Ops for coordination and troubleshooting.
- Alerts for attention and escalation.
- Technical logs for engineering reliability.

That separation will let EBC scale without turning the workspace into a noisy debug console or hiding important operational problems from the team.

