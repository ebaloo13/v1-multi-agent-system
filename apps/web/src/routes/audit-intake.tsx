import { type FormEvent, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import StageRail from '../components/StageRail'
import { intakeSections } from '../lib/product-shell'
import { saveAndRunAudit, getAuditIntakeView } from '../lib/workflow.functions'
import { messageFromError, normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/audit-intake')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getAuditIntakeView({
      data: deps,
    }),
  component: AuditIntakePage,
})

function AuditIntakePage() {
  const navigate = useNavigate()
  const runAudit = useServerFn(saveAndRunAudit)
  const data = Route.useLoaderData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await runAudit({ data: formData })

      navigate({
        to: '/audit-result',
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
      <section className="content-panel">
        <p className="eyebrow">Stage 3</p>
        <h1 className="display-title mt-3 text-4xl leading-[0.98] font-semibold tracking-[-0.03em] text-[var(--ink-strong)] sm:text-5xl">
          Confirm the intake draft before `audit:live`.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
          This route reads the real draft file, lets you edit it, writes the
          real intake JSON, and then invokes the existing audit script.
        </p>
      </section>

      <section className="mt-8">
        <StageRail
          currentStage="audit-intake"
          clientSlug={data.clientSlug}
          website={data.website}
        />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="content-panel h-fit">
          <p className="eyebrow">File State</p>
          <dl className="mt-5 space-y-4 text-sm leading-6 text-[var(--ink-muted)]">
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Client</dt>
              <dd>{data.clientSlug}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Loaded from</dt>
              <dd>{data.source === 'saved' ? 'saved intake' : 'draft intake'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Draft path</dt>
              <dd>{data.draftPath}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink-strong)]">Saved intake path</dt>
              <dd>{data.intakePath}</dd>
            </div>
          </dl>

          <div className="mt-8 space-y-5 text-sm leading-6 text-[var(--ink-muted)]">
            <div>
              <strong className="text-[var(--ink-strong)]">Available assets</strong>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.availableAssets.map((item) => (
                  <span key={item} className="chip normal-case tracking-normal">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <strong className="text-[var(--ink-strong)]">Detected tracking markers</strong>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.trackingMarkers.length > 0 ? data.trackingMarkers : ['None detected']).map(
                  (item) => (
                    <span key={item} className="chip">
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div>
              <strong className="text-[var(--ink-strong)]">Draft todo</strong>
              <ul className="mt-3 space-y-2">
                {data.todo.map((item) => (
                  <li key={item} className="list-row">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link
            to="/preaudit-result"
            search={{ client: data.clientSlug, url: data.website }}
            className="secondary-button mt-6 inline-flex no-underline"
          >
            Back to preaudit result
          </Link>
        </aside>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input type="hidden" name="clientSlug" value={data.clientSlug} />
          <input type="hidden" name="website" value={data.website} />

          {intakeSections.map((section) => (
            <section key={section.id} className="content-panel">
              <p className="eyebrow">{section.title}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
                {section.description}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                        defaultValue={data.form[field.key]}
                        name={field.key}
                        placeholder={field.placeholder}
                        rows={4}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <input
                        className="text-input"
                        defaultValue={data.form[field.key]}
                        name={field.key}
                        placeholder={field.placeholder}
                        type="text"
                        disabled={isSubmitting}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}

          {errorMessage ? (
            <p className="rounded-[1rem] border border-[rgba(141,65,40,0.2)] bg-[rgba(196,104,70,0.08)] px-4 py-3 text-sm text-[var(--accent-deep)]">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving intake + running audit...' : 'Save intake and run audit'}
            </button>
            <p className="self-center text-sm text-[var(--ink-subtle)]">
              Saves to the real client intake JSON before invoking `audit:live`.
            </p>
          </div>
        </form>
      </section>
    </main>
  )
}
