import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'
import { getPreauditView } from '../lib/workflow.functions'
import { normalizeWorkflowSearch } from '../lib/workflow'

export const Route = createFileRoute('/preaudit-result')({
  validateSearch: normalizeWorkflowSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    getPreauditView({
      data: deps,
    }),
  component: LegacyPreauditRedirect,
})

function LegacyPreauditRedirect() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()

  useEffect(() => {
    void navigate({
      to: '/workspace/$clientSlug/preaudit',
      params: {
        clientSlug: data.clientSlug,
      },
      replace: true,
    })
  }, [data.clientSlug, navigate])

  return <LegacyRedirectNotice label="preaudit workspace" />
}
