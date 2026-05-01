import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceImpact } from '../lib/workflow.functions'
import { WorkspaceImpactView, type WorkspaceImpactData } from './workspace.$clientSlug.impact'

export const Route = createFileRoute('/internal/$clientSlug/impact')({
  loader: ({ params }) =>
    getWorkspaceImpact({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalImpactPage,
})

function InternalImpactPage() {
  const data = Route.useLoaderData()

  return <WorkspaceImpactView data={data as WorkspaceImpactData} routeScope="internal" />
}
