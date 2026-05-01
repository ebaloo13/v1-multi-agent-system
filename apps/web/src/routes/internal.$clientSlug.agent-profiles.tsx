import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/agent-profiles')({
  component: InternalAgentProfilesPage,
})

function InternalAgentProfilesPage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="agentProfiles" routeScope="internal" />
}
