import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'
import { getClientWorkItems } from '../lib/client-work-items.functions'

export const Route = createFileRoute('/workspace/$clientSlug/files')({
  loader: ({ params }) =>
    getClientWorkItems({
      data: { clientSlug: params.clientSlug },
    }),
  component: ClientWorkspaceFilesPage,
})

function ClientWorkspaceFilesPage() {
  const { clientSlug } = Route.useParams()
  const workItems = Route.useLoaderData()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="files" workItems={workItems} />
}
