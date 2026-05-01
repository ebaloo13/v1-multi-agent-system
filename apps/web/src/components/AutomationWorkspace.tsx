import WorkspaceShell, { WorkspaceAppSidebar } from './WorkspaceShell'
import {
  automationHref,
  buildAutomationWorkspace,
  type AutomationAgent,
  type AutomationArtifact,
  type AutomationReviewItem,
  type AutomationRun,
  type AutomationTask,
  type AutomationTaskStatus,
  type AutomationWorkspace,
} from '../lib/automation-workspace'
import type { WorkspaceSectionId } from '../lib/product-shell'

export type AutomationViewId =
  | 'dashboard'
  | 'agentBoard'
  | 'taskLifecycle'
  | 'runTimeline'
  | 'artifacts'
  | 'reviewQueue'
  | 'agentProfiles'

type AutomationWorkspacePageProps = {
  clientSlug: string
  view: AutomationViewId
}

type AutomationBoardStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'

const viewMeta: Record<
  AutomationViewId,
  {
    eyebrow: string
    title: string
    section: WorkspaceSectionId
    primaryLabel: string
  }
> = {
  dashboard: {
    eyebrow: 'Workspace MVP',
    title: 'Client workspace dashboard',
    section: 'dashboard',
    primaryLabel: 'Open review queue',
  },
  agentBoard: {
    eyebrow: 'Agent board',
    title: 'Human and agent operating board',
    section: 'agentBoard',
    primaryLabel: 'Open task lifecycle',
  },
  taskLifecycle: {
    eyebrow: 'Task lifecycle',
    title: 'Business task flow',
    section: 'taskLifecycle',
    primaryLabel: 'Open run timeline',
  },
  runTimeline: {
    eyebrow: 'Run timeline',
    title: 'Agent execution history',
    section: 'runTimeline',
    primaryLabel: 'Open artifacts',
  },
  artifacts: {
    eyebrow: 'Artifacts',
    title: 'Generated work viewer',
    section: 'artifacts',
    primaryLabel: 'Open review queue',
  },
  reviewQueue: {
    eyebrow: 'Human review',
    title: 'Decisions and blockers',
    section: 'reviewQueue',
    primaryLabel: 'Open agent profiles',
  },
  agentProfiles: {
    eyebrow: 'Agent profiles',
    title: 'Business automation agent cards',
    section: 'agentProfiles',
    primaryLabel: 'Open agent board',
  },
}

const boardColumns: Array<{
  status: AutomationBoardStatus
  label: string
  tone: 'backlog' | 'todo' | 'progress' | 'review' | 'done'
}> = [
  { status: 'backlog', label: 'Backlog', tone: 'backlog' },
  { status: 'todo', label: 'Todo', tone: 'todo' },
  { status: 'in_progress', label: 'In Progress', tone: 'progress' },
  { status: 'in_review', label: 'In Review', tone: 'review' },
  { status: 'done', label: 'Done', tone: 'done' },
]

export function AutomationWorkspacePage({ clientSlug, view }: AutomationWorkspacePageProps) {
  const workspace = buildAutomationWorkspace(clientSlug)
  const meta = viewMeta[view]

  if (view === 'agentBoard' || view === 'taskLifecycle') {
    return <AutomationBoardWorkspace workspace={workspace} view={view} />
  }

  return (
    <WorkspaceShell
      section={meta.section}
      clientSlug={workspace.clientSlug}
      clientName={workspace.clientName}
      website={workspace.website}
      stageLabel={workspace.currentStage}
      stageDetail={workspace.currentStageDetail}
      primaryActionLabel={workspace.recommendedNextLabel}
      primaryActionDetail={workspace.recommendedNextDetail}
      statusChips={[
        { label: 'Agents', value: String(workspace.agents.length), tone: 'progress' },
        { label: 'Open reviews', value: String(workspace.reviewQueue.length), tone: 'pending' },
        {
          label: 'Blocked',
          value: String(workspace.tasks.filter((task) => task.blocker).length),
          tone: 'pending',
        },
      ]}
      action={<WorkspaceActions workspace={workspace} view={view} />}
    >
      {view === 'dashboard' ? <AutomationDashboard workspace={workspace} /> : null}
      {view === 'runTimeline' ? <AutomationRunTimeline runs={workspace.runs} /> : null}
      {view === 'artifacts' ? <AutomationArtifactViewer artifacts={workspace.artifacts} /> : null}
      {view === 'reviewQueue' ? <AutomationReviewQueue items={workspace.reviewQueue} /> : null}
      {view === 'agentProfiles' ? <AutomationAgentProfiles agents={workspace.agents} /> : null}
    </WorkspaceShell>
  )
}

