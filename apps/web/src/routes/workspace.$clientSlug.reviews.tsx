import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'

export const Route = createFileRoute('/workspace/$clientSlug/reviews')({
  component: ClientWorkspaceReviewsPage,
})

function ClientWorkspaceReviewsPage() {
  const { clientSlug } = Route.useParams()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="reviews" />
}
