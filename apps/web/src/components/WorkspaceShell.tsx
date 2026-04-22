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
    label: 'Reports',
    detail: 'Future outputs',
  },
  {
    label: 'Activity',
    detail: 'Future history',
  },
  {
    label: 'Playbooks',
    detail: 'Future workflows',
  },
] as const

const workspaceNavIcons: Record<WorkspaceSectionId, string> = {
  dashboard: 'D',
  diagnosis: 'Di',
  workstreams: 'W',
  agents: 'A',
}

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
            <div className="workspace-product-mark">
              <span>OS</span>
              <p>Client workspace</p>
            </div>
            <div className="workspace-sidebar-head">
              <div>
                <h1 className="workspace-sidebar-title">{clientName}</h1>
              </div>
            </div>
            <a href={website} target="_blank" rel="noreferrer" className="workspace-sidebar-site-link">
              {website}
            </a>
          </div>

          <div className="workspace-sidebar-section">
            <div className="workspace-sidebar-section-head">
              <p className="workspace-sidebar-section-title">Navigation</p>
            </div>
            <nav className="workspace-sidebar-nav" aria-label="Workspace navigation">
              {workspaceTabs.map((tab) => {
                const isActive = tab.id === section

                return (
                  <a
                    key={tab.id}
                    href={workspaceHref(clientSlug, tab.id)}
                    className={isActive ? 'workspace-sidebar-link is-active' : 'workspace-sidebar-link'}
                  >
                    <span className="workspace-sidebar-link-icon">{workspaceNavIcons[tab.id]}</span>
                    <span className="workspace-sidebar-link-content">
                      <span className="workspace-sidebar-link-label">{tab.label}</span>
                    </span>
                  </a>
                )
              })}
            </nav>
          </div>

          <div className="workspace-sidebar-section">
            <div className="workspace-sidebar-section-head">
              <p className="workspace-sidebar-section-title">Future modules</p>
            </div>
            <div className="workspace-upcoming-list">
              {upcomingWorkspaceItems.map((item) => (
                <div key={item.label} className="workspace-upcoming-item" aria-disabled="true">
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
            <div className="workspace-activity-preview" aria-disabled="true">
              <span>Activity will show client-safe progress history here later.</span>
            </div>
          </div>

          <div className="workspace-sidebar-stack">
            <div className="workspace-sidebar-card">
              <span className="workspace-meta-label">Client</span>
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
                  <div className="workspace-title-row">
                    <h2 className="workspace-topbar-title">{clientName}</h2>
                    <span className="workspace-client-pill">{clientSlug}</span>
                  </div>
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
                <div className="workspace-command-card">
                  <span className="workspace-meta-label">Current stage</span>
                  <strong>{stageLabel}</strong>
                  <p>{stageDetail}</p>
                </div>

                <div className="workspace-command-card">
                  <span className="workspace-meta-label">Next action</span>
                  <strong>{primaryActionLabel}</strong>
                  <p>{primaryActionDetail}</p>
                </div>
              </div>
            </div>

            {statusChips.length > 0 ? (
              <div className="workspace-header-status-row">
                {statusChips.slice(0, 3).map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={`workspace-header-status-chip tone-${item.tone ?? 'neutral'}`}
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
