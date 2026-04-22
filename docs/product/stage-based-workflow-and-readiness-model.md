# Stage-Based Workflow And Readiness Model

## 1. Purpose

EBC needs a reusable stage-based workflow model so business processes can progress in a structured, governed, and explainable way.

This model exists to:

- Structure process progression across different business domains.
- Govern when AI agents can act and what they are allowed to do.
- Prevent uncontrolled stage transitions.
- Make readiness visible before a process advances.
- Support consistent automation across sales, operations, onboarding, support, collections, consulting delivery, and future domains.
- Avoid treating agents as isolated conversational tools.

The core principle is that agents should operate inside defined business process stages. They should understand the current stage, the goal of that stage, the inputs required, the readiness rules, the allowed transitions, and the expected outcomes.

This makes EBC more reliable as a consulting operating system because progress is not just "an agent did something." Progress means a stage became ready, advanced, completed, blocked, failed, or produced an output that belongs to the client record.

## 2. Definition Of A Workflow

A workflow in EBC is a structured business process composed of stages.

Each workflow should define:

- The purpose of the process.
- The ordered or conditional stages that make up the process.
- The required inputs for each stage.
- The owner mode for each stage.
- The readiness rules that determine whether the stage can proceed.
- The transition logic for moving between stages.
- The expected outputs and outcomes.

This model is not limited to sales. A workflow can describe preaudit, Business Context capture, audit, workstream activation, website improvement, CRM review, onboarding, support triage, collections, reporting, or any other repeatable business process.

The workflow is the governed process. Agents, humans, integrations, and background jobs operate within it.

## 3. Definition Of A Stage

A stage is a meaningful step within a workflow.

A stage should represent a business-relevant state, not a low-level technical task. It should be clear enough for a product surface to explain and structured enough for the AI Core to evaluate.

Each stage should contain:

- Stage name: the visible or internal name of the stage.
- Stage goal: what this stage is trying to accomplish.
- Required inputs: the information, files, approvals, signals, or system connections needed before the stage can proceed.
- Readiness state: whether the stage is ready, not ready, blocked, in progress, complete, failed, or not relevant.
- Owner mode: whether the stage is human-led, AI-led, or hybrid.
- Transition rules: the conditions that allow the workflow to move forward, move backward, pause, branch, or stop.
- Fallback and escalation rules: what happens when required inputs are missing, confidence is low, an action fails, or human review is needed.
- Expected outputs: the artifacts, recommendations, decisions, state changes, or next actions the stage should produce.
- Success, fail, and blocked conditions: the clear end states for the stage.

Stages should be explicit enough that a client, operator, or agent can answer:

- What is this stage for?
- What is required to move forward?
- Who or what is responsible right now?
- What happens when this stage completes?
- What should happen if it cannot complete?

## 4. Required Inputs And Readiness Rules

Required inputs are gating conditions. They determine whether a stage has enough information or approval to proceed.

Required inputs matter because they:

- Prevent incomplete or low-quality progression.
- Make missing context visible.
- Help agents ask better questions.
- Support AI-led extraction from websites, CRM data, documents, notes, or prior outputs.
- Create clearer next actions for clients and internal operators.
- Make automation safer by ensuring agents act only when the process is ready.

Readiness in EBC means a stage has enough validated context, permission, data, and confidence to move to the next step or produce its expected output.

Readiness should be expressed in product and system terms:

- Ready: required inputs are satisfied and the stage can proceed.
- Not ready: required inputs are missing, but the path to readiness is clear.
- In progress: the stage is actively being worked by a human, agent, integration, or workflow run.
- Blocked: a required input, approval, dependency, or decision is preventing progress.
- Complete: the stage produced its expected outcome.
- Failed: the stage could not complete because of a real error or unrecoverable condition.
- Not relevant: the stage does not apply to this client or process instance.

Not every stage needs a complex readiness calculation. Some can use simple required fields. Others may combine fields, system data, agent confidence, approvals, and business rules.

The key is that readiness should be explicit, inspectable, and connected to next actions.

## 5. Owner Modes

Owner mode defines who or what operates a stage.

### Human-Led

A human-led stage requires a client, consultant, or internal operator to make the primary decision or provide the primary input.

Use human-led stages when:

- Judgment, approval, or accountability is required.
- The input cannot be reliably inferred.
- The decision has client-facing, legal, financial, or strategic impact.
- The system needs confirmation before acting.

Example: approving a recommended workstream before activation.

