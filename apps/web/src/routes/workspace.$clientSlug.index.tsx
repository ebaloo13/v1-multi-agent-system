import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceOverview } from '../lib/workflow.functions'
import type {
  WorkspaceActivityItem,
  WorkspaceDashboardView,
  WorkspaceImpactItem,
} from '../lib/workflow'

export const Route = createFileRoute('/workspace/$clientSlug/')({
  loader: ({ params }) =>
    getWorkspaceOverview({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  const data = Route.useLoaderData()
  const activeWorkstreams = data.workstreams.filter((item) =>
    ['ready for design', 'active', 'complete'].includes(item.status),
  )
  const hasGeneratedOutputs = data.artifacts.some((artifact) => artifact.tone !== 'pending')
  const topImpact = data.impact.slice(0, 3)
  const latestActivity = data.activity.slice(0, 3)

  return (
    <WorkspaceShell
      section="dashboard"
      clientSlug={data.clientSlug}
      clientName={data.clientName}
      website={data.website}
      email={data.email}
      stageLabel={data.currentStage}
      stageDetail={data.currentStageDetail}
      primaryActionLabel={data.recommendedNextLabel}
      primaryActionDetail={data.recommendedNextDetail}
      statusChips={[
        { label: 'Stage', value: data.currentStage, tone: 'progress' },
        { label: 'Workstreams', value: String(data.workstreams.length), tone: 'neutral' },
      ]}
      action={
        <>
          <a
            href={
              data.recommendedNextSection === 'diagnosis'
                ? workspaceDiagnosisHref(data.clientSlug, data.auditStatus.label === 'Completed' ? 'audit' : 'overview')
                : workspaceHref(data.clientSlug, data.recommendedNextSection)
            }
            className="primary-button no-underline"
          >
            {data.recommendedNextLabel}
          </a>
          <a
            href={workspaceHref(data.clientSlug, 'workstreams')}
            className="secondary-button no-underline"
          >
            Open workstreams
          </a>
        </>
      }
    >
      <section className="workspace-dashboard-control-grid">
        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Workflow</p>
              <h2 className="workspace-panel-title">Where we are</h2>
            </div>
          </div>

          <div className="workspace-pipeline-grid mt-4">
            {data.workflowStatus.map((item) => (
              <article key={item.label} className={`workspace-pipeline-card tone-${item.status.tone}`}>
                <div className="workspace-pipeline-head">
                  <span className="workspace-pipeline-label">{item.label}</span>
                  <span className={`workspace-status-pill tone-${item.status.tone}`}>
                    {item.status.label}
                  </span>
                </div>
                <p className="workspace-pipeline-detail">{item.status.detail}</p>
              </article>
            ))}
          </div>
          {data.preauditStatus.tone === 'pending' ? (
            <WorkspaceDashboardEmptyState
              title="Preaudit has not run yet"
              detail="The workspace is ready, but the first diagnostic output is still missing."
              nextStep="Run the preaudit so EBC can create the first findings and prepare Business Context."
            />
          ) : null}
        </article>

        <article className="content-panel">
          <p className="eyebrow">Next action</p>
          <h2 className="workspace-panel-title">{data.recommendedNextLabel}</h2>
          <div className="workspace-status-row mt-4">
            <div>
              <p>{data.recommendedNextDetail}</p>
            </div>
            <span className="workspace-status-pill tone-progress">{data.currentStage}</span>
          </div>

          <div className="workspace-command-actions mt-4">
            <a
              href={
                data.recommendedNextSection === 'diagnosis'
                  ? workspaceDiagnosisHref(data.clientSlug)
                  : workspaceHref(data.clientSlug, data.recommendedNextSection)
              }
              className="primary-button no-underline"
            >
              Continue
            </a>
          </div>
        </article>
      </section>

      <section className="workspace-dashboard-board-grid">
        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Workstreams</p>
              <h2 className="workspace-panel-title">Current areas of work</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'workstreams')} className="workspace-text-link">
              Open workstreams
            </a>
          </div>

          <div className="workspace-workstream-grid mt-4">
            {activeWorkstreams.length === 0 ? (
              <WorkspaceDashboardEmptyState
                title="No workstreams are active yet"
                detail="Workstreams become useful after the preaudit and Business Context create enough signal to define focused tracks."
                nextStep="Continue through Diagnosis first. Workstreams will move from identified to ready once the audit is available."
              />
            ) : null}
            {data.workstreams.map((item) => (
              <div key={item.title} className="workspace-workstream-card">
                <div className="workspace-row-head">
                  <strong>{item.title}</strong>
                  <span className={`workspace-status-pill tone-${item.tone}`}>{item.status}</span>
                </div>
                <span>{item.suggestedNextStep}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Impact</p>
              <h2 className="workspace-panel-title">Business value</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'impact')} className="workspace-text-link">
              View impact
            </a>
          </div>

          <div className="workspace-impact-preview-list mt-4">
            {topImpact.length === 0 ? (
              <WorkspaceImpactEmptyState data={data} />
            ) : (
              topImpact.map((item) => <WorkspaceImpactPreviewItem key={item.id} item={item} />)
            )}
          </div>
        </article>

        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Outputs</p>
              <h2 className="workspace-panel-title">Latest Outputs</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'diagnosis')} className="workspace-text-link">
              Open diagnosis
            </a>
          </div>

          <div className="workspace-list-grid mt-4">
            {!hasGeneratedOutputs ? (
              <WorkspaceDashboardEmptyState
                title="No outputs are available yet"
                detail="Preaudit, Business Context, and audit outputs will appear here as the diagnosis flow progresses."
                nextStep="Start with the preaudit, then complete Business Context before running the full audit."
              />
            ) : null}
            {data.artifacts.map((artifact) => (
              <div key={artifact.label} className="workspace-artifact-row">
                <div>
                  <strong>{artifact.label}</strong>
                  <p>{artifact.detail}</p>
                </div>
                <span className={`workspace-status-pill tone-${artifact.tone}`}>{artifact.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Activity</p>
              <h2 className="workspace-panel-title">Recent activity</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'activity')} className="workspace-text-link">
              View all
            </a>
          </div>

          <div className="workspace-activity-preview-list mt-4">
            {latestActivity.length === 0 ? (
              <WorkspaceActivityEmptyState data={data} />
            ) : (
              latestActivity.map((item) => (
                <WorkspaceActivityPreviewItem key={item.id} item={item} />
              ))
            )}
          </div>
        </article>
      </section>
    </WorkspaceShell>
  )
}

function WorkspaceImpactPreviewItem({ item }: { item: WorkspaceImpactItem }) {
  return (
    <div className={`workspace-impact-preview-row state-${item.impactState}`}>
      <span className="workspace-impact-state">{impactStateLabel(item.impactState)}</span>
      <div>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
      </div>
    </div>
  )
}

function WorkspaceImpactEmptyState({ data }: { data: WorkspaceDashboardView }) {
  if (data.preauditStatus.tone === 'pending') {
    return (
      <WorkspaceDashboardEmptyState
        title="Impact is waiting on diagnosis"
        detail="The workspace needs the first diagnostic before value themes can be framed responsibly."
        nextStep="Run the preaudit to identify the first business impact signals."
      />
    )
  }

  return (
    <WorkspaceDashboardEmptyState
      title="Not enough impact evidence yet"
      detail="Impact will appear here when diagnosis, outputs, or workstreams create client-safe value signals."
      nextStep="Continue through Diagnosis so value can be identified without inventing metrics."
    />
  )
}

function WorkspaceActivityPreviewItem({ item }: { item: WorkspaceActivityItem }) {
  return (
    <div className="workspace-activity-preview-row">
      <div className="workspace-activity-dot" aria-hidden="true" />
      <div>
        <div className="workspace-row-head">
          <strong>{item.title}</strong>
          <span>{formatActivityTimestamp(item.timestamp)}</span>
        </div>
        <p>{item.description}</p>
      </div>
    </div>
  )
}

function WorkspaceActivityEmptyState({ data }: { data: WorkspaceDashboardView }) {
  const isWaitingForPreaudit = data.preauditStatus.tone === 'pending'
  const hasWorkflowProgress = data.workflowStatus.some((item) => item.status.tone !== 'pending')

  if (isWaitingForPreaudit) {
    return (
      <WorkspaceDashboardEmptyState
        title="Waiting for first preaudit"
        detail="Activity will begin once the initial review is complete."
        nextStep="Run the preaudit so meaningful workspace updates can appear here."
      />
    )
  }

  if (hasWorkflowProgress) {
    return (
      <WorkspaceDashboardEmptyState
        title="No recent visible updates"
        detail="Progress exists, but there are no meaningful client updates to show yet."
        nextStep="Updates will appear when there is a meaningful output, recommendation, or next-step change."
      />
    )
  }

  return (
    <WorkspaceDashboardEmptyState
      title="No activity yet"
      detail="Meaningful workspace updates will appear here as setup, diagnosis, and workstreams begin."
      nextStep="Start with the preaudit to create the first visible client update."
    />
  )
}

function impactStateLabel(state: WorkspaceImpactItem['impactState']) {
  switch (state) {
    case 'identified':
      return 'Identified'
    case 'unlocking':
      return 'Unlocking'
    case 'observed':
      return 'Observed'
    case 'needs_attention':
      return 'Needs attention'
  }
}

function formatActivityTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.valueOf())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function WorkspaceDashboardEmptyState({
  title,
  detail,
  nextStep,
}: {
  title: string
  detail: string
  nextStep: string
}) {
  return (
    <div className="workspace-empty-state mt-4">
      <span className="workspace-empty-state-kicker">Next step</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      <p className="workspace-empty-next">{nextStep}</p>
    </div>
  )
}
