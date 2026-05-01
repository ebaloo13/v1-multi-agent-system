import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/review')({
  component: InternalReviewQueuePage,
})

function InternalReviewQueuePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="reviewQueue" routeScope="internal" />
}
