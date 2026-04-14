import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import StageRail from '../components/StageRail'
import { DEFAULT_WEBSITE } from '../lib/product-shell'
import { startPreaudit } from '../lib/workflow.functions'
import { messageFromError } from '../lib/workflow'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const navigate = useNavigate()
  const runPreaudit = useServerFn(startPreaudit)
  const [website, setWebsite] = useState(DEFAULT_WEBSITE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await runPreaudit({
        data: { url: website },
      })

      navigate({
        to: '/preaudit-result',
        search: {
          client: result.clientSlug,
          url: result.website,
        },
      })
    } catch (error) {
      setErrorMessage(messageFromError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-12">
      <section className="hero-panel relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <p className="eyebrow">Local Operator Flow</p>
        <h1 className="display-title mt-4 max-w-4xl text-4xl leading-[0.95] font-semibold tracking-[-0.03em] text-[var(--ink-strong)] sm:text-6xl">
          Trigger the real preaudit workflow from the UX shell.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--ink-muted)] sm:text-lg">
          This uses the existing repo scripts and file outputs. A submitted URL
          runs `preaudit:live`, then the next screens read `latest.json`,
          `run.json`, `report.md`, and the generated intake draft.
        </p>
        <form
          className="mt-10 grid gap-4 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-strong)] p-5 shadow-[0_24px_60px_rgba(34,42,39,0.12)] sm:grid-cols-[1fr_auto]"
          onSubmit={handleSubmit}
        >
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--ink-strong)]">
              Website URL
            </span>
            <input
              className="text-input"
              type="url"
              name="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://www.example.com"
              disabled={isSubmitting}
            />
          </label>
          <button className="primary-button self-end" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Running preaudit...' : 'Run preaudit'}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-[1rem] border border-[rgba(141,65,40,0.2)] bg-[rgba(196,104,70,0.08)] px-4 py-3 text-sm text-[var(--accent-deep)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--ink-subtle)]">
          <span className="chip">Runs root `preaudit:live`</span>
          <span className="chip">Reads `latest.json`</span>
          <span className="chip">Loads generated draft intake</span>
          <span className="chip">No new backend</span>
        </div>
      </section>

      <section className="mt-8">
        <StageRail currentStage="preaudit-live" website={website} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="content-panel">
          <p className="eyebrow">What Happens</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="metric-card">
              <span className="metric-label">Step 1</span>
              <strong className="metric-value">Preaudit live</strong>
              <p>Runs the current live script against the submitted URL.</p>
            </div>
            <div className="metric-card">
              <span className="metric-label">Step 2</span>
              <strong className="metric-value">Artifact read</strong>
              <p>Loads the latest client run pointer and validated output.</p>
            </div>
            <div className="metric-card">
              <span className="metric-label">Step 3</span>
              <strong className="metric-value">Draft intake</strong>
              <p>Uses the generated draft JSON as the intake source of truth.</p>
            </div>
            <div className="metric-card">
              <span className="metric-label">Step 4</span>
              <strong className="metric-value">Audit live</strong>
              <p>Saves the intake file, runs the audit, and reads the latest audit run.</p>
            </div>
          </div>
        </article>

        <article className="content-panel">
          <p className="eyebrow">Repo Boundary</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
            The engine stays where it is.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]">
            `apps/web` only adds a thin local server-function layer. It invokes
            the existing npm scripts and reads or writes the same JSON and
            markdown files the operator already uses from the command line.
          </p>
        </article>
      </section>
    </main>
  )
}
