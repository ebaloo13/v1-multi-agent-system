# AI Core Definition

## 1. Purpose

EBC needs an explicit definition of its AI Core so the product can grow as a platform instead of becoming a collection of disconnected automations.

EBC is evolving into a consulting operating system: a diagnostic and execution platform that understands a client, identifies opportunities, coordinates work, activates agents, and produces useful outputs. As new solutions are added, they need to share the same foundations rather than creating separate data models, isolated workflows, or one-off user experiences.

The AI Core definition matters because it:

- Prevents isolated point solutions from forming inside the product.
- Ensures future solutions use common client context, states, events, workstreams, agents, and outputs.
- Keeps diagnosis, execution, progress, and activity connected across the workspace.
- Gives product, engineering, and operations a shared language for what should be reusable platform infrastructure.
- Makes future agents and integrations more valuable because they can operate from shared context instead of starting from scratch.
- Supports a scalable product architecture where each new module strengthens the core rather than bypassing it.

The core idea: EBC should not be a set of unrelated AI tools. It should be one operating system where every solution contributes to the same client understanding, execution history, and transformation model.

## 2. Definition Of The AI Core

The AI Core is the shared operating layer of EBC that connects client context, platform state, events, workstreams, agents, outputs, next actions, and orchestration logic.

It is not a single agent. It is not just a chatbot. It is not one workflow, one prompt, one automation, or one UI surface.

The AI Core is the common foundation that allows EBC to:

- Understand who the client is and what matters to them.
- Maintain shared state across the workspace.
- Convert system activity into meaningful events.
- Organize execution through workstreams.
- Activate specialized agents or modules against shared context.
- Produce outputs that belong to the client record.
- Recommend or update next actions.
- Coordinate product experiences without fragmenting the operating model.

In practical terms, the AI Core is what makes EBC feel like one intelligent workspace instead of many separate tools.

## 3. What Belongs In The AI Core

The AI Core should contain the shared concepts and services that every meaningful EBC solution can build on.

### Client Identity And Client Context

Client identity and client context belong in the core because every EBC action should be grounded in who the client is, what their business does, what goals they have, and what constraints matter.

This includes company profile, business context, operating model, industry, priorities, known constraints, stakeholder context, and relevant historical inputs.

Without shared client context, every solution has to rediscover the client independently, which creates duplication and inconsistent recommendations.

### Shared State Model

Shared state belongs in the core because the workspace needs a consistent understanding of where the client is in the journey.

State should describe meaningful product and business conditions such as setup status, diagnosis status, workstream status, agent status, output availability, blockers, and current next action.

This prevents each module from inventing its own private status system and allows Dashboard, Activity, Workstreams, Agents, and future sections to stay aligned.

### Shared Event Model

Events belong in the core because EBC needs a durable record of meaningful changes.

Events are the foundation for activity, operational history, state transitions, notifications, and future auditability. They should capture important platform moments such as audits completing, workstreams activating, outputs becoming available, or agents producing results.

The event model should support both internal operational use and client-safe product experiences, with clear visibility and phrasing boundaries.

### Workstreams

Workstreams belong in the core because they are the main structure for turning diagnosis into execution.

A workstream represents a focused area of transformation or improvement. It connects the problem, recommended action, owner or responsible system, progress state, related agents, outputs, and next steps.

Future solutions should map to workstreams when they represent ongoing work, not remain as disconnected feature pages.

### Client Agents And Specialized Modules

Client agents and specialized modules belong in the core when they act on shared client context, update shared state, emit events, or produce client outputs.

An agent should not be treated only as a chat window or background script. In EBC, agents are operating capabilities that can support diagnosis, research, execution, monitoring, reporting, and recommendations.

Specialized modules should be designed as core-connected capabilities, not isolated apps with separate memory.

### Outputs

Outputs belong in the core because they are the artifacts EBC creates for clients.

Outputs may include reports, recommendations, memos, summaries, audits, analyses, playbooks, implementation plans, or generated assets. They should be linked to the relevant client, context, workstream, agent, event, and next action where appropriate.

Outputs are not just files. They are part of the client record and should be discoverable across the workspace.

### Next Actions And Progress Logic

Next actions belong in the core because EBC should guide clients toward useful movement, not only display information.

Progress logic should help determine what the client should do next, what EBC is doing next, what is blocked, what is waiting for approval, and what has recently changed.

This logic supports Dashboard, Activity, Workstreams, Agents, and future Assistant experiences.

### Orchestration Logic

Orchestration belongs in the core conceptually because EBC needs coordination across diagnosis, agents, workstreams, outputs, and integrations.

Orchestration does not have to begin as a complex workflow engine. Early orchestration can be service-level logic that determines what should run, what context it needs, which events should be emitted, what outputs should be created, and what state should change.

Over time, this can evolve into more explicit workflow, queue, scheduling, approval, and routing capabilities.

### Shared Operational History And Activity Foundation

Operational history belongs in the core because EBC needs a shared memory of what happened.

This foundation should support both internal ops and client-facing Activity. Internal ops may need raw events, failures, retries, and traces. Client Activity should show curated, meaningful, client-safe progress.

