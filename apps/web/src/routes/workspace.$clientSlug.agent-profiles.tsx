import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/workspace/$clientSlug/agent-profiles')({
  component: AgentProfilesPage,
})

function AgentProfilesPage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="agentProfiles" />
}
