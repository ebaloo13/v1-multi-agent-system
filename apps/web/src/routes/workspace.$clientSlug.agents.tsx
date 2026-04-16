import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceAgents } from '../lib/workflow.functions'

export const Route = createFileRoute('/workspace/$clientSlug/agents')({
  loader: ({ params }) =>
    getWorkspaceAgents({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceAgentsPage,
})

function WorkspaceAgentsPage() {
  const data = Route.useLoaderData()

  return (
    <WorkspaceShell
      section="agents"
      clientSlug={data.clientSlug}
      clientName={data.clientName}
      website={data.website}
      email={data.email}
      stageLabel={data.currentStage}
      stageDetail={data.currentStageDetail}
      primaryActionLabel={data.recommendedNextLabel}
      primaryActionDetail={data.recommendedNextDetail}
      statusChips={[
        { label: 'Agent cards', value: String(data.agents.length), tone: 'neutral' },
        {
          label: 'Recommended',
          value: String(data.agents.filter((item) => ['recommended', 'ready', 'active'].includes(item.status)).length),
          tone: 'progress',
        },
        { label: 'Candidate', value: String(data.agents.filter((item) => item.status === 'candidate').length), tone: 'neutral' },
      ]}
      action={
        <>
          <a href={workspaceHref(data.clientSlug, 'workstreams')} className="primary-button no-underline">
            Open workstreams
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
          <p className="eyebrow">Agent architecture</p>
          <h2 className="workspace-panel-title">Specialized execution modules for this client</h2>
          <div className="workspace-agent-gallery mt-4">
            {data.agents.map((agent) => (
              <article key={agent.slug} className="workspace-agent-gallery-card">
                <div className="workspace-panel-head">
                  <div>
                    <span className={`workspace-status-pill tone-${agent.tone}`}>{agent.status}</span>
                    <h3 className="workspace-board-title">{agent.label}</h3>
                  </div>
                  <span className="workspace-muted-tag">{agent.linkedWorkstream}</span>
                </div>
                <p className="workspace-panel-copy mt-4">{agent.role}</p>
                <div className="workspace-list-grid mt-4">
                  <div className="workspace-module-row">
                    <strong>Current relevance</strong>
                    <p>{agent.currentRelevance}</p>
                  </div>
                  <div className="workspace-module-row">
                    <strong>Required inputs</strong>
                    <p>{agent.requiredInputs.join(', ')}</p>
                  </div>
                  <div className="workspace-module-row">
                    <strong>Potential output</strong>
                    <p>{agent.potentialOutput}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-v2-grid">
        <article className="content-panel">
          <p className="eyebrow">Linked outputs</p>
          <h2 className="workspace-panel-title">Signals that inform the current agent stack</h2>
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
