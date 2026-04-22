import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceActivity } from '../lib/workflow.functions'
import type { WorkspaceActivityItem, WorkspaceActivityView } from '../lib/workflow'

export const Route = createFileRoute('/workspace/$clientSlug/activity')({
  loader: ({ params }) =>
    getWorkspaceActivity({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceActivityPage,
})

function WorkspaceActivityPage() {
  const data = Route.useLoaderData()
  const latestActivity = data.activity[0]

  return (
    <WorkspaceShell
      section="activity"
      clientSlug={data.clientSlug}
      clientName={data.clientName}
      website={data.website}
      email={data.email}
      stageLabel={data.currentStage}
      stageDetail={data.currentStageDetail}
      primaryActionLabel={data.recommendedNextLabel}
      primaryActionDetail={data.recommendedNextDetail}
      statusChips={[
        {
          label: 'Visible updates',
          value: String(data.activity.length),
          tone: data.activity.length > 0 ? 'progress' : 'pending',
        },
        {
          label: 'Latest',
          value: latestActivity ? formatActivityTimestamp(latestActivity.timestamp) : 'Not available',
          tone: latestActivity ? 'neutral' : 'pending',
        },
      ]}
      action={
        <>
          <a href={workspaceHref(data.clientSlug, 'dashboard')} className="primary-button no-underline">
            Back to dashboard
          </a>
          <a href={workspaceDiagnosisHref(data.clientSlug)} className="secondary-button no-underline">
            Open diagnosis
          </a>
        </>
      }
    >
      <section className="workspace-board-canvas">
        <article className="content-panel workspace-board-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Activity</p>
              <h2 className="workspace-panel-title">Workspace progress history</h2>
            </div>
          </div>

          {data.activity.length === 0 ? (
            <WorkspaceActivityEmptyState data={data} />
          ) : (
            <div className="workspace-activity-feed mt-4">
              {data.activity.map((item) => (
                <WorkspaceActivityFeedItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </article>
      </section>
    </WorkspaceShell>
  )
}

function WorkspaceActivityFeedItem({ item }: { item: WorkspaceActivityItem }) {
  return (
    <article className="workspace-activity-feed-item">
      <div className="workspace-activity-marker" aria-hidden="true">
        <span />
      </div>
      <div className="workspace-activity-body">
        <div className="workspace-panel-head">
          <div>
            <span className="workspace-activity-time">{formatActivityTimestamp(item.timestamp)}</span>
            <h3 className="workspace-activity-title">{item.title}</h3>
          </div>
          {item.relatedEntityLabel ? (
            <span className="workspace-status-pill tone-neutral">{item.relatedEntityLabel}</span>
          ) : null}
        </div>
        <p>{item.description}</p>
        {item.ctaHref && item.ctaLabel ? (
          <a href={item.ctaHref} className="workspace-text-link">
            {item.ctaLabel}
          </a>
        ) : null}
      </div>
    </article>
  )
}

function WorkspaceActivityEmptyState({ data }: { data: WorkspaceActivityView }) {
  const isWaitingForPreaudit = data.preauditStatus.tone === 'pending'
  const hasWorkflowProgress = data.workflowStatus.some((item) => item.status.tone !== 'pending')

  if (isWaitingForPreaudit) {
    return (
      <div className="workspace-empty-state mt-4">
        <span className="workspace-empty-state-kicker">Waiting</span>
        <strong>Waiting for first preaudit</strong>
        <p>Activity will begin once the initial review is complete.</p>
        <p className="workspace-empty-next">
          The workspace is ready. The first client-safe update appears after preaudit completion.
        </p>
      </div>
    )
  }

  if (hasWorkflowProgress) {
    return (
      <div className="workspace-empty-state mt-4">
        <span className="workspace-empty-state-kicker">Quiet</span>
        <strong>Progress exists, but no feed-worthy updates yet</strong>
        <p>EBC is still working in the background.</p>
        <p className="workspace-empty-next">
          Updates will appear when there is a meaningful output, recommendation, or next-step change.
        </p>
      </div>
    )
  }

  return (
    <div className="workspace-empty-state mt-4">
      <span className="workspace-empty-state-kicker">No activity</span>
      <strong>No activity yet</strong>
      <p>Meaningful workspace updates will appear here as setup, diagnosis, and workstreams begin.</p>
      <p className="workspace-empty-next">Start with the preaudit to create the first visible update.</p>
    </div>
  )
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
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
