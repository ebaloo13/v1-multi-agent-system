import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/review')({
  component: ReviewQueuePage,
})

function ReviewQueuePage() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/internal/$clientSlug/review',
      params: {
        clientSlug,
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="internal review queue" />
}
