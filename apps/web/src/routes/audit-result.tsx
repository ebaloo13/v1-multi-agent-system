import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'
import { getAuditView } from '../lib/workflow.functions'
import { normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/audit-result')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getAuditView({
      data: deps,
    }),
  component: LegacyAuditRedirect,
})

function LegacyAuditRedirect() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()

  useEffect(() => {
    void navigate({
      to: '/workspace/$clientSlug/audit',
      params: {
        clientSlug: data.clientSlug,
      },
      replace: true,
    })
  }, [data.clientSlug, navigate])

  return <LegacyRedirectNotice label="workspace audit" />
}
