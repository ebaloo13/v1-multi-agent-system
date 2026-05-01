import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/task-lifecycle')({
  component: InternalTaskLifecyclePage,
})

function InternalTaskLifecyclePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="taskLifecycle" routeScope="internal" />
}
