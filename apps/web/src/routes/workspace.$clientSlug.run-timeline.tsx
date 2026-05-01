import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/workspace/$clientSlug/run-timeline')({
  component: RunTimelinePage,
})

function RunTimelinePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="runTimeline" />
}