Both should be connected to the same underlying platform movement, with different levels of visibility and language.

## 4. What Does Not Belong In The AI Core

Not everything important to EBC is part of the AI Core.

The following are outside the core:

- Landing page design.
- Isolated UI polish.
- One-off integrations that do not use shared context, state, events, or outputs.
- A single chatbot surface.
- Slack itself.
- Railway itself.
- WorkOS itself.
- Purely cosmetic analytics views.
- Standalone scripts or automations that do not connect to the shared model.
- Feature pages that maintain private client state outside the core.

These can be valuable parts of the product or operating environment, but they are not the AI Core itself.

For example:

- Slack can be an integration channel for internal alerts or approvals, but Slack is not the core.
- Railway can host infrastructure, but Railway is not the core.
- WorkOS can support authentication or organization management, but WorkOS is not the core.
- A chatbot can expose part of the core, but the chatbot is not the core.

The test is whether a capability contributes to or uses the shared operating model. If it does not use client context, state, events, workstreams, agents, or outputs, it is likely adjacent to the core rather than part of it.

## 5. Layer Model

EBC should be understood as a set of connected layers.

### Experience Layer

The Experience Layer is what users see and interact with.

This includes the workspace, Dashboard, Diagnosis, Workstreams, Agents, Activity, future Impact, Reports, Playbooks, Assistant, onboarding flows, and settings.

The Experience Layer should read from and write to the AI Core. It should not create private product logic that bypasses shared state, events, or outputs.

### AI Core

The AI Core is the shared operating layer.

It holds the common product concepts: client context, state, events, workstreams, agents, outputs, next actions, orchestration, and activity foundations.

This is the layer that gives EBC continuity across product surfaces and future solutions.

### Execution Layer

The Execution Layer performs work.

This includes agent runs, audits, analysis jobs, report generation, background tasks, enrichment routines, and workflow steps.

Execution should consume context from the AI Core and write meaningful results back into the AI Core through events, state changes, outputs, and next actions.

### Integration Layer

The Integration Layer connects EBC to external systems.

This may include CRM systems, websites, analytics tools, Slack, email, file storage, customer data platforms, ad platforms, or internal business systems.

Integrations should not become isolated product modules. They should feed or act on the AI Core by enriching client context, triggering events, supporting workstreams, or producing outputs.

### Ops / Infra Layer

The Ops / Infra Layer supports reliability, deployment, observability, security, permissions, queues, storage, authentication, and internal operations.

This includes infrastructure providers, logging, monitoring, authentication providers, databases, job runners, and admin tools.

Ops and infra make the core possible, but they are not the product core by themselves.

## 6. Relationship To Current EBC Product Surfaces

The AI Core should support every major workspace section.

### Dashboard

Dashboard should present the current state of the client workspace.

It depends on the AI Core for status, progress, next actions, recent outputs, workstream summaries, agent status, and meaningful activity.

### Diagnosis

Diagnosis should use client context, analysis state, audit events, findings, and outputs from the AI Core.

It should not be a standalone report page. It should be connected to workstreams, recommendations, next actions, and future execution.

### Workstreams

Workstreams are a primary expression of the AI Core.

They turn diagnosis and recommendations into structured execution. They should connect to client context, events, agents, outputs, status, blockers, and progress logic.

### Agents

Agents should operate as core-connected capabilities.

Agent recommendations, activations, runs, outputs, and status changes should connect back to shared state, events, workstreams, and Activity. Agents should not become isolated personalities or independent tools with separate memory.

### Activity

Activity is the client-facing expression of meaningful events.

It should be built from the shared event and operational history foundation, but filtered and phrased for clients. It should make the workspace feel alive without exposing raw logs.

### Future Impact

Impact should show measurable outcomes and business value.

It should use workstream progress, outputs, client goals, events, and confirmed results from the AI Core.

### Future Reports

Reports should be treated as outputs, not isolated downloadable files.

They should be connected to context, source workstreams, agents, events, and next actions.

### Future Playbooks

Playbooks should be reusable execution patterns that operate through the AI Core.

A playbook should create or update workstreams, activate agents, generate outputs, and emit events rather than existing as static content only.

### Future Assistant

Assistant should be an interface into the AI Core, not the AI Core itself.

It should answer questions, explain state, retrieve outputs, recommend actions, and initiate approved workflows using shared context and permissions.

## 7. Rule For New Solutions And Modules

Every new EBC solution should be evaluated against the shared core model.

A new module belongs properly in EBC when it can:

- Use shared Client and Client Context.
- Map to one or more Workstreams when it represents meaningful ongoing work.
- Interact with Client Agents or reusable agent capabilities where appropriate.
- Emit Events for meaningful state changes or outputs.
- Generate Outputs that become part of the client record.
- Update shared state, progress, or next action when appropriate.
- Appear coherently in Dashboard, Activity, Workstreams, Agents, Reports, or future Impact.

If a solution does not connect to the shared model, it risks becoming a disconnected point solution.