export function AutomationDashboardPanel({ clientSlug }: { clientSlug: string }) {
  const workspace = buildAutomationWorkspace(clientSlug)

  return <AutomationDashboard workspace={workspace} compact />
}

function AutomationBoardWorkspace({
  workspace,
  view,
}: {
  workspace: AutomationWorkspace
  view: 'agentBoard' | 'taskLifecycle'
}) {
  const meta = viewMeta[view]

  return (
    <main className={`workspace-page workspace-section-${meta.section} automation-workspace-page`}>
      <section className="workspace-app-shell automation-workspace-shell">
        <WorkspaceAppSidebar
          section={meta.section}
          clientSlug={workspace.clientSlug}
          clientName={workspace.clientName}
          website={workspace.website}
        />
        <section className="automation-app-main">
          <AutomationBoardHeader workspace={workspace} title={meta.title} sectionLabel={meta.eyebrow} />
          <AutomationToolbar taskCount={workspace.tasks.length} />
          <AutomationKanbanBoard tasks={workspace.tasks} />
        </section>
      </section>
    </main>
  )
}

function AutomationBoardHeader({
  workspace,
  title,
  sectionLabel,
}: {
  workspace: AutomationWorkspace
  title: string
  sectionLabel: string
}) {
  return (
    <header className="automation-board-header">
      <div className="automation-breadcrumb">
        <span>{workspace.clientName}</span>
        <span>&gt;</span>
        <strong>{sectionLabel}</strong>
      </div>
      <h1>{title}</h1>
    </header>
  )
}

function AutomationToolbar({ taskCount }: { taskCount: number }) {
  return (
    <div className="automation-toolbar">
      <div className="automation-toolbar-left">
        <button type="button" className="automation-toolbar-button is-active">
          <span>▥</span>
          Board
        </button>
        <button type="button" className="automation-toolbar-button">
          <span>▽</span>
          Filter
        </button>
        <button type="button" className="automation-toolbar-button">
          <span>≡</span>
          Display
        </button>
      </div>
      <div className="automation-toolbar-right">
        <span>{taskCount} tasks</span>
        <button type="button" className="automation-new-task-button">
          + New Task
        </button>
      </div>
    </div>
  )
}

