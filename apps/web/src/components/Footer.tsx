import { useRouterState } from '@tanstack/react-router'

export default function Footer() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isWorkspace = pathname.startsWith('/workspace/')
  const isPublicLanding = pathname === '/'

  if (isPublicLanding && !isWorkspace) {
    return (
      <footer className="public-footer px-4 pb-14 pt-8 text-[rgba(214,227,255,0.72)]">
        <div className="page-wrap public-footer-simple">
          <div>
            <p className="public-footer-title">
              Preaudit-first growth diagnostics for service-led businesses.
            </p>
            <p className="public-footer-copy">
              Website clarity, lead flow, measurement, and operational readiness reviewed before a
              deeper audit begins.
            </p>
          </div>

          <nav className="public-footer-links" aria-label="Public footer">
            <a href="#platform">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#why-it-matters">Business impact</a>
            <a href="#lead-capture">Run preaudit</a>
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className="mt-20 px-4 pb-14 pt-4 text-[var(--ink-muted)]">
      <div className="page-wrap footer-grid">
        <div className="footer-card">
          <p className="eyebrow">{isWorkspace ? 'Workspace boundary' : 'Product boundary'}</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--ink-strong)]">
            {isWorkspace ? 'Local workspace shell only' : 'UX layer only'}
          </h2>
          <p className="mt-3 text-sm leading-6">
            {isWorkspace
              ? 'This portal reads existing workflow outputs and client files from the repo. It does not add real authentication, external delivery, or multi-user persistence yet.'
              : 'The landing page explains the service and captures lead context, but the repo-root agent engine and scripts remain unchanged.'}
          </p>
        </div>

        <div className="footer-card">
          <p className="eyebrow">{isWorkspace ? 'Current limits' : 'Current handoff'}</p>
          <h2 className="mt-3 text-xl font-semibold text-[var(--ink-strong)]">
            {isWorkspace ? 'No auth or live CRM yet' : 'Landing to workspace flow'}
          </h2>
          <p className="mt-3 text-sm leading-6">
            {isWorkspace
              ? 'Email is stored locally for client association. There is still no database, no email sending, no CRM sync, and no production-safe access control.'
              : 'A submitted URL and email trigger the current preaudit workflow, then redirect into a client workspace backed by the same local workflow outputs and Business Context JSON.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
