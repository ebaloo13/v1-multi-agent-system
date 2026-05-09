import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LegacyRedirectNotice } from '../components/LegacyRedirectNotice'

export const Route = createFileRoute('/workspace/$clientSlug/agent-board')({
  component: AgentBoardPage,
})

function AgentBoardPage() {
  const navigate = useNavigate()
  const { clientSlug } = Route.useParams()

  useEffect(() => {
    void navigate({
      to: '/internal/$clientSlug/agent-board',
      params: {
        clientSlug,
      },
      replace: true,
    })
  }, [clientSlug, navigate])

  return <LegacyRedirectNotice label="internal agent board" />
}
