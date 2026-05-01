import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'
import { getClientWorkItems } from '../lib/client-work-items.functions'

export const Route = createFileRoute('/workspace/$clientSlug/')({
  loader: ({ params }) =>
    getClientWorkItems({
      data: { clientSlug: params.clientSlug },
    }),
  component: ClientWorkspaceHomePage,
})

function ClientWorkspaceHomePage() {
  const { clientSlug } = Route.useParams()
  const workItems = Route.useLoaderData()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="home" workItems={workItems} />
}
