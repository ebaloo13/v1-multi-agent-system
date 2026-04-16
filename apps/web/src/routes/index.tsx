import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  DEFAULT_WEBSITE,
  audienceFits,
  capabilityModules,
  heroProofPoints,
  howItWorksSteps,
  platformShowcasePanels,
  showcaseStatTiles,
  trustPositioningPoints,
  whyItMattersPoints,
} from '../lib/product-shell'
import { startPreaudit } from '../lib/workflow.functions'
import { messageFromError } from '../lib/workflow'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const navigate = useNavigate()
  const runPreaudit = useServerFn(startPreaudit)
  const [website, setWebsite] = useState(DEFAULT_WEBSITE)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await runPreaudit({
        data: { url: website, email },
      })

      navigate({
        to: '/workspace/$clientSlug/preaudit',
        params: {
          clientSlug: result.clientSlug,
        },
      })
    } catch (error) {
      setErrorMessage(messageFromError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="public-page pb-12 pt-6">
      <section className="page-wrap px-4">
        <section className="public-hero-premium">
          <div className="public-grid-glow public-grid-glow-left" />
          <div className="public-grid-glow public-grid-glow-right" />

          <div className="public-hero-layout">
            <div className="public-hero-copy">
              <p className="public-kicker">AI Growth Diagnostic Platform</p>
              <h1 className="public-hero-title">
                See where your website, lead flow, and operations are costing you growth.
              </h1>
              <p className="public-hero-subtitle">
                Run a free preaudit for service businesses, local operators, clinics, gyms, and
                real estate teams. Get a clearer view of conversion gaps, visibility issues,
                follow-up weakness, and operational friction before moving into a deeper audit.
              </p>

              <div className="public-chip-row">
                {audienceFits.map((item) => (
                  <span key={item} className="public-chip">
                    {item}
                  </span>
                ))}
              </div>

              <div className="public-cta-row">
                <a href="#lead-capture" className="primary-button primary-button-public no-underline">
                  Run free preaudit
                </a>
                <a href="#platform" className="public-ghost-button no-underline">
                  Explore platform
                </a>
              </div>
            </div>

            <aside className="public-hero-product">
              <div className="public-console-shell">
                <div className="public-console-head">
                  <span className="public-console-pill">Preaudit engine</span>
                  <span className="public-console-pill">Lead capture</span>
                  <span className="public-console-pill">Workspace handoff</span>
                </div>

                <div className="public-console-grid">
                  {heroProofPoints.map((item) => (
                    <div key={item} className="public-console-card">
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>

                <div className="public-console-panel">
                  <span className="metric-label">What happens next</span>
                  <strong className="metric-value">Diagnostic → Workspace → Audit path</strong>
                  <p>
                    The preaudit creates an initial readout, links it to a client record, and
                    opens the next step into review, intake, and deeper audit work.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </section>

      <section id="platform" className="page-wrap mt-8 px-4 scroll-mt-28">
        <section className="public-dark-section">
          <div className="public-section-head">
            <div>
              <p className="public-kicker">Platform Capabilities</p>
              <h2 className="public-section-title">
                What the platform can surface in a first-pass diagnostic.
              </h2>
            </div>
            <p className="public-section-copy">
              From website friction to missed follow-up, the preaudit is built to surface the weak
              points that block growth before deeper advisory work starts.
            </p>
          </div>

          <div className="public-capability-grid">
            {capabilityModules.map((item) => (
              <article key={item.title} className="public-capability-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section id="how-it-works" className="page-wrap mt-8 px-4 scroll-mt-28">
        <section className="public-dark-section public-how-section">
          <div className="public-section-head">
            <div>
              <p className="public-kicker">How It Works</p>
              <h2 className="public-section-title">
                From first scan to a structured audit path.
              </h2>
            </div>
          </div>

          <div className="public-step-grid">
            {howItWorksSteps.map((item) => (
              <article key={item.step} className="public-step-card">
                <span className="public-step-index">{item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="page-wrap mt-8 px-4">
        <section className="public-showcase-section">
          <div className="public-section-head">
            <div>
              <p className="public-kicker">See It Working</p>
              <h2 className="public-section-title">
                A clearer operating view before the full audit starts.
              </h2>
            </div>
            <p className="public-section-copy">
              The goal is a usable readout: where growth leaks exist, what they affect, and which
              next action deserves attention first.
            </p>
          </div>

          <div className="public-showcase-layout">
            <div className="public-browser-frame">
              <div className="public-browser-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="public-browser-content">
                {platformShowcasePanels.map((panel) => (
                  <article key={panel.title} className="public-browser-panel">
                    <p className="public-panel-eyebrow">{panel.eyebrow}</p>
                    <h3>{panel.title}</h3>
                    <p>{panel.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="public-stat-stack">
              {showcaseStatTiles.map((tile) => (
                <article key={tile.label} className="public-stat-card">
                  <strong>{tile.value}</strong>
                  <span>{tile.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section id="why-it-matters" className="page-wrap mt-8 px-4 scroll-mt-28">
        <section className="public-dark-section">
          <div className="public-section-head">
            <div>
              <p className="public-kicker">Business Impact</p>
              <h2 className="public-section-title">
                Tie visible friction to the business outcomes leadership actually feels.
              </h2>
            </div>
          </div>

          <div className="public-impact-grid">
            {whyItMattersPoints.map((item) => (
              <article key={item.title} className="public-impact-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section id="lead-capture" className="page-wrap mt-8 px-4 scroll-mt-28">
        <section className="public-cta-section">
          <div className="public-section-head">
            <div>
              <p className="public-kicker">Free Preaudit</p>
              <h2 className="public-section-title">
                Run the free preaudit and open the client workspace.
              </h2>
            </div>
            <p className="public-section-copy">
              Share the website and the best client email. The preaudit gets attached to the right
              client record so the review and next steps stay connected.
            </p>
          </div>

          <div className="public-cta-layout">
            <form className="public-cta-form" onSubmit={handleSubmit}>
              <label className="space-y-2">
                <span className="public-form-label">Website URL</span>
                <input
                  className="public-text-input"
                  type="url"
                  name="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://www.example.com"
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="public-form-label">Client email</span>
                <input
                  className="public-text-input"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@business.com"
                  disabled={isSubmitting}
                  required
                />
              </label>

              <div className="public-cta-actions">
                <button className="primary-button primary-button-public w-fit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Running preaudit...' : 'Run free preaudit'}
                </button>
                <span className="public-muted-note">
                  You will be redirected into the client workspace when it is ready.
                </span>
              </div>

              {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
            </form>

            <aside className="public-cta-side">
              <p className="public-kicker">What Happens After</p>
              <div className="public-side-list">
                {trustPositioningPoints.map((item) => (
                  <div key={item} className="public-side-row">
                    {item}
                  </div>
                ))}
              </div>

              <div className="public-side-note">
                <strong>Typical next step</strong>
                <p>
                  Most clients start with the preaudit, confirm business context, then prioritize a
                  deeper audit around conversion, follow-up, CRM, or operational bottlenecks.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </section>
    </main>
  )
}
