import { createFileRoute, Link } from '@tanstack/react-router'
import StageRail from '../components/StageRail'
import { getAuditView } from '../lib/workflow.functions'
import { formatAgentLabel, normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/audit-result')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getAuditView({
      data: deps,
    }),
  component: AuditResultPage,
})

function AuditResultPage() {
  const data = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-12">
      <section className="content-panel">
        <p className="eyebrow">Stage 4</p>
        <h1 className="display-title mt-3 text-4xl leading-[0.98] font-semibold tracking-[-0.03em] text-[var(--ink-strong)] sm:text-5xl">
          Audit result for {data.clientSlug}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
          {data.companySummary}
        </p>
      </section>

      <section className="mt-8">
        <StageRail
          currentStage="audit-live"
          clientSlug={data.clientSlug}
          website={data.website}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="content-panel">
          <p className="eyebrow">Recommended Agents</p>
          <ul className="mt-5 space-y-3">
            {data.recommendedAgents.map((agent) => (
              <li key={agent} className="list-row">
                {formatAgentLabel(agent)}
              </li>
            ))}
          </ul>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Priority Order</p>
          <ol className="mt-5 space-y-3">
            {data.priorityOrder.map((item, index) => (
              <li key={item} className="list-row">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-deep)]">
                  {index + 1}
                </span>
                {formatAgentLabel(item)}
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="content-panel">
          <p className="eyebrow">Main Pains</p>
          <ul className="mt-5 space-y-3">
            {data.mainPains.map((item) => (
              <li key={item} className="list-row">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Available Data</p>
          <ul className="mt-5 space-y-3">
            {data.availableData.map((item) => (
              <li key={item} className="list-row">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="content-panel">
          <p className="eyebrow">Notes</p>
          <p className="mt-5 text-sm leading-7 text-[var(--ink-muted)]">{data.notes}</p>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Linked Files</p>
          <dl className="mt-5 space-y-4 text-sm leading-6 text-[var(--ink-muted)]">
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Run</dt>
              <dd>{data.displayRunId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Industry</dt>
              <dd>{data.industry}</dd>
            </div>
            {data.intakePath ? (
              <div>
                <dt className="font-semibold text-[var(--ink-strong)]">Intake path</dt>
                <dd>{data.intakePath}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="secondary-button inline-flex no-underline">
              Start another preaudit
            </Link>
            <Link
              to="/audit-intake"
              search={{ client: data.clientSlug, url: data.website }}
              className="primary-button inline-flex no-underline"
            >
              Revisit intake
            </Link>
          </div>
        </article>
      </section>
    </main>
  )
}
