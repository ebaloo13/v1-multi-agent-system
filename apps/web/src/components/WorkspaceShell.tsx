import type { ReactNode } from 'react'
import {
  getWorkspaceSectionMeta,
  workspaceHref,
  type WorkspaceRouteScope,
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
  routeScope?: WorkspaceRouteScope
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
  },
  {
    label: 'Playbooks',
  },
] as const

const workspaceNavIcons: Record<WorkspaceSectionId, string> = {
  dashboard: 'D',
  diagnosis: 'Di',
  workstreams: 'W',
  agents: 'A',
  impact: 'I',
  activity: 'Ac',
  agentBoard: 'AB',
  taskLifecycle: 'TL',
  runTimeline: 'RT',
  artifacts: 'Ar',
  reviewQueue: 'HR',
  agentProfiles: 'AP',
}

export default function WorkspaceShell({
  section,
  clientSlug,
  clientName,
  website,
  email,
  statusChips = [],
  action,
  routeScope = 'workspace',
  children,
}: WorkspaceShellProps) {
  const sectionMeta = getWorkspaceSectionMeta(section)

  return (
    <main className={`workspace-page workspace-section-${section}`}>
      <div className="workspace-app-shell">
        <WorkspaceAppSidebar
          section={section}
          clientSlug={clientSlug}
          clientName={clientName}
          website={website}
          email={email}
          routeScope={routeScope}
        />

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

              {action ? <div className="workspace-command-actions">{action}</div> : null}
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
          </header>

          <div className="workspace-content-grid">{children}</div>
        </section>
      </div>
    </main>
  )
}

export function WorkspaceAppSidebar({
  section,
  clientSlug,
  clientName,
  website,
  email,
  routeScope = 'workspace',
}: {
  section: WorkspaceSectionId
  clientSlug: string
  clientName: string
  website: string
  email?: string
  routeScope?: WorkspaceRouteScope
}) {
  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar-panel workspace-sidebar-panel-primary">
        <div className="workspace-product-mark">
          <span>{clientName.slice(0, 1)}</span>
          <p>Automation workspace</p>
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
                href={workspaceHref(clientSlug, tab.id, routeScope)}
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
            </div>
          ))}
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
  )
}
