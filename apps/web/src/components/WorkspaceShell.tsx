import type { ReactNode } from 'react'
import {
  getWorkspaceSectionMeta,
  workspaceHref,
  type WorkspaceSectionId,
  workspaceTabs,
} from '../lib/product-shell'

type WorkspaceShellProps = {
  section: WorkspaceSectionId
  clientSlug: string
  clientName: string
  website: string
  email?: string
  stageLabel: string
  stageDetail: string
  primaryActionLabel: string
  primaryActionDetail: string
  statusChips?: WorkspaceShellStatusChip[]
  action?: ReactNode
  children: ReactNode
}

export type WorkspaceShellStatusChip = {
  label: string
  value: string
  tone?: 'success' | 'progress' | 'pending' | 'neutral'
}

const upcomingWorkspaceItems = [
  {
    label: 'Playbooks',
    detail: 'Reusable operating patterns and execution kits',
  },
  {
    label: 'Reports',
    detail: 'Client-facing summaries and historical output views',
  },
  {
    label: 'Activity',
    detail: 'Runs, notes, milestones, and workspace events',
  },
] as const

export default function WorkspaceShell({
  section,
  clientSlug,
  clientName,
  website,
  email,
  stageLabel,
  stageDetail,
  primaryActionLabel,
  primaryActionDetail,
  statusChips = [],
  action,
  children,
}: WorkspaceShellProps) {
  const sectionMeta = getWorkspaceSectionMeta(section)

  return (
    <main className="page-wrap workspace-page px-4 pb-8 pt-6">
      <div className="workspace-app-shell">
        <aside className="workspace-sidebar">
          <div className="workspace-sidebar-panel workspace-sidebar-panel-primary">
            <p className="workspace-sidebar-eyebrow">Workspace v2</p>
            <div className="workspace-sidebar-head">
              <div>
                <h1 className="workspace-sidebar-title">{clientName}</h1>
                <p className="workspace-sidebar-copy">
                  Client operating system for diagnosis, workstreams, agents, and future execution.
                </p>
              </div>
              <span className="workspace-sidebar-stage-pill">{stageLabel}</span>
            </div>
            <a href={website} target="_blank" rel="noreferrer" className="workspace-sidebar-site-link">
              {website}
            </a>
          </div>

          <div className="workspace-sidebar-section">
            <div className="workspace-sidebar-section-head">
              <p className="workspace-sidebar-section-title">Main navigation</p>
              <span className="workspace-sidebar-section-tag">Live</span>
            </div>
            <nav className="workspace-sidebar-nav" aria-label="Workspace navigation">
              {workspaceTabs.map((tab) => {
                const isActive = tab.id === section
                const meta = getWorkspaceSectionMeta(tab.id)

                return (
                  <a
                    key={tab.id}
                    href={workspaceHref(clientSlug, tab.id)}
                    className={isActive ? 'workspace-sidebar-link is-active' : 'workspace-sidebar-link'}
                  >
                    <span className="workspace-sidebar-link-content">
                      <span className="workspace-sidebar-link-label">{tab.label}</span>
                      <span className="workspace-sidebar-link-meta">{meta.summary}</span>
                    </span>
                    <span className={isActive ? 'workspace-sidebar-link-state' : 'workspace-sidebar-link-state is-idle'}>
                      {isActive ? 'Open' : 'View'}
                    </span>
                  </a>
                )
              })}
            </nav>
          </div>

          <div className="workspace-sidebar-section">
            <div className="workspace-sidebar-section-head">
              <p className="workspace-sidebar-section-title">Upcoming</p>
              <span className="workspace-sidebar-section-tag is-muted">Soon</span>
            </div>
            <div className="workspace-sidebar-nav">
              {upcomingWorkspaceItems.map((item) => (
                <div key={item.label} className="workspace-sidebar-link is-disabled" aria-disabled="true">
                  <span className="workspace-sidebar-link-content">
                    <span className="workspace-sidebar-link-label">{item.label}</span>
                    <span className="workspace-sidebar-link-meta">{item.detail}</span>
                  </span>
                  <span className="workspace-sidebar-link-state is-muted">Soon</span>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-sidebar-stack">
            <div className="workspace-sidebar-card">
              <span className="workspace-meta-label">Current stage</span>
              <strong>{stageLabel}</strong>
              <p className="workspace-meta-detail">{stageDetail}</p>
            </div>

            <div className="workspace-sidebar-card">
              <span className="workspace-meta-label">Client record</span>
              <strong>{clientSlug}</strong>
              <p className="workspace-meta-detail">{email ?? 'Lead email not captured yet'}</p>
            </div>
          </div>
        </aside>

        <section className="workspace-main-panel">
          <header className="workspace-command-bar">
            <div className="workspace-command-top">
              <div className="workspace-command-main">
                <p className="workspace-topbar-kicker">Workspace / {sectionMeta.title}</p>
                <div className="workspace-client-identity">
                  <h2 className="workspace-topbar-title">{clientName}</h2>
                  <p className="workspace-command-copy">{sectionMeta.summary}</p>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="workspace-command-link"
                  >
                    {website}
                  </a>
                </div>
              </div>

              <div className="workspace-command-side">
                <div className="workspace-command-card is-stage">
                  <span className="workspace-meta-label">Stage</span>
                  <strong>{stageLabel}</strong>
                  <p className="workspace-meta-detail">{stageDetail}</p>
                </div>

                <div className="workspace-command-card">
                  <span className="workspace-meta-label">Primary next action</span>
                  <strong>{primaryActionLabel}</strong>
                  <p className="workspace-meta-detail">{primaryActionDetail}</p>
                </div>
              </div>
            </div>

            {statusChips.length > 0 ? (
              <div className="workspace-summary-grid">
                {statusChips.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={`workspace-summary-tile tone-${item.tone ?? 'neutral'}`}
                  >
                    <span className="workspace-meta-label">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {action ? <div className="workspace-command-actions">{action}</div> : null}
          </header>

          <div className="workspace-content-grid">{children}</div>
        </section>
      </div>
    </main>
  )
}