### AI-Led

An AI-led stage can be completed primarily by an agent or automated capability using available context and allowed tools.

Use AI-led stages when:

- The task is bounded and repeatable.
- The required inputs are available.
- The expected output can be reviewed or safely generated.
- The stage has clear success and failure criteria.
- The consequences of acting are low-risk or reversible.

Example: generating a first-pass website audit from a URL and existing Business Context.

### Hybrid

A hybrid stage combines AI execution with human input, review, approval, or exception handling.

Use hybrid stages when:

- AI can prepare, analyze, summarize, or recommend.
- A human should validate, approve, or choose among options.
- The process benefits from automation but still needs judgment.
- Confidence thresholds determine whether human review is required.

Example: an agent drafts CRM cleanup recommendations, then a human approves which changes become an active workstream.

Owner mode can change over time as EBC gains confidence, better integrations, better data quality, or stronger approval controls.

## 6. Transition Logic

Workflow transitions should be governed by readiness and explicit rules.

Core transition rules:

- A stage should advance only when readiness is satisfied.
- Critical missing inputs should block transition.
- Non-critical missing inputs may allow transition with warnings or reduced confidence.
- Agents may gather missing inputs when allowed by the stage.
- Human review should be required when rules, confidence, or risk thresholds demand it.
- Stage transitions should emit events.
- Stage transitions should update next actions when there is something useful for the client or operator to do.
- Client-facing Activity should show only meaningful, client-safe transition events.

Common transition events include:

- Stage entered.
- Stage readiness updated.
- Stage blocked.
- Stage unblocked.
- Stage completed.
- Stage failed.
- Stage skipped or marked not relevant.
- Workflow completed.

Transition logic should avoid silent state changes. If a workflow moves forward, becomes blocked, or produces an output, the shared event model should know about it.

This supports Dashboard status, Activity history, internal ops, future alerts, and Impact measurement.

## 7. Outcomes And Closure

Workflows and stages need clear end conditions.

Recommended outcome states:

- Success: the stage or workflow completed and produced the expected result.
- Blocked: progress is paused because a required input, approval, dependency, or external condition is missing.
- Failed: the stage attempted to complete but could not due to an error, invalid input, unavailable integration, or unrecoverable condition.
- Dropped: the stage or workflow is no longer relevant or was intentionally abandoned.
- Not relevant: the stage does not apply to this client or workflow instance.

Clear outcomes matter because they:

- Make progress measurable.
- Prevent ambiguous "in progress forever" states.
- Help clients and operators understand what happened.
- Support reliable Activity and internal ops histories.
- Allow future Impact views to connect work performed to outcomes achieved.
- Give agents clearer boundaries for what to do next.

Closure should not always mean success. A workflow that is dropped or marked not relevant can still be a valid product outcome if the reason is captured clearly.

## 8. Relationship To Agents

Agents should operate inside stage constraints.

An agent should know:

- The current workflow.
- The current stage.
- The stage goal.
- The required inputs.
- The readiness state.
- The allowed actions.
- The expected output.
- The transition rules.
- The fallback or escalation path.

Agents should not act freely without context. They should not invent process progression, skip required inputs, or produce outputs that are disconnected from the client record.

This model makes agents more reliable because it gives them operational boundaries. It also makes agents easier to govern because EBC can evaluate whether the agent:

- Used the right client context.
- Stayed within the stage goal.
- Gathered or requested required inputs.
- Produced the expected output.
- Emitted the right event.
- Updated the right next action.
- Escalated appropriately when blocked.

In EBC, agents are operators inside governed process flows, not free-floating chatbots.

## 9. Relationship To The AI Core

The stage-based workflow model is part of the AI Core operating model.

It connects to:

- Shared client context: stages use context to determine readiness, actions, and outputs.
- Shared states: workflows, stages, workstreams, and agents need consistent lifecycle states.
- Shared events: stage transitions and outcomes should emit events.
- Workstreams: many workflows should create, activate, update, or complete workstreams.
- Client agents: agents operate within stage constraints and produce stage outcomes.
- Outputs: stages often produce reports, recommendations, summaries, plans, or other outputs.
- Next actions: readiness gaps and completed stages should update what the client or operator should do next.
- Activity and alerts: meaningful stage changes can appear in client Activity or internal ops channels.

This model gives the AI Core a practical execution grammar. It defines how business processes move, when agents can act, and how progress becomes visible.

