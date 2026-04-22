import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceWorkstreams } from '../lib/workflow.functions'

export const Route = createFileRoute('/workspace/$clientSlug/workstreams')({
  loader: ({ params }) =>
    getWorkspaceWorkstreams({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceWorkstreamsPage,
})

function WorkspaceWorkstreamsPage() {
  const data = Route.useLoaderData()

  return (
    <WorkspaceShell
      section="workstreams"
      clientSlug={data.clientSlug}
      clientName={data.clientName}
      website={data.website}
      email={data.email}
      stageLabel={data.currentStage}
      stageDetail={data.currentStageDetail}
      primaryActionLabel={data.recommendedNextLabel}
      primaryActionDetail={data.recommendedNextDetail}
      statusChips={[
        { label: 'Workstreams', value: String(data.workstreams.length), tone: 'neutral' },
        {
          label: 'Ready',
          value: String(data.workstreams.filter((item) => ['ready for design', 'active'].includes(item.status)).length),
          tone: 'progress',
        },
      ]}
      action={
        <>
          <a href={workspaceHref(data.clientSlug, 'agents')} className="primary-button no-underline">
            Open agents
          </a>
          <a
            href={workspaceDiagnosisHref(data.clientSlug, 'audit')}
            className="secondary-button no-underline"
          >
            Review diagnosis
          </a>
        </>
      }
    >
      <section className="workspace-board-canvas">
        <article className="content-panel workspace-board-panel">
          <p className="eyebrow">Workstreams</p>
          <h2 className="workspace-panel-title">What are we actively working on?</h2>
          <div className="workspace-workstream-board mt-4">
            {data.workstreams.map((item) => (
              <article key={item.title} className="workspace-workstream-board-card">
                <div className={`workspace-card-status-bar tone-${item.tone}`} />
                <div className="workspace-panel-head">
                  <div>
                    <span className="workspace-card-kicker">{item.linkedSource}</span>
                    <h3 className="workspace-board-title">{item.title}</h3>
                  </div>
                  <span className={`workspace-status-pill tone-${item.tone}`}>{item.status}</span>
                </div>
                <p className="workspace-panel-copy mt-4">{item.whyItMatters}</p>
                <div className="workspace-list-grid mt-4">
                  <div className="workspace-module-row">
                    <strong>Next step</strong>
                    <p>{item.suggestedNextStep}</p>
                  </div>
                  <div className="workspace-module-row">
                    <strong>Agent</strong>
                    <p>{item.suggestedAgent ?? 'Not assigned yet'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </WorkspaceShell>
  )
}
