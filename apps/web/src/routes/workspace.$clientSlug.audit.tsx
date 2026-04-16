import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/audit')({
  component: LegacyWorkspaceAuditRedirect,
})

function LegacyWorkspaceAuditRedirect() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/workspace/$clientSlug/diagnosis',
      params: {
        clientSlug,
      },
      search: {
        panel: 'audit',
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="workspace diagnosis" />
}
