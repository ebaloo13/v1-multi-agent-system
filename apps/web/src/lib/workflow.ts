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

export type WorkspaceSectionId =
  | 'dashboard'
  | 'diagnosis'
  | 'workstreams'
  | 'agents'
  | 'impact'
  | 'activity'
export type DiagnosisPanelId = 'overview' | 'preaudit' | 'intake' | 'audit'

export type ClientLifecycleState =
  | 'lead'
  | 'preaudit_completed'
  | 'business_context_ready'
  | 'audit_completed'

export type WorkspaceClientSummary = {
  id: string
  slug: string
  name: string
  clientSlug: string
  clientName: string
  website: string
  email?: string
  primaryLifecycleState: ClientLifecycleState
  source: 'workspace_file' | 'derived'
  createdAt?: string
  updatedAt?: string
}

export type WorkspaceClient = WorkspaceClientSummary

export type WorkspaceClientContextSummary = {
  id: string
  clientId: string
  status: 'missing' | 'draft' | 'saved'
  source: 'legacy_intake_file' | 'derived'
  sourcePath?: string
  draftPath?: string
  updatedAt?: string
  availableAssets: string[]
  trackingMarkers: string[]
  todo: string[]
  form: IntakeDraft
}

export type WorkspaceRunSummary = {
  id: string
  clientId: string
  runType: 'preaudit' | 'audit'
  status: 'missing' | 'completed'
  displayRunId?: string
  runId?: string
  storagePath?: string
  runJsonPath?: string
  outputPath?: string
  updatedAt?: string
}

export type WorkspaceOutputSummary = {
  id: string
  clientId: string
  outputType: 'preaudit_report' | 'business_context' | 'audit_output'
  sourceEntity: 'workflow_run' | 'client_context'
  internalArtifactPath?: string
  runId?: string
  label: string
  value: string
  detail: string
  href?: string
  tone: 'success' | 'progress' | 'pending' | 'neutral'
}

export type WorkspaceArtifactSummary = WorkspaceOutputSummary

export type WorkstreamEntityState =
  | 'identified'
  | 'needs_input'
  | 'ready_for_design'
  | 'ready_to_activate'
  | 'active'
  | 'blocked'
  | 'completed'
  | 'archived'

export type WorkspaceWorkstreamSummary = {
  id: string
  clientId: string
  type: 'website_improvement' | 'sales_follow_up' | 'market_study' | 'crm_back_office_review' | 'general'
  state: WorkstreamEntityState
  priority: 'high' | 'medium' | 'low'
  title: string
  whyItMatters: string
  status: 'identified' | 'needs input' | 'ready for design' | 'active' | 'blocked' | 'complete'
  tone: 'success' | 'progress' | 'pending' | 'neutral'
  linkedSource: string
  suggestedNextStep: string
  suggestedAgent?: string
}

export type WorkspaceWorkstream = WorkspaceWorkstreamSummary

export type ClientAgentEntityState =
  | 'not_relevant'
  | 'candidate'
  | 'recommended'
  | 'setup_needed'
  | 'ready'
  | 'active'
  | 'paused'
  | 'retired'

export type WorkspaceClientAgentSummary = {
  id: string
  clientId: string
  agentKey: string
  state: ClientAgentEntityState
  linkedWorkstreamId?: string
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

export type WorkspaceAgent = WorkspaceClientAgentSummary

export type WorkspaceEventSummary = {
  id: string
  clientId: string
  type:
    | 'client_state_changed'
    | 'preaudit_completed'
    | 'business_context_saved'
    | 'business_context_draft_ready'
    | 'audit_completed'
    | 'next_action_updated'
  category: 'lifecycle' | 'workflow' | 'client_input'
  visibility: 'client' | 'internal' | 'both'
  severity: 'info' | 'warning'
  label: string
  detail: string
  createdAt?: string
}

export type WorkspaceActivityType =
  | 'preaudit_completed'
  | 'business_context_saved'
  | 'audit_completed'
  | 'workstream_created'
  | 'workstream_activated'
  | 'agent_recommended'
  | 'new_output_available'
  | 'next_step_updated'

export type WorkspaceActivityRelatedEntityType =
  | 'workspace'
  | 'diagnosis'
  | 'business_context'
  | 'audit'
  | 'workstream'
  | 'agent'
  | 'output'

export type WorkspaceActivityItem = {
  id: string
  type: WorkspaceActivityType
  title: string
  description: string
  timestamp: string
  relatedEntityType?: WorkspaceActivityRelatedEntityType
  relatedEntityLabel?: string
  ctaLabel?: string
  ctaHref?: string
}

export type WorkspaceImpactCategory =
  | 'growth_leaks'
  | 'workflow_friction'
  | 'visibility_gains'
  | 'agent_supported_progress'
  | 'outputs_enabling_action'
  | 'needs_attention'

export type WorkspaceImpactState =
  | 'identified'
  | 'unlocking'
  | 'observed'
  | 'needs_attention'

export type WorkspaceImpactRelatedEntityType =
  | 'diagnosis'
  | 'business_context'
  | 'audit'
  | 'workstream'
  | 'agent'
  | 'output'
  | 'workspace'

export type WorkspaceImpactItem = {
  id: string
  category: WorkspaceImpactCategory
  title: string
  description: string
  impactState: WorkspaceImpactState
  relatedEntityType?: WorkspaceImpactRelatedEntityType
  relatedEntityLabel?: string
  ctaLabel?: string
  ctaHref?: string
}

export type WorkspaceDashboardView = WorkspaceClient & {
  currentStage: string
  currentStageDetail: string
  client: WorkspaceClientSummary
  clientContext?: WorkspaceClientContextSummary
  workflowRuns: WorkspaceRunSummary[]
  outputs: WorkspaceOutputSummary[]
  events: WorkspaceEventSummary[]
  activity: WorkspaceActivityItem[]
  impact: WorkspaceImpactItem[]
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

export type WorkspaceActivityView = WorkspaceDashboardView
export type WorkspaceImpactView = WorkspaceDashboardView

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
