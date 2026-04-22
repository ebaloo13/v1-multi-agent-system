# EBC Product Source Of Truth

## 1. What EBC Is

EBC is a consulting operating system: a diagnostic and execution platform where clients move from initial signal capture into structured business context, audit, workstreams, specialized agents, and outputs.

The client workspace is the primary product surface. It brings together diagnosis, execution, activity, agents, and future internal ops so EBC can operate as a connected platform rather than a collection of disconnected automations.

## 2. Official Client-Facing Flow

The official current client-facing flow is:

`Website URL -> Preaudit -> Business Context -> Audit -> Orchestrator -> Specialized Agents`

Briefly:

- Website URL starts the first signal capture.
- Preaudit creates the initial read on the business.
- Business Context adds client-specific goals, constraints, and operating details.
- Audit produces deeper diagnosis and prioritized opportunities.
- Orchestrator determines what should happen next across workstreams and agents.
- Specialized Agents perform focused research, analysis, monitoring, or execution work.

This flow should guide product language, documentation, and future implementation decisions.

## 3. Official Client-Facing Naming

Preferred visible product terms:

- Business Context
- Outputs
- Dashboard
- Diagnosis
- Workstreams
- Agents
- Activity

Some technical or legacy terms may still exist in code, implementation notes, or older docs:

- intake
- artifact

When writing client-facing product language or new product docs, prefer the official terms. Legacy/internal terms should only be used when describing implementation details or existing code boundaries.

## 4. Core Product Model

EBC's shared model is built around a small set of core concepts:

- Client: the company or account using EBC.
- Client Context: the durable business context, goals, constraints, and operating details that shape recommendations.
- Workstream: a structured area of diagnosis or execution tied to a business opportunity, issue, or transformation priority.
- Client Agent: a specialized capability that can research, analyze, monitor, recommend, or execute using shared client context.
- Output: a client-relevant artifact such as a report, recommendation, memo, audit result, playbook, or generated deliverable.
- Event: a meaningful system or product change that can power history, Activity, state transitions, and future internal ops.
- Note: human-authored or system-authored context that supports understanding and collaboration.
- Workflow Run: an execution instance for an audit, agent task, orchestration step, or background process.

Detailed entity rules belong in the core entities, data model, and schema docs. This document defines the shared product language.

## 5. Core State And Event Logic

Clients move through lifecycle states as they progress from first URL submission through preaudit, Business Context, audit, orchestration, workstreams, agents, outputs, and ongoing execution.

Workstreams have their own lifecycle, such as proposed, active, blocked, completed, or paused.

Agents have their own lifecycle, such as recommended, configured, active, running, needs attention, paused, or completed.

Events are the common history layer. They should power client-facing Activity, internal operational history, future alerts, and state transitions. Client-facing Activity should show only curated, client-safe events, not raw logs.

## 6. Current Workspace Structure

The official current workspace sections are:

- Dashboard: current status, progress, priority next actions, and recent meaningful updates.
- Diagnosis: audit findings, diagnostic reasoning, priorities, and recommendations.
- Workstreams: structured execution areas that turn diagnosis into progress.
- Agents: specialized capabilities available, recommended, or active for the client.
- Activity: a client-safe feed of meaningful workspace progress and updates.

These sections should feel connected through shared client context, events, workstreams, outputs, and next actions.

## 7. Future Workspace Direction

Planned or likely future sections/modules include:

- Impact: measurable outcomes, business value, progress evidence, and results tied to workstreams.
- Reports: durable access to generated outputs, summaries, audits, recommendations, and client-ready documents.
- Playbooks: reusable execution patterns that create or support workstreams, agents, outputs, and next actions.
- Assistant: likely a module or panel before it becomes a main nav item; it should act as an interface into the AI Core, not as the core itself.

Future sections should extend the shared workspace model instead of creating isolated feature areas.

## 8. AI Core Summary

The AI Core is the shared operating layer of EBC.

It connects:

- Shared client context.
- Shared states and events.
- Shared workstreams, agents, and outputs.
- Orchestration logic.
- Activity and operational history foundations.

The AI Core is not a single chatbot, agent, workflow, or integration. It is the common foundation that prevents future solutions from becoming isolated point tools.

New solutions should build on the AI Core by using shared context, emitting events, generating outputs, updating state, and connecting to workstreams or agents where relevant.

## 9. Document Hierarchy

This file is the master product alignment and source-of-truth document.

Other docs expand specific areas:

- `system-states-and-events.md`: lifecycle states, event logic, and state transitions.
- `activity-and-internal-ops.md`: internal operations, activity foundations, and operational history.
- `core-entities-and-data-model.md`: core product entities and relationships.
- `initial-database-schema.md`: first database schema direction.
- `implementation-roadmap.md`: implementation sequencing and delivery plan.
- `activity-section-blueprint.md`: client-facing Activity UX direction.
- `ai-core-definition.md`: deeper AI Core product and architecture definition.
- Future impact, workflow, integration, reporting, and playbook docs should extend this source of truth.

If two docs appear inconsistent, use this document as the first alignment reference. Then update the conflicting detailed docs so the full doc set points in the same direction.

## 10. How To Use This Document

Use this document before writing new product docs, architecture notes, or implementation plans.

Use it before prompting Codex on EBC architecture or product changes so naming, flow, and core model decisions stay consistent.

Use it to keep visible product language aligned with the official client-facing terms.

Update this document only when a real product-level decision changes. Do not update it for minor implementation details, temporary code names, or isolated experiments.

