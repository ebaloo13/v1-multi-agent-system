import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'

export const Route = createFileRoute('/workspace/$clientSlug/new-request')({
  component: ClientWorkspaceNewRequestPage,
})

function ClientWorkspaceNewRequestPage() {
  const { clientSlug } = Route.useParams()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="newRequest" />
}
