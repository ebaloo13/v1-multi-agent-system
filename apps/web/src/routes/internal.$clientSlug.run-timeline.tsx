import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/run-timeline')({
  component: InternalRunTimelinePage,
})

function InternalRunTimelinePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="runTimeline" routeScope="internal" />
}
