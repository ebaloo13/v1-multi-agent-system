import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceImpact } from '../lib/workflow.functions'
import type { WorkspaceImpactItem, WorkspaceImpactState, WorkspaceImpactView } from '../lib/workflow'

export const Route = createFileRoute('/workspace/$clientSlug/impact')({
  loader: ({ params }) =>
    getWorkspaceImpact({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceImpactPage,
})

function WorkspaceImpactPage() {
  const data = Route.useLoaderData()
  const identified = impactByState(data.impact, 'identified')
  const unlocking = impactByState(data.impact, 'unlocking')
  const observed = impactByState(data.impact, 'observed')
  const needsAttention = impactByState(data.impact, 'needs_attention')

  return (
    <WorkspaceShell
      section="impact"
      clientSlug={data.clientSlug}
      clientName={data.clientName}
      website={data.website}
      email={data.email}
      stageLabel={data.currentStage}
      stageDetail={data.currentStageDetail}
      primaryActionLabel={data.recommendedNextLabel}
      primaryActionDetail={data.recommendedNextDetail}
      statusChips={[
        { label: 'Evidence:', value: 'Qualitative', tone: 'neutral' },
        {
          label: 'Observed change:',
          value: observed.length > 0 ? 'Available' : 'Not measured yet',
          tone: observed.length > 0 ? 'success' : 'pending',
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
      <section className="content-panel">
        <div className="workspace-panel-head">
          <div>
            <p className="eyebrow">Impact</p>
            <h2 className="workspace-panel-title">Business value view</h2>
          </div>
        </div>
        <p className="workspace-panel-copy">
          Impact summarizes value signals from diagnosis, outputs, workstreams, and agent
          readiness. It does not report measured ROI until there is reliable evidence.
        </p>
      </section>

      <section className="workspace-impact-section-grid">
        <WorkspaceImpactGroup
          title="Value identified"
          detail="Business value that has been surfaced by diagnosis or audit evidence."
          emptyTitle="No impact signals identified yet"
          emptyDetail="The first impact themes appear after EBC has enough diagnosis evidence to describe value responsibly."
          items={identified}
          data={data}
        />

        <WorkspaceImpactGroup
          title="Value being unlocked"
          detail="Workstreams, outputs, or agent recommendations that are turning diagnosis into action."
          emptyTitle="Implementation has not started yet"
          emptyDetail="Value moves into this section once outputs, workstreams, or agents are ready to support execution."
          items={unlocking}
          data={data}
        />

        <WorkspaceImpactGroup
          title="Observed value"
          detail="Measured or directly observed change, shown only when the workspace has credible evidence."
          emptyTitle="Not enough evidence yet to show observed change"
          emptyDetail="Impact will not invent analytics or ROI. Observed value appears here only after there is trustworthy evidence."
          items={observed}
          data={data}
          subdued={observed.length === 0}
        />

        <WorkspaceImpactGroup
          title="Needs attention"
          detail="Client-safe blockers or readiness gaps that still limit value."
          emptyTitle="No current value blockers"
          emptyDetail="When there is nothing client-relevant blocking progress, this section stays quiet."
          items={needsAttention}
          data={data}
        />
      </section>
    </WorkspaceShell>
  )
}

function WorkspaceImpactGroup({
  title,
  detail,
  emptyTitle,
  emptyDetail,
  items,
  data,
  subdued = false,
}: {
  title: string
  detail: string
  emptyTitle: string
  emptyDetail: string
  items: WorkspaceImpactItem[]
  data: WorkspaceImpactView
  subdued?: boolean
}) {
  return (
    <article className={subdued ? 'content-panel workspace-impact-group is-subdued' : 'content-panel workspace-impact-group'}>
      <div className="workspace-panel-head">
        <div>
          <p className="eyebrow">Impact state</p>
          <h2 className="workspace-panel-title">{title}</h2>
        </div>
      </div>
      <p className="workspace-panel-copy">{detail}</p>

      <div className="workspace-impact-card-grid mt-4">
        {items.length === 0 ? (
          <WorkspaceImpactEmptyState title={emptyTitle} detail={emptyDetail} data={data} />
        ) : (
          items.map((item) => <WorkspaceImpactCard key={item.id} item={item} />)
        )}
      </div>
    </article>
  )
}

function WorkspaceImpactCard({ item }: { item: WorkspaceImpactItem }) {
  return (
    <article className={`workspace-impact-card state-${item.impactState}`}>
      <div className="workspace-panel-head">
        <span className="workspace-impact-state">{impactStateLabel(item.impactState)}</span>
        {item.relatedEntityLabel ? (
          <span className="workspace-status-pill tone-neutral">{item.relatedEntityLabel}</span>
        ) : null}
      </div>
      <h3 className="workspace-impact-title">{item.title}</h3>
      <p>{item.description}</p>
      {item.ctaHref && item.ctaLabel ? (
        <a href={item.ctaHref} className="workspace-text-link">
          {item.ctaLabel}
        </a>
      ) : null}
    </article>
  )
}

function WorkspaceImpactEmptyState({
  title,
  detail,
  data,
}: {
  title: string
  detail: string
  data: WorkspaceImpactView
}) {
  const isWaitingForPreaudit = data.preauditStatus.tone === 'pending'

  return (
    <div className="workspace-empty-state">
      <span className="workspace-empty-state-kicker">
        {isWaitingForPreaudit ? 'Diagnosis needed' : 'Evidence pending'}
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function impactByState(items: WorkspaceImpactItem[], state: WorkspaceImpactState) {
  return items.filter((item) => item.impactState === state)
}

function impactStateLabel(state: WorkspaceImpactState) {
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
