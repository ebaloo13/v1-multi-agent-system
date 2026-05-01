import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'

export const Route = createFileRoute('/workspace/$clientSlug/artifacts')({
  component: ArtifactsPage,
})

function ArtifactsPage() {
  const { clientSlug } = Route.useParams()

  return <AutomationWorkspacePage clientSlug={clientSlug} view="artifacts" />
}