function AutomationDashboard({
  workspace,
  compact = false,
}: {
  workspace: AutomationWorkspace
  compact?: boolean
}) {
  const activeAgents = workspace.agents.filter((agent) => agent.status === 'active').length
  const blockedTasks = workspace.tasks.filter((task) => task.blocker).length
  const reviewReadyArtifacts = workspace.artifacts.filter(
    (artifact) => artifact.status === 'review_ready',
  ).length

  return (
    <>
      <section className="automation-stat-grid">
        <MetricCard label="Active agents" value={String(activeAgents)} detail="Agents currently executing work." />
        <MetricCard label="Tasks in flight" value={String(workspace.tasks.length)} detail="Lifecycle-managed business tasks." />
        <MetricCard label="Open reviews" value={String(workspace.reviewQueue.length)} detail="Human decisions before activation." />
        <MetricCard label="Blocked work" value={String(blockedTasks)} detail="Items waiting on access or clarity." />
        <MetricCard label="Artifacts" value={String(workspace.artifacts.length)} detail={`${reviewReadyArtifacts} ready for review.`} />
      </section>

      {!compact ? (
        <section className="automation-dashboard-grid">
          <article className="content-panel">
            <div className="workspace-panel-head">
              <div>
                <p className="eyebrow">Current priorities</p>
                <h2 className="workspace-panel-title">What needs attention</h2>
              </div>
            </div>
            <div className="workspace-list-grid mt-4">
              {workspace.tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="workspace-module-row">
                  <div className="workspace-row-head">
                    <strong>{task.title}</strong>
                    <span className={`automation-priority-badge tone-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p>{task.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="content-panel">
            <div className="workspace-panel-head">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2 className="workspace-panel-title">Latest signals</h2>
              </div>
            </div>
            <div className="workspace-list-grid mt-4">
              {workspace.runs.flatMap((run) => run.steps).slice(0, 4).map((step) => (
                <div key={step.id} className="workspace-module-row">
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

    </>
  )
}

function AutomationKanbanBoard({ tasks }: { tasks: AutomationTask[] }) {
  return (
    <section className="automation-kanban">
      {boardColumns.map((column) => {
        const columnTasks = tasks.filter((task) => boardStatusFromTask(task.status) === column.status)

        return <BoardColumn key={column.status} column={column} tasks={columnTasks} />
      })}
    </section>
  )
}

function BoardColumn({
  column,
  tasks,
}: {
  column: (typeof boardColumns)[number]
  tasks: AutomationTask[]
}) {
  return (
    <article className={`automation-kanban-column tone-${column.tone}`}>
      <header className="automation-column-header">
        <div>
          <span className={`automation-column-status tone-${column.tone}`} />
          <strong>{column.label}</strong>
          <em>{tasks.length}</em>
        </div>
        <div className="automation-column-actions">
          <button type="button" aria-label={`${column.label} column options`}>
            ...
          </button>
          <button type="button" aria-label={`Add ${column.label} task`}>
            +
          </button>
        </div>
      </header>

      <div className="automation-kanban-stack">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </article>
  )
}

function boardStatusFromTask(status: AutomationTaskStatus): AutomationBoardStatus {
  switch (status) {
    case 'recommended':
    case 'backlog':
      return 'backlog'
    case 'queued':
    case 'claimed':
    case 'blocked':
    case 'todo':
      return 'todo'
    case 'running':
    case 'in_progress':
      return 'in_progress'
    case 'human_review':
    case 'in_review':
      return 'in_review'
    case 'completed':
    case 'done':
      return 'done'
  }
}

function AutomationRunTimeline({ runs }: { runs: AutomationRun[] }) {
  return (
    <section className="automation-run-layout">
      {runs.map((run) => (
        <article key={run.id} className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">{run.id}</p>
              <h2 className="workspace-panel-title">{run.title}</h2>
            </div>
            <span className={`workspace-status-pill tone-${run.status === 'completed' ? 'success' : 'progress'}`}>
              {run.status.replace('_', ' ')}
            </span>
          </div>
          <p className="workspace-panel-copy mt-4">{run.summary}</p>
          <div className="automation-timeline mt-4">
            {run.steps.map((step) => (
              <div key={step.id} className="automation-timeline-item">
                <span className={`automation-timeline-dot tone-${step.tone}`} />
                <div>
                  <span>{step.time} · {step.actor}</span>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

function AutomationArtifactViewer({ artifacts }: { artifacts: AutomationArtifact[] }) {
  const selected = artifacts[0]

  return (
    <section className="automation-artifact-layout">
      <div className="automation-artifact-list">
        {artifacts.map((artifact) => (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ))}
      </div>
      {selected ? (
        <article className="content-panel automation-artifact-reader">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">{selected.type}</p>
              <h2 className="workspace-panel-title">{selected.title}</h2>
            </div>
            <span className={`workspace-status-pill tone-${selected.tone}`}>
              {selected.status.replace('_', ' ')}
            </span>
          </div>
          <p className="workspace-panel-copy mt-4">{selected.summary}</p>
          <div className="automation-document mt-4">
            {selected.contents.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  )
}

function AutomationReviewQueue({ items }: { items: AutomationReviewItem[] }) {
  return (
    <section className="automation-review-grid">
      {items.map((item) => (
        <article key={item.id} className="content-panel automation-review-card">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">{item.type.replace('_', ' ')}</p>
              <h2 className="workspace-panel-title">{item.title}</h2>
            </div>
            <span className={`workspace-status-pill tone-${item.tone}`}>{item.due}</span>
          </div>
          <p className="workspace-panel-copy mt-4">{item.context}</p>
          <div className="automation-decision-box mt-4">
            <strong>Decision needed</strong>
            <p>{item.decisionNeeded}</p>
          </div>
          <span className="workspace-meta-detail">Requested by {item.requestedBy}</span>
        </article>
      ))}
    </section>
  )
}

function AutomationAgentProfiles({ agents }: { agents: AutomationAgent[] }) {
  return (
    <section className="automation-profile-grid">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} profile />
      ))}
    </section>
  )
}

function WorkspaceActions({
  workspace,
  view,
}: {
  workspace: AutomationWorkspace
  view: AutomationViewId
}) {
  return (
    <>
      <a href={primaryHref(workspace, view)} className="primary-button no-underline">
        Continue
      </a>
      <a href={automationHref(workspace.clientSlug, 'dashboard')} className="secondary-button no-underline">
        Dashboard
      </a>
    </>
  )
}

function primaryHref(workspace: AutomationWorkspace, view: AutomationViewId) {
  switch (view) {
    case 'dashboard':
      return automationHref(workspace.clientSlug, 'reviewQueue')
    case 'agentBoard':
      return automationHref(workspace.clientSlug, 'taskLifecycle')
    case 'taskLifecycle':
      return automationHref(workspace.clientSlug, 'runTimeline')
    case 'runTimeline':
      return automationHref(workspace.clientSlug, 'artifacts')
    case 'artifacts':
      return automationHref(workspace.clientSlug, 'reviewQueue')
    case 'reviewQueue':
      return automationHref(workspace.clientSlug, 'agentProfiles')
    case 'agentProfiles':
      return automationHref(workspace.clientSlug, 'agentBoard')
  }
}

function AgentCard({ agent, profile = false }: { agent: AutomationAgent; profile?: boolean }) {
  return (
    <article className="content-panel automation-agent-card">
      <div className="workspace-panel-head">
        <div>
          <p className="eyebrow">{agent.workstream}</p>
          <h2 className="workspace-panel-title">{agent.name}</h2>
        </div>
        <span className={`workspace-status-pill tone-${agent.tone}`}>{agent.status}</span>
      </div>
      <p className="workspace-panel-copy mt-4">{agent.role}</p>
      <div className="automation-card-facts mt-4">
        <Fact label="Owner" value={agent.owner} />
        <Fact label="Capacity" value={agent.capacity} />
        <Fact label="Active task" value={agent.activeTask} />
      </div>
      <p className="automation-signal">{agent.lastSignal}</p>
      {profile ? (
        <>
          <ChipList label="Skills" items={agent.skills} />
          <ChipList label="Needs" items={agent.needs} />
        </>
      ) : null}
    </article>
  )
}

function TaskCard({ task }: { task: AutomationTask }) {
  const isAgentAssigned = Boolean(task.agent)

  return (
    <article className="automation-task-card">
      <span className="automation-task-id">{task.displayId}</span>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <footer className="automation-task-footer">
        <div className="automation-task-meta">
          {task.assignee !== 'Unassigned' ? (
            <AgentAvatar label={task.assignee} initials={task.assigneeInitials} agent={isAgentAssigned} />
          ) : null}
          <PriorityBadge priority={task.priority} />
          {isAgentAssigned ? <span className="automation-agent-badge">AI agent</span> : null}
        </div>
        {task.artifactCount ? (
          <span className="automation-artifact-count">{task.artifactCount}</span>
        ) : null}
      </footer>
      {task.blocker ? <span className="automation-task-blocker">Blocked input</span> : null}
    </article>
  )
}

function PriorityBadge({ priority }: { priority: AutomationTask['priority'] }) {
  if (priority === 'none') {
    return <span className="automation-priority-badge tone-none">No priority</span>
  }

  return <span className={`automation-priority-badge tone-${priority}`}>{priority}</span>
}

function AgentAvatar({
  label,
  initials,
  agent,
}: {
  label: string
  initials?: string
  agent?: boolean
}) {
  return (
    <span className={agent ? 'automation-avatar is-agent' : 'automation-avatar'} title={label}>
      {initials ?? label.slice(0, 2).toUpperCase()}
    </span>
  )
}

function ArtifactCard({ artifact }: { artifact: AutomationArtifact }) {
  return (
    <article className="content-panel automation-artifact-card">
      <div className="workspace-row-head">
        <strong>{artifact.title}</strong>
        <span className={`workspace-status-pill tone-${artifact.tone}`}>
          {artifact.status.replace('_', ' ')}
        </span>
      </div>
      <p>{artifact.summary}</p>
      <span className="workspace-meta-detail">{artifact.owner}</span>
    </article>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card automation-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="automation-chip-group">
      <span>{label}</span>
      <div>
        {items.map((item) => (
          <strong key={item}>{item}</strong>
        ))}
      </div>
    </div>
  )
}
