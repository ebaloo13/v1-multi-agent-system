import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/intake')({
  component: LegacyWorkspaceIntakeRedirect,
})

function LegacyWorkspaceIntakeRedirect() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/workspace/$clientSlug/diagnosis',
      params: {
        clientSlug,
      },
      search: {
        panel: 'intake',
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="workspace diagnosis" />
}
