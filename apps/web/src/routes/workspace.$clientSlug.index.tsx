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
              <p className="eyebrow">Outputs</p>
              <h2 className="workspace-panel-title">Latest files</h2>
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
