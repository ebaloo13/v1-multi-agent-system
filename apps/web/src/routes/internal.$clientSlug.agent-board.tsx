import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/agent-board')({
  component: InternalAgentBoardPage,
})

function InternalAgentBoardPage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="agentBoard" routeScope="internal" />
}
