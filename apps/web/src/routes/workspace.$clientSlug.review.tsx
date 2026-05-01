import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/workspace/$clientSlug/review')({
  component: ReviewQueuePage,
})

function ReviewQueuePage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="reviewQueue" />
}
