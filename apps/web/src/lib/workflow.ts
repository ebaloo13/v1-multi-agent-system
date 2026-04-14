import type { IntakeDraft } from './product-shell'

type LooseSearch = Record<string, unknown>

export type WorkflowSearch = {
  client?: string
  url?: string
}

export type PreauditView = {
  clientSlug: string
  website: string
  displayRunId: string
  reportPath: string
  draftPath: string
  companySummary: string
  summary: string
  scores: Array<{
    label: string
    score: number
  }>
  businessImpact: string[]
  quickWins: string[]
  priorityAlerts: string[]
}

export type AuditIntakeView = {
  clientSlug: string
  website: string
  source: 'draft' | 'saved'
  draftPath: string
  intakePath: string
  availableAssets: string[]
  trackingMarkers: string[]
  todo: string[]
  form: IntakeDraft
}

export type AuditView = {
  clientSlug: string
  website: string
  displayRunId: string
  intakePath?: string
  companySummary: string
  industry: string
  mainPains: string[]
  availableData: string[]
  recommendedAgents: string[]
  priorityOrder: string[]
  notes: string
}

export function normalizeWorkflowSearch(search: LooseSearch): WorkflowSearch {
  const client =
    typeof search.client === 'string' && search.client.trim().length > 0
      ? search.client.trim()
      : undefined
  const url =
    typeof search.url === 'string' && search.url.trim().length > 0
      ? search.url.trim()
      : undefined

  return {
    client,
    url,
  }
}

export function formatAgentLabel(agent: string) {
  return agent
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
