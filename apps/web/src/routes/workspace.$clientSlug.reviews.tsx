import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'
import { getClientWorkItems } from '../lib/client-work-items.functions'

export const Route = createFileRoute('/workspace/$clientSlug/reviews')({
  loader: ({ params }) =>
    getClientWorkItems({
      data: { clientSlug: params.clientSlug },
    }),
  component: ClientWorkspaceReviewsPage,
})

function ClientWorkspaceReviewsPage() {
  const { clientSlug } = Route.useParams()
  const workItems = Route.useLoaderData()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="reviews" workItems={workItems} />
}
