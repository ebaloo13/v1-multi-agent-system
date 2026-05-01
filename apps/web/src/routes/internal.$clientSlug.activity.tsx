import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceActivity } from '../lib/workflow.functions'
import { WorkspaceActivityView, type WorkspaceActivityData } from './workspace.$clientSlug.activity'

export const Route = createFileRoute('/internal/$clientSlug/activity')({
  loader: ({ params }) =>
    getWorkspaceActivity({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalActivityPage,
})

function InternalActivityPage() {
  const data = Route.useLoaderData()

  return <WorkspaceActivityView data={data as WorkspaceActivityData} routeScope="internal" />
}
