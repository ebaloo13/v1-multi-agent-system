import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref, type WorkspaceRouteScope } from '../lib/product-shell'
import { getWorkspaceAgents } from '../lib/workflow.functions'
import type { WorkspaceAgent } from '../lib/workflow'

export const Route = createFileRoute('/workspace/$clientSlug/agents')({
  loader: ({ params }) =>
    getWorkspaceAgents({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceAgentsPage,
})

function WorkspaceAgentsPage() {
  const data = Route.useLoaderData()

  return <WorkspaceAgentsView data={data} />
}

export type WorkspaceAgentsData = ReturnType<typeof Route.useLoaderData>

export function WorkspaceAgentsView({
  data,
  routeScope = 'workspace',
}: {
  data: WorkspaceAgentsData
  routeScope?: WorkspaceRouteScope
}) {
  const activeAgents = data.agents.filter((item) => item.status === 'active')
  const recommendedAgents = data.agents.filter((item) => ['recommended', 'ready'].includes(item.status))
  const creatableAgents = data.agents.filter((item) => item.status !== 'active' && item.status !== 'not relevant')

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
        { label: 'Active', value: String(activeAgents.length), tone: activeAgents.length > 0 ? 'success' : 'neutral' },
        {
          label: 'Recommended',
          value: String(recommendedAgents.length),
          tone: recommendedAgents.length > 0 ? 'progress' : 'neutral',
        },
        {
          label: 'Available',
          value: String(creatableAgents.length),
          tone: creatableAgents.length > 0 ? 'neutral' : 'pending',
        },
      ]}
      action={
        <>
          <a href="#agent-creation" className="primary-button no-underline">
            Create agent
          </a>
          <a href={workspaceHref(data.clientSlug, 'workstreams', routeScope)} className="secondary-button no-underline">
            Open workstreams
          </a>
        </>
      }
      routeScope={routeScope}
    >
      <section className="workspace-section-grid">
        <section className="workspace-agent-management-grid">
          <div className="workspace-agent-summary-tile">
            <span>Active</span>
            <strong>{activeAgents.length}</strong>
          </div>
          <div className="workspace-agent-summary-tile">
            <span>Recommended</span>
            <strong>{recommendedAgents.length}</strong>
          </div>
          <div className="workspace-agent-summary-tile">
            <span>Available</span>
            <strong>{creatableAgents.length}</strong>
          </div>
        </section>

        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Recommended agents</p>
              <h2 className="workspace-panel-title">Set up next</h2>
            </div>
          </div>

          {recommendedAgents.length === 0 ? (
            <div className="workspace-module-row mt-4">
              <strong>No agents recommended yet</strong>
              <p>Complete diagnosis to unlock agent recommendations.</p>
            </div>
          ) : (
            <div className="workspace-agent-management-grid mt-4">
              {recommendedAgents.map((agent) => (
                <AgentManagementCard
                  key={agent.slug}
                  agent={agent}
                  clientSlug={data.clientSlug}
                  mode="recommended"
                  routeScope={routeScope}
                />
              ))}
            </div>
          )}
        </article>

        <article id="agent-creation" className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Create agent</p>
              <h2 className="workspace-panel-title">Choose next</h2>
            </div>
          </div>

          {creatableAgents.length === 0 ? (
            <div className="workspace-module-row mt-4">
              <strong>No agent types ready</strong>
              <p>Relevant agent types appear after diagnosis has enough context.</p>
            </div>
          ) : (
            <div className="workspace-agent-choice-list mt-4">
              {creatableAgents.map((agent) => (
                <a
                  key={agent.slug}
                  href={agentPrimaryHref(agent, data.clientSlug, routeScope)}
                  className="workspace-agent-choice-button no-underline"
                >
                  <div>
                    <strong>{agent.label}</strong>
                    <p>{compactAgentSummary(agent)}</p>
                  </div>
                  <span className={`workspace-status-pill tone-${agent.tone}`}>{agent.status}</span>
                </a>
              ))}
            </div>
          )}

        </article>
      </section>
    </WorkspaceShell>
  )
}

function AgentManagementCard({
  agent,
  clientSlug,
  mode,
  routeScope = 'workspace',
}: {
  agent: WorkspaceAgent
  clientSlug: string
  mode: 'active' | 'recommended'
  routeScope?: WorkspaceRouteScope
}) {
  return (
    <article className="workspace-agent-management-card">
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
          <strong>{mode === 'active' ? 'Current focus' : 'Next step'}</strong>
          <p>{mode === 'active' ? compactAgentSummary(agent) : agent.readiness.summary}</p>
        </div>
      </div>

      <div className="workspace-command-actions mt-4">
        <a href={agentPrimaryHref(agent, clientSlug, routeScope)} className="workspace-text-link">
          {mode === 'active' ? 'View details' : agentPrimaryLabel(agent)}
        </a>
      </div>
    </article>
  )
}

function compactAgentSummary(agent: WorkspaceAgent) {
  switch (agent.status) {
    case 'active':
      return agent.potentialOutput
    case 'ready':
      return 'This agent is ready to move into setup for the current client need.'
    case 'recommended':
      return 'This is one of the strongest next agents to set up from the current diagnosis.'
    case 'candidate':
      return 'This agent is available, but should follow a clearer implementation need.'
    case 'setup needed':
      return 'This agent should wait until more diagnosis context is available.'
    default:
      return agent.currentRelevance
  }
}

function agentPrimaryLabel(agent: WorkspaceAgent) {
  switch (agent.status) {
    case 'active':
      return 'View details'
    case 'ready':
      return `Create ${agent.label}`
    case 'recommended':
      return `Create ${agent.label}`
    case 'candidate':
      return `Create ${agent.label}`
    case 'setup needed':
      return 'Prepare setup'
    default:
      return 'Review'
  }
}

function agentPrimaryHref(
  agent: WorkspaceAgent,
  clientSlug?: string,
  routeScope: WorkspaceRouteScope = 'workspace',
) {
  if (agent.readiness.ctaHref) {
    return agent.readiness.ctaHref
  }

  if (clientSlug && ['setup needed', 'candidate'].includes(agent.status)) {
    return workspaceDiagnosisHref(clientSlug, 'overview', routeScope)
  }

  return workspaceHref(clientSlug ?? 'generic-client', 'workstreams', routeScope)
}
