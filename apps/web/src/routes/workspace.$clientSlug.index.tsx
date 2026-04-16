import { createFileRoute } from '@tanstack/react-router'
import WorkspaceShell from '../components/WorkspaceShell'
import { workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { getWorkspaceOverview } from '../lib/workflow.functions'

export const Route = createFileRoute('/workspace/$clientSlug/')({
  loader: ({ params }) =>
    getWorkspaceOverview({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceDashboardPage,
})

function WorkspaceDashboardPage() {
  const data = Route.useLoaderData()

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
        { label: 'Preaudit', value: data.preauditStatus.label, tone: data.preauditStatus.tone },
        { label: 'Intake', value: data.intakeStatus.label, tone: data.intakeStatus.tone },
        { label: 'Audit', value: data.auditStatus.label, tone: data.auditStatus.tone },
        { label: 'Active workstreams', value: String(data.workstreams.length), tone: 'neutral' },
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
      <section className="workspace-v2-grid workspace-v2-grid-wide">
        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Transformation pipeline</p>
              <h2 className="workspace-panel-title">Current workflow status</h2>
            </div>
            <span className="workspace-muted-tag">Live workflow state</span>
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
                <p className="workspace-pipeline-copy">{item.detail}</p>
                <p className="workspace-pipeline-detail">{item.status.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Primary next action</p>
          <h2 className="workspace-panel-title">What should happen now</h2>
          <div className="workspace-status-row mt-4">
            <div>
              <strong>{data.recommendedNextLabel}</strong>
              <p>{data.recommendedNextDetail}</p>
            </div>
            <span className="workspace-status-pill tone-progress">{data.currentStage}</span>
          </div>

          <div className="workspace-list-grid mt-4">
            {data.accountReadiness.map((item) => (
              <div key={item.label} className="workspace-module-row">
                <strong>{item.label}</strong>
                <p>
                  {item.value}
                  {' · '}
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-v2-grid">
        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Active workstreams</p>
              <h2 className="workspace-panel-title">Where the transformation is focused</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'workstreams')} className="workspace-text-link">
              Open workstreams
            </a>
          </div>

          <div className="workspace-workstream-grid mt-4">
            {data.workstreams.map((item) => (
              <div key={item.title} className="workspace-workstream-card">
                <span className={`workspace-status-pill tone-${item.tone}`}>{item.status}</span>
                <strong>{item.title}</strong>
                <span>{item.whyItMatters}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Agent readiness</p>
              <h2 className="workspace-panel-title">Which specialist modules matter</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'agents')} className="workspace-text-link">
              Open agents
            </a>
          </div>

          <div className="workspace-agent-stack mt-4">
            {data.agents.map((agent) => (
              <div key={agent.slug} className="workspace-agent-list-row">
                <div>
                  <strong>{agent.label}</strong>
                  <p>{agent.currentRelevance}</p>
                </div>
                <span className={`workspace-status-pill tone-${agent.tone}`}>{agent.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-v2-grid">
        <article className="content-panel">
          <p className="eyebrow">Leaks vs gains</p>
          <h2 className="workspace-panel-title">Business framing</h2>
          <div className="workspace-list-grid mt-4">
            {data.efficiencySignals.map((item) => (
              <div key={item.title} className="workspace-signal-row">
                <span className={`workspace-signal-badge ${item.label === 'Leak' ? 'is-leak' : 'is-gain'}`}>
                  {item.label}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Client context</p>
          <h2 className="workspace-panel-title">Account facts</h2>
          <div className="workspace-list-grid mt-4">
            {data.keyFacts.map((fact) => (
              <div key={fact.label} className="workspace-mini-record">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="workspace-v2-grid">
        <article className="content-panel">
          <div className="workspace-panel-head">
            <div>
              <p className="eyebrow">Artifacts and outputs</p>
              <h2 className="workspace-panel-title">What already exists</h2>
            </div>
            <a href={workspaceHref(data.clientSlug, 'diagnosis')} className="workspace-text-link">
              Open diagnosis
            </a>
          </div>

          <div className="workspace-list-grid mt-4">
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
      </section>
    </WorkspaceShell>
  )
}
