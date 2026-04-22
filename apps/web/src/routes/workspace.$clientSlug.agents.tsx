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
  const recommendedAgents = data.agents.filter((item) =>
    ['recommended', 'ready', 'active'].includes(item.status),
  )

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
        { label: 'Agents', value: String(data.agents.length), tone: 'neutral' },
        {
          label: 'Recommended',
          value: String(data.agents.filter((item) => ['recommended', 'ready', 'active'].includes(item.status)).length),
          tone: 'progress',
        },
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
      <section className="workspace-board-canvas">
        <article className="content-panel workspace-board-panel">
          <p className="eyebrow">Agents</p>
          <h2 className="workspace-panel-title">What systems are relevant here?</h2>
          {data.agents.length === 0 ? (
            <WorkspaceAgentsEmptyState
              title="No agents are available yet"
              detail="Agent recommendations appear after the diagnosis has enough context to identify useful execution modules."
              nextStep="Complete Business Context and run the audit first."
            />
          ) : recommendedAgents.length === 0 ? (
            <WorkspaceAgentsEmptyState
              title="No agents recommended yet"
              detail="The agent catalog is prepared, but recommendations should wait until the deeper audit clarifies the implementation path."
              nextStep="Use Diagnosis to complete Business Context and unlock audit-based recommendations."
            />
          ) : null}
          <div className="workspace-agent-gallery mt-4">
            {data.agents.map((agent) => (
              <article key={agent.slug} className="workspace-agent-gallery-card">
                <div className={`workspace-card-status-bar tone-${agent.tone}`} />
                <div className="workspace-panel-head">
                  <div>
                    <span className="workspace-card-kicker">{agent.linkedWorkstream}</span>
                    <h3 className="workspace-board-title">{agent.label}</h3>
                  </div>
                  <span className={`workspace-status-pill tone-${agent.tone}`}>{agent.status}</span>
                </div>
                <p className="workspace-panel-copy mt-4">{agent.role}</p>
                <div className="workspace-list-grid mt-4">
                  <div className="workspace-module-row">
                    <strong>Relevance</strong>
                    <p>{agent.currentRelevance}</p>
                  </div>
                  <div className="workspace-module-row">
                    <strong>Required inputs</strong>
                    <p>{agent.requiredInputs.join(', ')}</p>
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

function WorkspaceAgentsEmptyState({
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
      <span className="workspace-empty-state-kicker">Recommendation pending</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      <p className="workspace-empty-next">{nextStep}</p>
    </div>
  )
}