## 10. EBC-Specific Examples

### Preaudit To Business Context To Audit

Stage: Preaudit

- Goal: create an initial read on the business from a website URL and available public signals.
- Required inputs: website URL, client identity, initial crawl or analysis result.
- Owner mode: AI-led.
- Transition logic: move to Business Context when the preaudit output is generated and the workspace is ready for client-specific context.
- Output: preaudit summary and initial diagnostic signals.
- Next action: collect or confirm Business Context.

Stage: Business Context

- Goal: capture the client's goals, constraints, operating context, and priorities.
- Required inputs: business goals, ICP or target audience, current challenges, relevant constraints, and confirmation of key assumptions.
- Owner mode: human-led or hybrid.
- Transition logic: move to Audit when critical context fields are complete or explicitly skipped with acceptable confidence.
- Output: saved Client Context.
- Next action: run or review the deeper audit.

Stage: Audit

- Goal: produce a deeper diagnosis and prioritized opportunities.
- Required inputs: preaudit output, Client Context, available source data, and audit scope.
- Owner mode: AI-led or hybrid.
- Transition logic: complete when audit findings and recommendations are generated; create workstream recommendations where appropriate.
- Output: audit report, diagnosis, recommended workstreams, and next actions.
- Next action: review recommendations and choose what to activate.

### Workstream Activation

Stage: Recommended

- Goal: present a meaningful workstream opportunity.
- Required inputs: diagnosis or triggering event, business rationale, expected outcome, and suggested owner mode.
- Owner mode: hybrid.
- Transition logic: move to Activation Ready when the opportunity has enough context, scope, and expected value.
- Output: workstream recommendation.
- Next action: review the recommendation.

Stage: Activation Ready

- Goal: confirm that the workstream can start.
- Required inputs: client approval or internal approval, scope, initial success criteria, dependencies, and any required agent capability.
- Owner mode: human-led or hybrid.
- Transition logic: activate only when required approvals and critical inputs are present.
- Output: active workstream record.
- Next action: start the first execution stage or activate the relevant agent.

Stage: Active

- Goal: execute the workstream through agents, humans, integrations, or playbooks.
- Required inputs: active scope, owner mode, current next action, and stage-specific inputs.
- Owner mode: human-led, AI-led, or hybrid depending on workstream type.
- Transition logic: progress through stage events; block when required inputs are missing.
- Output: progress updates, outputs, recommendations, or completed work.
- Next action: continue execution, resolve blocker, review output, or close workstream.

### Sales Follow-Up Workstream

Stage: Context Setup

- Goal: understand the sales process and follow-up constraints.
- Required inputs: offer, ICP, sales stages, tone, current follow-up process, CRM connection or sample opportunities.
- Owner mode: hybrid.
- Transition logic: move to Analysis when core sales context and source examples are available.
- Output: sales follow-up context.
- Next action: analyze opportunities or draft follow-up logic.

Stage: Follow-Up Analysis

- Goal: identify follow-up gaps, stale opportunities, and improvement patterns.
- Required inputs: sales context, opportunity data or examples, target segment rules.
- Owner mode: AI-led.
- Transition logic: complete when the agent identifies actionable patterns with sufficient confidence.
- Output: follow-up risk summary and improvement recommendations.
- Next action: review proposed sequences or priority opportunities.

Stage: Recommendation Approval

- Goal: confirm which follow-up actions should be used.
- Required inputs: recommended sequence, target audience, approval criteria, optional human edits.
- Owner mode: human-led.
- Transition logic: move to active execution only after approval.
- Output: approved follow-up plan or templates.
- Next action: activate monitoring, export templates, or connect execution channel.

### CRM / Back-Office Review

Stage: Source Connection

- Goal: gather enough operational context to review the CRM or back-office process.
- Required inputs: process description, lifecycle stages, reporting needs, known pain points, and source data or screenshots.
- Owner mode: hybrid.
- Transition logic: move to Review when required context and enough source evidence are available.
- Output: connected or documented source context.
- Next action: run the review.

Stage: Operational Review

- Goal: identify process gaps, data issues, reporting weaknesses, or handoff problems.
- Required inputs: source context, Client Context, review scope, and available records or examples.
- Owner mode: AI-led or hybrid.
- Transition logic: complete when findings are structured and mapped to recommended actions.
- Output: CRM health summary, process map, cleanup plan, or reporting recommendations.
- Next action: approve a cleanup or implementation workstream.

