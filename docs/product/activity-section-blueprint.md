# Activity Section Blueprint

## 1. Purpose

Activity is the client-facing record of meaningful progress inside the EBC workspace.

EBC is becoming a client operating system, not just a reporting platform. Clients need to understand what has happened, what is happening now, and what has changed since they last checked in. The Activity section should make that progress visible without exposing raw operational detail.

Activity matters because it:

- Shows forward motion across diagnosis, workstreams, agents, and outputs.
- Makes invisible work visible, especially when AI or automation is involved.
- Builds trust by showing that the system is acting in understandable, client-safe ways.
- Helps clients orient themselves after time away from the workspace.
- Reduces the feeling of "black box AI" by turning system progress into plain-language updates.
- Supports EBC's transformation narrative by showing a sequence of work, decisions, outputs, and next steps.

The goal is not to expose every system event. The goal is to create a useful, calm, credible product surface that helps clients feel informed and in control.

## 2. What Activity Is

Activity is a timeline or feed of meaningful client-safe events in the workspace.

An Activity item should represent something a client can understand and reasonably care about. It should answer one or more of these questions:

- What changed?
- What was completed?
- What is now available?
- What needs attention?
- What is the next meaningful step?

Activity is not:

- A raw technical log viewer.
- A debugging page.
- A stream of internal operations alerts.
- A complete audit trail.
- A low-level run history for agents, jobs, or infrastructure.

The Activity section should translate platform movement into product meaning. Internal events may be the source, but the client-facing Activity item should be curated, phrased, and scoped for client understanding.

## 3. What Should Appear In Activity

Activity should include events that communicate meaningful progress, workspace state changes, or client-relevant outcomes.

### Preaudit Completed

This belongs because it marks the first meaningful analysis milestone. It tells the client that EBC has moved from intake or setup into an initial understanding of the business.

Example title: `Preaudit completed`

Example description: `Initial signals were reviewed and the workspace is ready for business context.`

### Business Context Saved

This belongs because business context changes the quality and direction of EBC's recommendations. It is a client-authored input that should be visible in the workspace history.

Example title: `Business context saved`

Example description: `Company goals, constraints, and operating context were updated.`

### Audit Completed

This belongs because it is a major diagnostic milestone and often unlocks recommendations, workstreams, outputs, or next steps.

Example title: `Audit completed`

Example description: `A full diagnostic review is available with prioritized findings.`

### Workstream Created

This belongs because workstreams are a core unit of transformation in EBC. Creating one signals that an opportunity or problem has become structured work.

Example title: `Workstream created`

Example description: `A new workstream was created for improving lead handoff quality.`

### Workstream Activated

This belongs because activation signals that a workstream moved from planned or recommended into active progress.

Example title: `Workstream activated`

Example description: `The RevOps alignment workstream is now active.`

### Workstream Blocked

This can belong, but only when phrased appropriately. The client-facing version should focus on what needs attention, not internal failure mechanics.

Example title: `Workstream needs input`

Example description: `Progress is waiting on confirmation of the target account criteria.`

Avoid titles like `Workstream blocked by failed dependency` or descriptions that expose internal technical causes.

### Agent Recommended

This belongs because agent recommendations are part of the workspace becoming proactive. The event should explain the practical reason for the recommendation, not only name the agent.

Example title: `Agent recommended`

Example description: `A research agent was recommended to monitor priority account changes.`

### Agent Activated

This belongs because agent activation changes the operating model of the workspace. It tells the client that EBC is now doing a specific kind of recurring or delegated work.

Example title: `Agent activated`

Example description: `The account research agent is now monitoring selected target accounts.`

### New Output Or Report Available

This belongs because outputs and reports are concrete artifacts clients can inspect, share, or act on.

Example title: `New report available`

Example description: `The pipeline friction summary is ready for review.`

### Next Step Updated

This belongs because EBC should always help clients understand what to do next. A next-step update is useful when it changes the recommended action or clarifies ownership.

Example title: `Next step updated`

Example description: `The recommended next step is to approve the account segmentation workstream.`

## 4. What Should Not Appear

Client-facing Activity should intentionally exclude raw, noisy, or internal-only information.

The following should stay out:

- Stack traces.
- Raw retries.
- Queue events.
- Job start and job end telemetry unless it maps to a client-meaningful milestone.
- Internal failures in raw form.
- Low-level agent run steps.
- Token usage, model selection, latency, or infrastructure metadata.
- Debugging details.
- Internal notes not meant for clients.
- Partial intermediate states that do not change the client experience.
- Unresolved technical details that would create confusion or reduce trust.

If an internal failure affects the client experience, Activity may show a client-safe version only when there is a useful action or outcome.

Example internal event to exclude: `agent_run.failed: timeout after retry 3`

Possible client-safe Activity item: `Report delayed`

Possible description: `The report is taking longer than expected. No action is needed right now.`

Even then, these items should be used sparingly. Most internal operational noise belongs in internal ops, logs, alerts, or monitoring surfaces.

## 5. Presentation Model

Activity should feel calm, scannable, and trustworthy. It should make the workspace feel alive without making it feel busy.

Possible presentation models:

- Chronological timeline: clear and familiar, but can become long if not grouped.
- Grouped feed by day or week: easier to scan and better for returning clients.
- Grouped by category: useful for analysis, but less natural as a workspace history.
- Mixed event cards with event type icons: visually clear, but can feel heavy if every item becomes a card.
- Compact feed with expandable detail: keeps the surface calm while allowing deeper context when needed.

Recommended direction: a compact chronological feed grouped by day, with lightweight event rows, event type icons, and optional expandable detail.

This model fits EBC because:

