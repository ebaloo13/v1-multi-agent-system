import { createFileRoute, Link } from '@tanstack/react-router'
import StageRail from '../components/StageRail'
import { getPreauditView } from '../lib/workflow.functions'
import { normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/preaudit-result')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getPreauditView({
      data: deps,
    }),
  component: PreauditResultPage,
})

function PreauditResultPage() {
  const data = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-12">
      <section className="content-panel">
        <p className="eyebrow">Stage 2</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="display-title text-4xl leading-[0.98] font-semibold tracking-[-0.03em] text-[var(--ink-strong)] sm:text-5xl">
              Preaudit result for {data.clientSlug}
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--ink-muted)]">
              {data.summary}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-4 text-sm leading-6 text-[var(--ink-muted)]">
            <strong className="block text-[var(--ink-strong)]">Loaded from files</strong>
            {data.displayRunId}
            <br />
            {data.reportPath}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <StageRail
          currentStage="preaudit-report"
          clientSlug={data.clientSlug}
          website={data.website}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="content-panel">
          <p className="eyebrow">Scores</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {data.scores.map((score) => (
              <div key={score.label} className="metric-card">
                <span className="metric-label">{score.label}</span>
                <strong className="metric-value">{score.score}/100</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Priority Alerts</p>
          <ul className="mt-5 space-y-3">
            {data.priorityAlerts.map((item) => (
              <li key={item} className="list-row">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="content-panel">
          <p className="eyebrow">Business Impact</p>
          <ul className="mt-5 space-y-3">
            {data.businessImpact.map((item) => (
              <li key={item} className="list-row">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Quick Wins</p>
          <ul className="mt-5 space-y-3">
            {data.quickWins.map((item) => (
              <li key={item} className="list-row">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              to="/audit-intake"
              search={{ client: data.clientSlug, url: data.website }}
              className="primary-button inline-flex no-underline"
            >
              Continue to audit intake
            </Link>
          </div>
        </article>
      </section>
    </main>
  )
}
