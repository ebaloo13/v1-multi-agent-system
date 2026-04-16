import type { IntakeDraft } from './product-shell'

type LooseSearch = Record<string, unknown>

export type WorkflowSearch = {
  client?: string
  url?: string
}

export type WorkflowStageStatus = {
  label: string
  detail: string
  tone: 'success' | 'progress' | 'pending'
}

export type WorkspaceSummaryCard = {
  label: string
  value: string
  detail: string
}

export type WorkspaceSectionId = 'dashboard' | 'diagnosis' | 'workstreams' | 'agents'
export type DiagnosisPanelId = 'overview' | 'preaudit' | 'intake' | 'audit'

export type WorkspaceClient = {
  clientSlug: string
  clientName: string
  website: string
  email?: string
}

export type WorkspaceArtifactSummary = {
  label: string
  value: string
  detail: string
  href?: string
  tone: 'success' | 'progress' | 'pending' | 'neutral'
}

export type WorkspaceWorkstream = {
  title: string
  whyItMatters: string
  status: 'identified' | 'needs input' | 'ready for design' | 'active' | 'blocked' | 'complete'
  tone: 'success' | 'progress' | 'pending' | 'neutral'
  linkedSource: string
  suggestedNextStep: string
  suggestedAgent?: string
}

export type WorkspaceAgent = {
  slug: string
  label: string
  role: string
  status: 'not relevant' | 'candidate' | 'recommended' | 'setup needed' | 'ready' | 'active'
  tone: 'success' | 'progress' | 'pending' | 'neutral'
  linkedWorkstream: string
  currentRelevance: string
  requiredInputs: string[]
  potentialOutput: string
}

export type WorkspaceDashboardView = WorkspaceClient & {
  currentStage: string
  currentStageDetail: string
  preauditStatus: WorkflowStageStatus
  intakeStatus: WorkflowStageStatus
  auditStatus: WorkflowStageStatus
  quickSummary: WorkspaceSummaryCard[]
  focusAreas: string[]
  workflowStatus: Array<{
    label: string
    status: WorkflowStageStatus
    detail: string
  }>
  workstreams: WorkspaceWorkstream[]
  agents: WorkspaceAgent[]
  artifacts: WorkspaceArtifactSummary[]
  keyFacts: Array<{
    label: string
    value: string
  }>
  accountReadiness: Array<{
    label: string
    value: string
    detail: string
  }>
  efficiencySignals: Array<{
    label: 'Leak' | 'Gain'
    title: string
    detail: string
  }>
  recommendedNextSection: WorkspaceSectionId
  recommendedNextLabel: string
  recommendedNextDetail: string
}

export type WorkspaceDiagnosisView = WorkspaceDashboardView & {
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
}

export type WorkspaceWorkstreamsView = WorkspaceDashboardView & {
  latestOutputs: WorkspaceArtifactSummary[]
}

export type WorkspaceAgentsView = WorkspaceDashboardView & {
  latestOutputs: WorkspaceArtifactSummary[]
}

export type PreauditView = WorkspaceClient & {
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

export type AuditIntakeView = WorkspaceClient & {
  source: 'draft' | 'saved'
  draftPath: string
  intakePath: string
  availableAssets: string[]
  trackingMarkers: string[]
  todo: string[]
  form: IntakeDraft
}

export type AuditView = WorkspaceClient & {
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
