import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/artifacts')({
  component: ArtifactsPage,
})

function ArtifactsPage() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/internal/$clientSlug/artifacts',
      params: {
        clientSlug,
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="internal artifacts" />
}
