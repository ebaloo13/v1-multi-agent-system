import {
  workspaceHref,
  workspaceTabs,
  type WorkspaceRouteScope,
  type WorkspaceTabId,
} from '../lib/product-shell'

type StageRailProps = {
  currentStage: WorkspaceTabId
  clientSlug?: string
  routeScope?: WorkspaceRouteScope
}

export default function StageRail({
  currentStage,
  clientSlug,
  routeScope = 'workspace',
}: StageRailProps) {
  const effectiveClientSlug = clientSlug ?? 'generic-client'
  const visibleTabs =
    routeScope === 'workspace'
      ? workspaceTabs.filter((stage) => stage.id === 'dashboard' || stage.id === 'diagnosis')
      : workspaceTabs

  return (
    <ol className="grid gap-3 lg:grid-cols-4">
      {visibleTabs.map((stage, index) => {
        const isActive = stage.id === currentStage

        return (
          <li
            key={stage.id}
            className={isActive ? 'status-card border-[rgba(143,74,47,0.24)]' : 'status-card'}
          >
            <a href={workspaceHref(effectiveClientSlug, stage.id, routeScope)} className="block no-underline"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="priority-pill">0{index + 1}</span>
                <span className="metric-label">{isActive ? 'Current' : 'Open'}</span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--ink-strong)]">
                {stage.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                Workspace section for {stage.label.toLowerCase()}.
              </p>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
