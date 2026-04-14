import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--surface-glass)] px-4 backdrop-blur-xl">
      <nav className="page-wrap flex flex-wrap items-center gap-3 py-4">
        <h1 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--ink-strong)] no-underline shadow-[0_16px_40px_rgba(34,42,39,0.08)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
              UX
            </span>
            B2B Audit Flow
          </Link>
        </h1>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-subtle)]">
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-strong)] px-3 py-2">
            Local file workflow
          </span>
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-strong)] px-3 py-2">
            Existing engine
          </span>
        </div>

        <div className="flex w-full flex-wrap items-center gap-5 text-sm font-semibold">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true, includeSearch: false }}
          >
            New Preaudit
          </Link>
          <Link
            to="/preaudit-result"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true, includeSearch: false }}
          >
            Preaudit Result
          </Link>
          <Link
            to="/audit-intake"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true, includeSearch: false }}
          >
            Audit Intake
          </Link>
          <Link
            to="/audit-result"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true, includeSearch: false }}
          >
            Audit Result
          </Link>
        </div>
      </nav>
    </header>
  )
}