- It preserves the sense of time and progress.
- It supports quick scanning after a client returns to the workspace.
- It avoids turning every update into a large content card.
- It can handle both small updates and major milestones.
- It leaves room for future CTAs, linked outputs, approvals, and summaries.

The default view should emphasize milestone updates, recent changes, and available next actions. Older activity can remain accessible through scrolling, filtering, or pagination, but the first version does not need advanced controls.

## 6. Event Detail Level

Each Activity item should include enough detail to be useful without becoming a log entry.

Recommended fields visible in the UI:

- Title: a short human-readable event label.
- Short description: one sentence explaining why the event matters.
- Time: relative time in the near term, with exact time available through hover or detail.
- Related entity: the workstream, agent, output, diagnosis, or report connected to the event.
- Optional CTA: a single action when there is a natural next step.

Examples of CTAs:

- `View report`
- `Open workstream`
- `Review recommendation`
- `Approve next step`
- `Add context`

An Activity item should not expose all raw event properties. Most items should be understandable in one glance. Expandable detail can provide a little more context, but it should still be product language, not technical payload.

Good Activity detail:

`The audit identified three priority areas: pipeline visibility, lead handoff, and account coverage.`

Too much detail:

`audit_run_01HZX completed after 14 steps with 2 warnings, 3 retries, model gpt-x, and parser confidence 0.83.`

The right level of detail is enough to support client confidence and navigation, not enough to recreate the backend event.

## 7. Empty States

Activity should have explicit empty and low-activity states. These states should explain what is happening without sounding like a feature tour.

### No Activity Yet

Use when the workspace has just been created and no client-safe events exist.

Message direction: the workspace is ready, and meaningful updates will appear here as EBC starts working.

Example:

`No activity yet`

`Meaningful workspace updates will appear here as setup, diagnosis, and workstreams begin.`

### Waiting For First Preaudit

Use when setup has started but the first preaudit has not completed.

Example:

`Waiting for first preaudit`

`Activity will begin once the initial review is complete.`

### No New Updates Recently

Use when there is historical activity but nothing new in the selected period.

Example:

`No new updates recently`

`Recent workspace changes will appear here when there is something meaningful to review.`

### Progress Exists But No Feed-Worthy Changes Yet

Use when internal work is happening but nothing client-safe or meaningful should be shown.

Example:

`No client updates right now`

`EBC is still working in the background. Updates will appear when there is a meaningful change or output.`

This state is important because it prevents the product from filling the feed with low-value events just to look active.

## 8. Relationship To Other Sections

Activity should connect the workspace without replacing the purpose of other sections.

### Dashboard

Dashboard shows the current state of the workspace: what matters now, what needs attention, and what progress looks like at a glance.

Activity shows what changed over time. A compact Activity preview can appear on Dashboard, but the full Activity section should provide the broader history.

### Diagnosis

Diagnosis contains the structured findings, priorities, and reasoning from audits or reviews.

Activity should announce when diagnosis-related milestones happen, such as preaudit completion, audit completion, or new findings becoming available. It should link into Diagnosis rather than duplicate the full diagnostic content.

### Workstreams

Workstreams are where structured transformation work is tracked and executed.

Activity should show lifecycle moments such as creation, activation, meaningful status changes, new blockers requiring client input, and next-step updates. It should not replace workstream detail pages or task-level management.

### Agents

Agents represent delegated or automated work.

Activity should show when agents are recommended, activated, produce meaningful outputs, or require client attention. It should not show raw agent reasoning traces, step-by-step execution logs, or every background run.

### Future Impact

Impact should show outcomes, value, and measurable change.

Activity should show the events that lead toward impact. When an impact metric changes or a result is confirmed, Activity can include a summary item that links to the Impact section.

### Future Internal Ops Layer

The internal ops layer should remain the place for raw events, technical logs, alerts, failed jobs, retries, traces, and staff-only notes.

Activity should be downstream of that layer, not a mirror of it. Internal ops answers, "What happened technically and operationally?" Activity answers, "What meaningful progress should the client know about?"

## 9. Future Evolution

Activity can start simple and evolve into a richer client history surface.

Potential future directions:

- Richer client history: a durable record of major workspace milestones, decisions, outputs, approvals, and completed work.
- Linked outputs and reports: Activity items that open reports, summaries, memos, recommendations, or generated artifacts.
- Alert summaries: client-safe summaries of issues that need attention, expressed as product states rather than raw failures.
- Approval flows: Activity items that allow clients to approve a workstream, agent activation, recommendation, or next step.
- Internal/client split views: separate internal and client views of the same underlying event stream, with different visibility and wording.
- Slack or internal routing behind the scenes: internal notifications can route to Slack or ops channels while only selected client-safe updates appear in Activity.
- Filtering and search: future filters by workstream, agent, output, milestone, or attention-needed status.
- Weekly summaries: generated recaps of what changed, what was completed, and what needs attention.

The long-term opportunity is for Activity to become the workspace memory: not a log of everything, but a clear record of meaningful progress and decisions.

## 10. Recommended First Implementation Slice

The first implementation should be intentionally small and client-safe.

Recommended first slice:

- Create a basic Activity feed in the workspace.
- Use a compact chronological timeline grouped by day.
- Include a limited set of event categories:
  - Preaudit completed.
  - Business Context saved.
  - Audit completed.
  - Workstream created.
  - Workstream activated.
  - Agent recommended.
  - Agent activated.
  - New output or report available.
  - Next step updated.
- Avoid raw logs, retries, stack traces, infrastructure details, and internal-only notes.
- Include title, description, time, related entity, and optional CTA.
- Add empty states for no activity, waiting for first preaudit, and no recent updates.
- Consider showing a short Activity preview on Dashboard, with a dedicated Activity section for the full feed.

The first version should prove the product value: clients can return to the workspace and quickly understand what changed, what was completed, and what they should look at next.

