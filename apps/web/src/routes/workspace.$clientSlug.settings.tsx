import { createFileRoute } from '@tanstack/react-router'
import ClientWorkspaceApp from '../components/ClientWorkspaceApp'

export const Route = createFileRoute('/workspace/$clientSlug/settings')({
  component: ClientWorkspaceSettingsPage,
})

function ClientWorkspaceSettingsPage() {
  const { clientSlug } = Route.useParams()

  return <ClientWorkspaceApp clientSlug={clientSlug} view="settings" />
}
