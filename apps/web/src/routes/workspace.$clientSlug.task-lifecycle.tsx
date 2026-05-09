import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/task-lifecycle')({
  component: TaskLifecyclePage,
})

function TaskLifecyclePage() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/internal/$clientSlug/task-lifecycle',
      params: {
        clientSlug,
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="internal task lifecycle" />
}
