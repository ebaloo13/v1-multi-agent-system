import { Link, useRouterState } from '@tanstack/react-router'
import { publicNavItems } from '../lib/product-shell'

export default function Header() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const workspaceMatch = pathname.match(/^\/workspace\/([^/]+)/)
  const clientSlug = workspaceMatch?.[1]
  const isWorkspace = Boolean(clientSlug)
  const isPublicLanding = pathname === '/'

  return (
    <header className={isPublicLanding && !isWorkspace ? 'app-header app-header-public px-4' : 'app-header px-4'}>
      <nav className="page-wrap header-bar">
        <h1 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link to="/" className={isPublicLanding && !isWorkspace ? 'brand-lockup brand-lockup-public' : 'brand-lockup'}>
            <span className="brand-mark">CX</span>
            <span>
              <span className={isPublicLanding && !isWorkspace ? 'block text-sm font-semibold text-white' : 'block text-sm font-semibold text-[var(--ink-strong)]'}>
                Client Growth Audit
              </span>
              <span className={isPublicLanding && !isWorkspace ? 'block text-xs text-[rgba(214,227,255,0.64)]' : 'block text-xs text-[var(--ink-subtle)]'}>
                Public landing + client workspace
              </span>
            </span>
          </Link>
        </h1>

        {isWorkspace && clientSlug ? (
          <div className="header-actions">
            <span className="header-context">Client workspace</span>
            <span className="header-badge">{clientSlug}</span>
            <Link to="/" className="secondary-button header-button no-underline">
              Public landing
            </Link>
          </div>
        ) : (
          <>
            <div className="header-nav">
              {publicNavItems.map((item) => (
                <a
                  key={item.href}
                  href={pathname === '/' ? item.href : `/${item.href}`}
                  className={isPublicLanding ? 'nav-link nav-link-public' : 'nav-link'}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="header-actions">
              <span className={isPublicLanding ? 'header-badge header-badge-public' : 'header-badge'}>
                Local-first UX
              </span>
              <a href="#lead-capture" className={isPublicLanding ? 'primary-button primary-button-public header-button no-underline' : 'primary-button header-button no-underline'}>
                Run free preaudit
              </a>
            </div>
          </>
        )}
      </nav>
    </header>
  )
}
