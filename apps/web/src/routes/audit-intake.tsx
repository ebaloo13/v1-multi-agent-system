import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'
import { getAuditIntakeView } from '../lib/workflow.functions'
import { normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/audit-intake')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getAuditIntakeView({
      data: deps,
    }),
  component: LegacyIntakeRedirect,
})

function LegacyIntakeRedirect() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({
      to: '/workspace/$clientSlug/intake',
      params: {
        clientSlug: data.clientSlug,
      },
      replace: true,
    })
  }, [data.clientSlug, navigate])

  return <LegacyRedirectNotice label="workspace Business Context" />
}
