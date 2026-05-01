import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'

export const Route = createFileRoute('/workspace/$clientSlug/')({
  component: ClientWorkspaceHomePage,
})

function ClientWorkspaceHomePage() {
  const { clientSlug } = Route.useParams()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="home" />
}
