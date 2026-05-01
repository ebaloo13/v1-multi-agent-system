import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/workspace/$clientSlug/task-lifecycle')({
  component: TaskLifecyclePage,
})

function TaskLifecyclePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="taskLifecycle" />
}
