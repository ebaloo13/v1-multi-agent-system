import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceDiagnosis } from '../lib/workflow.functions'
import {
  WorkspaceDiagnosisView,
  validateDiagnosisSearch,
  type WorkspaceDiagnosisData,
} from './workspace.$clientSlug.diagnosis'

export const Route = createFileRoute('/internal/$clientSlug/diagnosis')({
  validateSearch: validateDiagnosisSearch,
  loader: ({ params }) =>
    getWorkspaceDiagnosis({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalDiagnosisPage,
})

function InternalDiagnosisPage() {
  const data = Route.useLoaderData()
  const { panel } = Route.useSearch()

  return <WorkspaceDiagnosisView data={data as WorkspaceDiagnosisData} panel={panel} routeScope="internal" />
}
