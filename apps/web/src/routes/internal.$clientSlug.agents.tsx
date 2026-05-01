import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceAgents } from '../lib/workflow.functions'
import { WorkspaceAgentsView, type WorkspaceAgentsData } from './workspace.$clientSlug.agents'

export const Route = createFileRoute('/internal/$clientSlug/agents')({
  loader: ({ params }) =>
    getWorkspaceAgents({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalAgentsPage,
})

function InternalAgentsPage() {
  const data = Route.useLoaderData()

  return <WorkspaceAgentsView data={data as WorkspaceAgentsData} routeScope="internal" />
}
