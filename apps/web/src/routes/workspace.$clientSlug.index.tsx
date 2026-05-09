import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'
import { getClientWorkItemFunnel, getClientWorkItems } from '../lib/client-work-items.functions'

export const Route = createFileRoute('/workspace/$clientSlug/')({
  loader: async ({ params }) => {
    const [workItems, funnel] = await Promise.all([
      getClientWorkItems({
        data: { clientSlug: params.clientSlug },
      }),
      getClientWorkItemFunnel({
        data: { clientSlug: params.clientSlug },
      }),
    ])

    return {
      workItems,
      funnel,
    }
  },
  component: ClientWorkspaceHomePage,
})

function ClientWorkspaceHomePage() {
  const { clientSlug } = Route.useParams()
  const { workItems, funnel } = Route.useLoaderData()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="home" workItems={workItems} funnel={funnel} />
}
