import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import WorkspaceShell from '../components/WorkspaceShell'
import { intakeSections, workspaceDiagnosisHref, workspaceHref } from '../lib/product-shell'
import { saveAndRunAudit, getWorkspaceDiagnosis } from '../lib/workflow.functions'
import { messageFromError } from '../lib/workflow'

function validateDiagnosisSearch(search: Record<string, unknown>) {
  const panel = typeof search.panel === 'string' ? search.panel : 'overview'

  return {
    panel:
      panel === 'preaudit' || panel === 'intake' || panel === 'audit' || panel === 'overview'
        ? panel
        : 'overview',
  } as const
}

export const Route = createFileRoute('/workspace/$clientSlug/diagnosis')({
  validateSearch: validateDiagnosisSearch,
  loader: ({ params }) =>
    getWorkspaceDiagnosis({
      data: { clientSlug: params.clientSlug },
    }),
  component: WorkspaceDiagnosisPage,
})

function WorkspaceDiagnosisPage() {
  const navigate = useNavigate()
  const runAudit = useServerFn(saveAndRunAudit)
  const data = Route.useLoaderData()
  const { panel } = Route.useSearch()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const sectionProgress = data.intake
    ? intakeSections.map((section) => {
        const completed = section.fields.filter((field) => data.intake!.form[field.key].trim().length > 0).length
        const total = section.fields.length

        return {
          ...section,
          completed,
          total,
          status: completed === total ? 'Ready' : completed > 0 ? 'In progress' : 'Needs input',
          tone: completed === total ? 'success' : completed > 0 ? 'progress' : 'pending',
        }
      })
    : []
  const totalFields = sectionProgress.reduce((sum, section) => sum + section.total, 0)
  const completedFields = sectionProgress.reduce((sum, section) => sum + section.completed, 0)
  const completionRate =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await runAudit({ data: formData })

      navigate({
        to: '/workspace/$clientSlug/diagnosis',
        params: {
          clientSlug: result.clientSlug,
        },
        search: {
          panel: 'audit',
        },
      })
    } catch (error) {
      setErrorMessage(messageFromError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <WorkspaceShell
      section="diagnosis"
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
        { label: 'Audit', value: data.auditStatus.label, tone: data.auditStatus.tone },
      ]}
      action={
        <>
          <a href={workspaceHref(data.clientSlug, 'workstreams')} className="primary-button no-underline">
            Open workstreams
          </a>
          <a href={workspaceHref(data.clientSlug, 'dashboard')} className="secondary-button no-underline">
            Back to dashboard
          </a>
        </>
      }
    >
      <section className="content-panel">
        <div className="workspace-panel-head">
          <div>
            <p className="eyebrow">Diagnosis</p>
            <h2 className="workspace-panel-title">What did we find?</h2>
          </div>
        </div>

        <div className="workspace-segmented-nav mt-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'preaudit', label: 'Preaudit' },
            { id: 'intake', label: 'Intake' },
            { id: 'audit', label: 'Audit' },
          ].map((item) => (
            <a
              key={item.id}
              href={workspaceDiagnosisHref(data.clientSlug, item.id as 'overview' | 'preaudit' | 'intake' | 'audit')}
              className={panel === item.id ? 'workspace-segmented-link is-active' : 'workspace-segmented-link'}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="workspace-status-strip mt-4">
          {data.workflowStatus.map((item) => (
            <div key={item.label} className="workspace-mini-record">
              <span>{item.label}</span>
              <span className={`workspace-status-pill tone-${item.status.tone}`}>{item.status.label}</span>
            </div>
          ))}
        </div>
      </section>

      {panel === 'overview' ? (
        <section className="workspace-diagnosis-overview-grid">
          <article className="content-panel">
            <p className="eyebrow">Preaudit signal</p>
            <h2 className="workspace-panel-title">Public-site findings</h2>
            {data.preaudit ? (
              <div className="workspace-list-grid mt-4">
                <div className="workspace-module-row">
                  <strong>Summary</strong>
                  <p>{data.preaudit.summary}</p>
                </div>
                {data.preaudit.priorityAlerts.slice(0, 2).map((item) => (
                  <div key={item} className="workspace-alert-row">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="workspace-panel-copy mt-4">No preaudit artifact has been loaded yet.</p>
            )}
          </article>

          <article className="content-panel">
            <p className="eyebrow">Intake context</p>
            <h2 className="workspace-panel-title">Business context</h2>
            {data.intake ? (
              <div className="workspace-list-grid mt-4">
                <div className="workspace-module-row">
                  <strong>Completion status</strong>
                  <p>
                    {completionRate}% complete across business profile, goals, pains, systems, lead
                    process, and constraints.
                  </p>
                </div>
                {(data.intake.todo.length > 0
                  ? data.intake.todo.slice(0, 2)
                  : ['Intake data is present and ready to support the deeper audit flow.']).map(
                  (item) => (
                    <div key={item} className="workspace-alert-row">
                      {item}
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="workspace-panel-copy mt-4">No intake record has been loaded yet.</p>
            )}
          </article>

          <article className="content-panel">
            <p className="eyebrow">Audit conclusion</p>
            <h2 className="workspace-panel-title">Audit implications</h2>
            {data.audit ? (
              <div className="workspace-list-grid mt-4">
                <div className="workspace-module-row">
                  <strong>Company summary</strong>
                  <p>{data.audit.companySummary}</p>
                </div>
                {data.audit.mainPains.slice(0, 2).map((item) => (
                  <div key={item} className="workspace-alert-row">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="workspace-panel-copy mt-4">
                No audit artifact is current yet. Use the intake panel to confirm context and run it.
              </p>
            )}
          </article>
        </section>
      ) : null}

      {panel === 'preaudit' ? (
        <>
          <section className="workspace-diagnosis-split-grid">
            <article className="content-panel">
              <p className="eyebrow">Preaudit summary</p>
              <h2 className="workspace-panel-title">Initial diagnostic</h2>
              <p className="workspace-panel-copy">
                {data.preaudit?.summary ?? 'No preaudit summary is available yet.'}
              </p>
            </article>

            <article className="content-panel">
              <p className="eyebrow">Top issues</p>
              <h2 className="workspace-panel-title">What needs attention</h2>
              <div className="workspace-list-grid mt-4">
                {(data.preaudit?.priorityAlerts.slice(0, 4) ?? ['No priority alerts available yet.']).map((item) => (
                  <div key={item} className="workspace-alert-row">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="workspace-score-grid">
            {(data.preaudit?.scores ?? []).map((score) => (
              <article key={score.label} className="workspace-score-card">
                <span className="workspace-score-label">{score.label}</span>
                <strong className="workspace-score-value">{score.score}</strong>
                <span className="workspace-score-scale">/100</span>
              </article>
            ))}
          </section>

          <section className="workspace-diagnosis-split-grid">
            <article className="content-panel">
              <p className="eyebrow">Quick wins</p>
              <h2 className="workspace-panel-title">Useful immediate actions</h2>
              <div className="workspace-action-grid mt-4">
                {(data.preaudit?.quickWins.slice(0, 4) ?? ['No quick wins available yet.']).map((item) => (
                  <div key={item} className="workspace-action-card">
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {panel === 'intake' ? (
        <section className="workspace-section-grid workspace-intake-grid">
          <aside className="workspace-context-panel workspace-intake-rail workspace-sticky-panel">
            <div className="workspace-intake-rail-card">
              <p className="eyebrow">Intake progress</p>
              <h2 className="workspace-panel-title">Readiness for full audit</h2>
              <div className="workspace-progress-metrics mt-4">
                <div className="workspace-progress-metric">
                  <span>Fields complete</span>
                  <strong>
                    {completedFields}/{totalFields}
                  </strong>
                </div>
                <div className="workspace-progress-metric">
                  <span>Completion rate</span>
                  <strong>{completionRate}%</strong>
                </div>
              </div>
            </div>

            <div className="workspace-intake-rail-card">
              <p className="eyebrow">Section navigator</p>
              <div className="workspace-anchor-list mt-4">
                {sectionProgress.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="workspace-anchor-link">
                    <span>
                      {section.title}
                      <small>
                        {section.completed}/{section.total} complete
                      </small>
                    </span>
                    <span className={`workspace-status-pill tone-${section.tone}`}>{section.status}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="workspace-intake-rail-card">
              <p className="eyebrow">Known inputs</p>
              <div className="workspace-list-grid mt-4">
                <div className="workspace-mini-record">
                  <span>Source</span>
                  <strong>{data.intake?.source === 'saved' ? 'Saved intake' : 'Draft intake'}</strong>
                </div>
                <div className="workspace-mini-record">
                  <span>Tracking markers</span>
                  <strong>
                    {data.intake?.trackingMarkers.length ? data.intake.trackingMarkers.join(', ') : 'None detected'}
                  </strong>
                </div>
                <div className="workspace-mini-record">
                  <span>Available assets</span>
                  <strong>{data.intake?.availableAssets.length ?? 0}</strong>
                </div>
              </div>
            </div>
          </aside>

          <div className="workspace-form-stack">
            <section className="content-panel">
              <p className="eyebrow">Intake editor</p>
              <h2 className="workspace-panel-title">Business context</h2>
              <p className="workspace-panel-copy">
                Confirm the inputs needed before running the full audit.
              </p>
            </section>

            {data.intake ? (
              <form className="grid gap-3" onSubmit={handleSubmit}>
                <input type="hidden" name="clientSlug" value={data.clientSlug} />
                <input type="hidden" name="website" value={data.website} />

                {sectionProgress.map((section) => (
                  <section
                    id={section.id}
                    key={section.id}
                    className="content-panel workspace-form-section"
                  >
                    <div className="workspace-form-section-header">
                      <div>
                        <p className="eyebrow">{section.title}</p>
                      </div>
                      <span className={`workspace-status-pill tone-${section.tone}`}>
                        {section.completed}/{section.total} complete
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <label
                          key={field.key}
                          className={field.multiline ? 'space-y-2 md:col-span-2' : 'space-y-2'}
                        >
                          <span className="text-sm font-semibold text-[var(--ink-strong)]">
                            {field.label}
                            {field.required ? ' *' : ''}
                          </span>
                          {field.multiline ? (
                            <textarea
                              className="text-area"
                              name={field.key}
                              defaultValue={data.intake!.form[field.key]}
                              placeholder={field.placeholder}
                              required={field.required}
                              disabled={isSubmitting}
                            />
                          ) : (
                            <input
                              className="text-input"
                              type="text"
                              name={field.key}
                              defaultValue={data.intake!.form[field.key]}
                              placeholder={field.placeholder}
                              required={field.required}
                              disabled={isSubmitting}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="content-panel workspace-submit-panel">
                  <div className="workspace-panel-head">
                    <div>
                      <p className="eyebrow">Run full audit</p>
                      <h2 className="workspace-panel-title">Save intake and run audit</h2>
                    </div>
                  </div>

                  <p className="workspace-panel-copy mt-4">
                    This updates the local intake JSON, then runs the existing audit workflow.
                  </p>

                  <div className="workspace-command-actions mt-4">
                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Running audit...' : 'Save intake and run audit'}
                    </button>
                    <a
                      href={workspaceDiagnosisHref(data.clientSlug, 'preaudit')}
                      className="secondary-button no-underline"
                    >
                      Review preaudit
                    </a>
                  </div>

                  {errorMessage ? <p className="error-banner mt-4">{errorMessage}</p> : null}
                </section>
              </form>
            ) : (
              <section className="content-panel">
                <p className="workspace-panel-copy">
                  No intake record is available yet. Run a preaudit first so the draft context can be generated.
                </p>
              </section>
            )}
          </div>
        </section>
      ) : null}

      {panel === 'audit' ? (
        <>
          <section className="workspace-diagnosis-split-grid">
            <article className="content-panel">
              <p className="eyebrow">Audit summary</p>
              <h2 className="workspace-panel-title">What the audit concluded</h2>
              <p className="workspace-panel-copy">
                {data.audit?.companySummary ??
                  'No audit artifact is available yet. Complete the intake and run the audit to unlock this section.'}
              </p>
            </article>

            <article className="content-panel">
              <p className="eyebrow">Recommended agents</p>
              <h2 className="workspace-panel-title">Execution modules</h2>
              <div className="workspace-list-grid mt-4">
                {(data.audit?.recommendedAgents ?? ['No agents promoted yet']).map((agent) => (
                  <div key={agent} className="workspace-module-row">
                    <strong>{agent}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="workspace-diagnosis-split-grid">
            <article className="content-panel">
              <p className="eyebrow">Main pains</p>
              <h2 className="workspace-panel-title">Problems to solve first</h2>
              <div className="workspace-list-grid mt-4">
                {(data.audit?.mainPains ?? ['Audit output not available yet.']).map((item) => (
                  <div key={item} className="workspace-alert-row">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </WorkspaceShell>
  )
}
