import { Link } from '@tanstack/react-router'
import { flowStages } from '../lib/product-shell'

type StageRailProps = {
  currentStage: (typeof flowStages)[number]['id']
  clientSlug?: string
  website?: string
}

export default function StageRail({
  currentStage,
  clientSlug,
  website,
}: StageRailProps) {
  return (
    <ol className="grid gap-3 lg:grid-cols-4">
      {flowStages.map((stage, index) => {
        const isActive = stage.id === currentStage
        const hasSearch = stage.path !== '/' && (clientSlug || website)

        return (
          <li key={stage.id} className={isActive ? 'stage-card stage-card-active' : 'stage-card'}>
            <Link
              to={stage.path}
              search={
                hasSearch
                  ? {
                      client: clientSlug,
                      url: website,
                    }
                  : undefined
              }
              className="block no-underline"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="stage-index">0{index + 1}</span>
                <span className="stage-caption">{isActive ? 'Current' : 'Open'}</span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--ink-strong)]">
                {stage.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                {stage.detail}
              </p>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
