import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/internal/$clientSlug/artifacts')({
  component: InternalArtifactsPage,
})

function InternalArtifactsPage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="artifacts" routeScope="internal" />
}