Stage: Implementation Planning

- Goal: decide what should be fixed first and how.
- Required inputs: findings, priority ranking, owner, constraints, and approval.
- Owner mode: human-led or hybrid.
- Transition logic: activate workstream when scope, priority, and owner are confirmed.
- Output: implementation roadmap or active workstream.
- Next action: begin cleanup, reporting, or process redesign work.

### Website Improvement

Stage: Website Diagnosis

- Goal: identify website friction, messaging gaps, and conversion opportunities.
- Required inputs: website URL, Client Context, target audience, conversion goal, and pages in scope.
- Owner mode: AI-led.
- Transition logic: complete when findings and prioritized recommendations are generated.
- Output: website audit or page-level recommendation summary.
- Next action: choose a page, recommendation, or workstream to activate.

Stage: Change Planning

- Goal: turn recommendations into practical website changes.
- Required inputs: selected page or section, approved recommendation, brand or messaging constraints, implementation owner.
- Owner mode: hybrid.
- Transition logic: move to execution when scope and approval are ready.
- Output: copy changes, UX recommendations, implementation checklist, or experiment plan.
- Next action: approve changes or assign implementation.

Stage: Review And Close

- Goal: confirm whether the change was completed or requires more work.
- Required inputs: implementation status, reviewed output, optional performance signal.
- Owner mode: human-led or hybrid.
- Transition logic: close when the change is accepted, block if implementation is waiting, or create an Impact follow-up if measurement is available.
- Output: completion note, updated output, or Impact signal.
- Next action: measure impact or continue to the next page.

### Collections Or Support Flow

Stage: Case Intake

- Goal: capture the issue, account context, and urgency.
- Required inputs: client or account identity, issue description, relevant records, priority, and communication channel.
- Owner mode: human-led or hybrid.
- Transition logic: move to Triage when critical issue details are present.
- Output: structured case context.
- Next action: triage the case.

Stage: Triage

- Goal: determine category, severity, owner, and next step.
- Required inputs: case context, policies, account status, and available history.
- Owner mode: AI-led or hybrid.
- Transition logic: route automatically if confidence is high; escalate to human review if severity or ambiguity is high.
- Output: triage result and recommended action.
- Next action: assign owner, request missing information, or send approved response.

Stage: Resolution

- Goal: complete the required action and close the loop.
- Required inputs: approved response or action, owner, resolution criteria, and any required confirmation.
- Owner mode: human-led, AI-led, or hybrid depending on risk.
- Transition logic: close when resolution criteria are met; block when waiting on customer, system, or approval.
- Output: resolution summary and event history.
- Next action: close, follow up, or escalate.

## 11. Product Implications

This model should shape how EBC presents workflows, workstreams, and agents in the workspace.

Product implications:

- Readiness sections: important stages should show what is ready, missing, blocked, or complete.
- Required input indicators: the UI should make critical missing inputs visible without becoming noisy.
- Blocked states: blocked work should explain what is needed next in client-safe language.
- Better workstream activation rules: workstreams should not activate until required scope, context, and approval conditions are met.
- Agent activation clarity: agents should show what stage or workstream they are operating in and what they are allowed to do.
- Cleaner Activity: Activity can show meaningful stage transitions instead of raw operational logs.
- Future Impact: completed stages and workstreams can become evidence for outcomes and measurable progress.
- Better Assistant behavior: Assistant can explain current stage, readiness, blockers, and next actions from shared workflow state.

The workspace should not only show that work exists. It should show whether work is ready, who or what is responsible, what is blocking progress, and what should happen next.

## 12. Recommended Next Steps

Recommended next steps:

- Define readiness requirements for core EBC transitions: Preaudit, Business Context, Audit, and Workstream activation.
- Standardize stage metadata across workflows: name, goal, required inputs, readiness state, owner mode, transition rules, outputs, and outcomes.
- Connect workstream activation to readiness so workstreams only become active when required conditions are satisfied.
- Connect agent activation to stage constraints so agents know what they can do and why.
- Emit stage transition events consistently for entered, ready, blocked, completed, failed, skipped, and not relevant states.
- Use stage events to improve Dashboard, Activity, internal ops, and future alerts.
- Treat missing required inputs as first-class next actions, not hidden validation errors.
- Use this model as a review rule for future solutions and modules.

The practical standard is simple: every repeatable EBC process should define its stages, readiness rules, owner modes, transitions, and outcomes before agents are allowed to operate inside it.

