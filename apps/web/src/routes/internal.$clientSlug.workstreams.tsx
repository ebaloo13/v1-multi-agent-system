import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceWorkstreams } from '../lib/workflow.functions'
import {
  WorkspaceWorkstreamsView,
  type WorkspaceWorkstreamsData,
} from './workspace.$clientSlug.workstreams'

export const Route = createFileRoute('/internal/$clientSlug/workstreams')({
  loader: ({ params }) =>
    getWorkspaceWorkstreams({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalWorkstreamsPage,
})

function InternalWorkstreamsPage() {
  const data = Route.useLoaderData()

  return <WorkspaceWorkstreamsView data={data as WorkspaceWorkstreamsData} routeScope="internal" />
}
