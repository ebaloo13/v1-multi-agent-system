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
          label: 'Ready or active',
          value: String(data.workstreams.filter((item) => ['ready for design', 'active'].includes(item.status)).length),
          tone: 'progress',
        },
        { label: 'Recommended agents', value: String(data.agents.filter((item) => item.status !== 'not relevant').length), tone: 'neutral' },
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
      <section className="workspace-v2-grid">
        <article className="content-panel">
          <p className="eyebrow">Workstream board</p>
          <h2 className="workspace-panel-title">Operational tracks derived from the diagnosis</h2>
          <div className="workspace-workstream-board mt-4">
            {data.workstreams.map((item) => (
              <article key={item.title} className="workspace-workstream-board-card">
                <div className="workspace-panel-head">
                  <div>
                    <span className={`workspace-status-pill tone-${item.tone}`}>{item.status}</span>
                    <h3 className="workspace-board-title">{item.title}</h3>
                  </div>
                  <span className="workspace-muted-tag">{item.linkedSource}</span>
                </div>
                <p className="workspace-panel-copy mt-4">{item.whyItMatters}</p>
                <div className="workspace-list-grid mt-4">
                  <div className="workspace-module-row">
                    <strong>Next step</strong>
                    <p>{item.suggestedNextStep}</p>
                  </div>
                  <div className="workspace-module-row">
                    <strong>Suggested agent</strong>
                    <p>{item.suggestedAgent ?? 'Not assigned yet'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-v2-grid">
        <article className="content-panel">
          <p className="eyebrow">Latest linked outputs</p>
          <h2 className="workspace-panel-title">Artifacts feeding this board</h2>
          <div className="workspace-list-grid mt-4">
            {data.latestOutputs.map((item) => (
              <div key={item.label} className="workspace-artifact-row">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className={`workspace-status-pill tone-${item.tone}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </WorkspaceShell>
  )
}
