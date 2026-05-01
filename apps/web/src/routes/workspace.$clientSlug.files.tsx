import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'

export const Route = createFileRoute('/workspace/$clientSlug/files')({
  component: ClientWorkspaceFilesPage,
})

function ClientWorkspaceFilesPage() {
  const { clientSlug } = Route.useParams()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="files" />
}