This does not mean every feature has to use every core concept. A small feature may only read client context and emit one event. A larger solution may create workstreams, activate agents, and generate outputs. The key is that it participates in the shared operating system rather than maintaining a separate world.

Practical evaluation question:

`If this module disappeared, would the rest of EBC still understand what happened for the client?`

If the answer is no, the module needs a stronger connection to the AI Core.

## 8. EBC-Specific Examples

### Sales Follow-Up

A sales follow-up solution should use client context such as ICP, target segments, sales process, offer, tone, and current pipeline constraints.

It may create a workstream for improving follow-up quality or pipeline conversion. A specialized sales agent could draft follow-up sequences, identify stale opportunities, or recommend next-best actions.

Outputs might include follow-up templates, account-specific recommendations, sequence drafts, or a pipeline risk summary.

Events should be emitted when the workstream is created, an agent is recommended or activated, a follow-up output is generated, or a next action changes.

Next actions might include approving a sequence, connecting CRM data, reviewing priority opportunities, or activating monitoring.

### Website Improvement

A website improvement solution should use client context such as positioning, target audience, funnel goals, current pages, conversion constraints, and known business priorities.

It may create a workstream for improving conversion, messaging clarity, or lead capture. A website analysis agent could review pages, identify friction, compare messaging against ICP, and recommend changes.

Outputs might include a website audit, prioritized page recommendations, copy revisions, or an implementation checklist.

Events should capture audit completion, workstream creation, output availability, and next-step updates.

Next actions might include approving homepage changes, adding analytics context, or selecting a landing page for deeper review.

### CRM / Back-Office Review

A CRM or back-office review should use client context such as sales motion, lifecycle stages, handoff rules, reporting needs, tools, and operational pain points.

It may create workstreams around data hygiene, lifecycle design, reporting visibility, or handoff quality. A RevOps or back-office agent could analyze fields, processes, gaps, and reporting structures.

Outputs might include a CRM health summary, process map, field cleanup plan, reporting recommendations, or implementation roadmap.

Events should track when source context is connected, diagnosis completes, workstreams are activated, and outputs are ready.

Next actions might include approving a cleanup plan, connecting additional systems, assigning an owner, or selecting the first process to improve.

### Market Study

A market study solution should use client context such as market, competitors, customer segments, offer, geography, pricing, and strategic questions.

It may create a workstream for market research or positioning strategy. A research agent could gather signals, summarize competitors, compare positioning, and identify opportunities.

Outputs might include a market landscape report, competitor brief, positioning memo, or strategic recommendation summary.

Events should be emitted when research starts, meaningful outputs are available, recommendations are produced, and next actions are updated.

Next actions might include reviewing the market brief, selecting a competitor set, approving a positioning direction, or moving into a website or sales workstream.

## 9. Current Vs Future State

Some parts of the AI Core already exist conceptually or partially in EBC. Other parts still need stronger implementation.

### Exists Conceptually Or Partially

- Workspace structure with Dashboard, Diagnosis, Workstreams, Agents, and Activity.
- Core entities and data model direction.
- System states and events direction.
- Activity and internal ops blueprint direction.
- Initial database schema direction.
- Implementation roadmap direction.
- Product language around diagnosis, workstreams, agents, outputs, and next steps.

These foundations are enough to align product decisions, but they should not be treated as fully complete infrastructure yet.

### Needs Stronger Implementation

- DB-backed client context as the durable source of truth.
- DB-backed workstreams, outputs, events, and activity records.
- Consistent service boundaries for loaders, mutations, orchestration, and output creation.
- A clearer distinction between internal events and client-facing Activity.
- Stronger next-action and progress logic.
- Agent lifecycle modeling across recommendation, activation, execution, output, and status.
- Shared metadata conventions for linking outputs to clients, workstreams, agents, and events.

These areas are where platform consistency will matter most as EBC adds new solutions.

### Future-Facing

- More advanced orchestration across agents, approvals, schedules, integrations, and workflows.
- Rich Assistant interactions that can query and act through the AI Core.
- Impact measurement tied to workstreams and outputs.
- Playbooks as reusable execution patterns.
- Integration-driven automation across CRM, website, analytics, Slack, email, and other systems.
- Internal/client split views over shared operational history.
- More granular permissions, visibility controls, and organization-level governance.

The current goal is not to build every future capability immediately. The goal is to make sure the foundation points in the right direction.

## 10. Recommended Next Steps

Recommended next steps:

- Continue aligning loaders, services, and product screens around shared core entities.
- Strengthen the event and activity layer so meaningful changes are captured consistently.
- Keep client-facing Activity separate from raw internal logs and operational telemetry.
- Move state, output metadata, workstream records, and event history toward DB-backed records over time.
- Define clear service boundaries for creating workstreams, emitting events, generating outputs, and updating next actions.
- Build future modules through the shared core model rather than as isolated pages or scripts.
- Treat integrations as context, event, execution, or output channels that feed the AI Core.
- Use the AI Core definition as a product review checklist before adding new solution areas.

The practical standard is simple: every new solution should make the shared EBC workspace smarter, more complete, and more useful for the client.

