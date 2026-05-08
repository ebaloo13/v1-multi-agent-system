import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type {
  AuditIntakeView,
  AuditView,
  ClientAgentEntityState,
  ClientLifecycleState,
  WorkspaceActivityItem,
  WorkspaceActivityView,
  WorkspaceAgent,
  WorkspaceAgentsView,
  WorkspaceArtifactSummary,
  WorkspaceClientContextSummary,
  WorkspaceDashboardView,
  WorkspaceDiagnosisView,
  WorkspaceEventSummary,
  WorkspaceImpactItem,
  WorkspaceImpactView,
  WorkspaceOutputSummary,
  WorkspaceReadinessGroup,
  WorkspaceReadinessItem,
  WorkspaceReadinessStatus,
  WorkspaceReadinessSummary,
  WorkspaceRunSummary,
  WorkspaceSectionId,
  WorkspaceWorkstream,
  WorkspaceWorkstreamsView,
  WorkstreamEntityState,
  PreauditView,
  WorkspaceClient,
  WorkflowSearch,
} from './workflow'
import {
  DEFAULT_WEBSITE,
  formatClientName,
  type IntakeDraft,
  normalizeWebsite,
  workspaceDiagnosisHref,
  workspaceHref,
} from './product-shell'
import {
  readJsonIfExists,
  readMtimeIsoIfExists,
  readMtimeMsIfExists,
} from './workflow-file-readers.server'
import {
  REPO_ROOT,
  clientArtifactPath,
  clientsDataDir,
  intakeDraftPath,
  intakePath,
} from './workflow-paths.server'
import {
  findLatestClientSlugForAgent,
  readLatestPointer,
  readLatestPointerIfExists,
  type LatestPointer,
} from './workflow-latest-pointers.server'
import {
  readAuditRun,
  readPreauditRun,
  type PreauditRunJson,
} from './workflow-artifact-readers.server'
import { readClientContext, saveClientContext } from './workflow-client-context.server'

type AuditIntakeFile = {
  company_profile?: {
    name?: string
    industry?: string
    business_model?: string
    location?: string
  }
  business_goals?: string[]
  known_pains?: string[]
  available_assets?: string[]
  available_systems?: string[]
  sales_notes?: string
  operations_notes?: string
  notes?: string
  _autofilled_from_preaudit?: {
    website?: string
    tracking_markers?: {
      ga4_detected?: boolean
      gtm_detected?: boolean
      meta_pixel_detected?: boolean
      linkedin_insight_detected?: boolean
      other_markers?: string[]
    }
  }
  _todo?: string[]
  _web_ui?: Partial<IntakeDraft>
}

const DOMAIN_SUFFIX_HINTS = [
  'propiedades',
  'properties',
  'realty',
  'dental',
  'clinic',
  'group',
  'studio',
  'studios',
  'homes',
] as const

function normalizeSlugParts(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
}

function slugifyClientName(value: string) {
  const parts = normalizeSlugParts(value)
  return parts.length > 0 ? parts.join('-') : 'generic-client'
}

function slugifyHostnameLabel(hostname: string) {
  const baseLabel = hostname.toLowerCase().replace(/^www\./, '').split('.')[0] ?? hostname

  for (const hint of DOMAIN_SUFFIX_HINTS) {
    if (baseLabel.endsWith(hint) && baseLabel.length > hint.length) {
      const prefix = baseLabel.slice(0, baseLabel.length - hint.length)
      return slugifyClientName(`${prefix} ${hint}`)
    }
  }

  return slugifyClientName(baseLabel)
}

function clientEntityId(clientSlug: string) {
  return `client:${clientSlug}`
}

function workflowRunEntityId(clientSlug: string, runType: 'preaudit' | 'audit') {
  return `workflow_run:${clientSlug}:${runType}`
}

function outputEntityId(clientSlug: string, outputType: WorkspaceOutputSummary['outputType']) {
  return `output:${clientSlug}:${outputType}`
}

function workstreamEntityId(clientSlug: string, title: string) {
  return `workstream:${clientSlug}:${slugifyClientName(title)}`
}

function clientAgentEntityId(clientSlug: string, agentKey: string) {
  return `client_agent:${clientSlug}:${agentKey}`
}

async function ensureDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function runCommand(command: string, args: string[]) {

  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      const tail = `${stdout}\n${stderr}`.trim().split('\n').slice(-20).join('\n')
      reject(new Error(`Command failed with exit code ${code}.\n${tail}`.trim()))
    })
  })
}

async function runRepoNodeScript(scriptPath: string, args: string[]) {
  return runCommand(process.execPath, ['--import', 'tsx/esm', scriptPath, ...args])
}

function parseList(value: string) {
  return value
    .split(/\n|,|;/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, list) => list.indexOf(entry) === index)
}

function joinList(values: string[] | undefined) {
  return (values ?? []).join('\n')
}

function compactLines(values: Array<string | undefined>) {
  return values.map((value) => value?.trim() ?? '').filter(Boolean)
}

function parseSection(markdown: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(
    new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?:\\n---\\n|\\n## |$)`),
  )

  return match?.[1]?.trim() ?? ''
}

function parseSectionBullets(markdown: string, heading: string) {
  const body = parseSection(markdown, heading)
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
}

function parseSectionParagraph(markdown: string, heading: string) {
  return parseSection(markdown, heading)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('- '))
    .join(' ')
    .trim()
}

function normalizeTrackingMarkerList(trackingMarkers: AuditIntakeFile['_autofilled_from_preaudit'] extends {
  tracking_markers?: infer T
}
  ? T
  : never) {
  if (!trackingMarkers) {
    return []
  }

  const items: string[] = []

  if (trackingMarkers.ga4_detected) items.push('GA4')
  if (trackingMarkers.gtm_detected) items.push('GTM')
  if (trackingMarkers.meta_pixel_detected) items.push('Meta Pixel')
  if (trackingMarkers.linkedin_insight_detected) items.push('LinkedIn Insight')
  items.push(...(trackingMarkers.other_markers ?? []))

  return items
}

function maybeUrlFromSearch(url?: string) {
  return url ? normalizeWebsite(url) : DEFAULT_WEBSITE
}

function normalizeEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address before running the preaudit.')
  }

  return email
}

function deriveClientName(clientSlug: string, sources: Array<string | undefined>) {
  for (const source of sources) {
    const normalized = source?.trim()
    if (normalized) {
      return normalized
    }
  }

  return formatClientName(clientSlug)
}

async function findLatestIntakeClientSlug() {
  const files = await fs.readdir(clientsDataDir(), { withFileTypes: true }).catch(() => [])
  let latest: { slug: string; mtimeMs: number } | undefined

  for (const file of files) {
    if (!file.isFile()) {
      continue
    }

    const match = file.name.match(/^(.*)-audit-intake(?:\.draft)?\.json$/)
    if (!match?.[1]) {
      continue
    }

    const fullPath = path.join(clientsDataDir(), file.name)
    const stats = await fs.stat(fullPath).catch(() => undefined)
    if (!stats) {
      continue
    }

    if (!latest || stats.mtimeMs > latest.mtimeMs) {
      latest = { slug: match[1], mtimeMs: stats.mtimeMs }
    }
  }

  return latest?.slug
}

async function resolveClientSlug(search: WorkflowSearch, preferred: 'preaudit' | 'audit' | 'intake') {
  if (search.client) {
    return slugifyClientName(search.client)
  }

  if (search.url) {
    return slugifyHostnameLabel(new URL(normalizeWebsite(search.url)).hostname)
  }

  if (preferred === 'intake') {
    return (
      (await findLatestIntakeClientSlug()) ??
      (await findLatestClientSlugForAgent('preaudit')) ??
      'generic-client'
    )
  }

  return (await findLatestClientSlugForAgent(preferred)) ?? 'generic-client'
}

async function deriveWebsiteFromPreaudit(runJson: PreauditRunJson, clientSlug: string) {
  const draft = await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug))
  const fromDraft = draft?._autofilled_from_preaudit?.website?.trim()
  if (fromDraft) {
    return fromDraft
  }

  if (!runJson.preaudit_data_path) {
    return DEFAULT_WEBSITE
  }

  const payload = await readJsonIfExists<Array<{ website?: string; extracted_context?: { url?: string } }>>(
    runJson.preaudit_data_path,
  )
  const index = typeof runJson.preaudit_record_index === 'number' ? runJson.preaudit_record_index : 0
  const record = payload?.[index]

  return record?.extracted_context?.url ?? record?.website ?? DEFAULT_WEBSITE
}

async function buildWorkspaceClient(
  clientSlug: string,
  options?: {
    website?: string
    draft?: AuditIntakeFile
    saved?: AuditIntakeFile
  },
): Promise<WorkspaceClient> {
  const context = await readClientContext(clientSlug)
  const saved = options?.saved ?? (await readJsonIfExists<AuditIntakeFile>(intakePath(clientSlug)))
  const draft =
    options?.draft ?? (await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug)))
  const website = maybeUrlFromSearch(
    options?.website ??
      context?.website ??
      saved?._autofilled_from_preaudit?.website ??
      draft?._autofilled_from_preaudit?.website,
  )
  const clientName = deriveClientName(clientSlug, [
    saved?.company_profile?.name,
    draft?.company_profile?.name,
    context?.client_name,
  ])
  const clientId = clientEntityId(clientSlug)

  return {
    id: clientId,
    slug: clientSlug,
    name: clientName,
    clientSlug,
    clientName,
    website,
    email: context?.email,
    primaryLifecycleState: 'lead',
    source: context ? 'workspace_file' : 'derived',
    createdAt: context?.created_at,
    updatedAt: context?.updated_at,
  }
}

function buildStageStatus(
  label: string,
  detail: string,
  tone: 'success' | 'progress' | 'pending',
) {
  return { label, detail, tone }
}

function toneFromWorkstreamStatus(
  status: WorkspaceWorkstream['status'],
): WorkspaceWorkstream['tone'] {
  switch (status) {
    case 'complete':
      return 'success'
    case 'active':
    case 'ready for design':
      return 'progress'
    case 'blocked':
    case 'needs input':
      return 'pending'
    default:
      return 'neutral'
  }
}

function toneFromAgentStatus(status: WorkspaceAgent['status']): WorkspaceAgent['tone'] {
  switch (status) {
    case 'active':
    case 'ready':
      return 'success'
    case 'recommended':
    case 'candidate':
      return 'progress'
    case 'setup needed':
      return 'pending'
    default:
      return 'neutral'
  }
}

function clientLifecycleFromStage(currentStage: string): ClientLifecycleState {
  switch (currentStage) {
    case 'Audit completed':
      return 'audit_completed'
    case 'Business Context ready':
      return 'business_context_ready'
    case 'Preaudit completed':
      return 'preaudit_completed'
    default:
      return 'lead'
  }
}

function workstreamTypeFromTitle(title: string): WorkspaceWorkstream['type'] {
  switch (title) {
    case 'Website improvement':
      return 'website_improvement'
    case 'Sales follow-up':
      return 'sales_follow_up'
    case 'Market study':
      return 'market_study'
    case 'CRM / back-office review':
      return 'crm_back_office_review'
    default:
      return 'general'
  }
}

function workstreamStateFromStatus(status: WorkspaceWorkstream['status']): WorkstreamEntityState {
  switch (status) {
    case 'needs input':
      return 'needs_input'
    case 'ready for design':
      return 'ready_for_design'
    case 'active':
      return 'active'
    case 'blocked':
      return 'blocked'
    case 'complete':
      return 'completed'
    default:
      return 'identified'
  }
}

function workstreamPriorityFromTitle(title: string): WorkspaceWorkstream['priority'] {
  switch (title) {
    case 'Website improvement':
    case 'Sales follow-up':
      return 'high'
    case 'CRM / back-office review':
      return 'medium'
    default:
      return 'low'
  }
}

function agentStateFromStatus(status: WorkspaceAgent['status']): ClientAgentEntityState {
  switch (status) {
    case 'not relevant':
      return 'not_relevant'
    case 'setup needed':
      return 'setup_needed'
    case 'candidate':
    case 'recommended':
    case 'ready':
    case 'active':
      return status
    default:
      return 'candidate'
  }
}

function hasReadinessValue(value: string | undefined) {
  return Boolean(value?.trim())
}

function buildReadinessItem(options: WorkspaceReadinessItem): WorkspaceReadinessItem {
  return options
}

function readinessGroupStatus(items: WorkspaceReadinessItem[]): WorkspaceReadinessStatus {
  if (items.length > 0 && items.every((item) => item.status === 'not_applicable')) {
    return 'not_applicable'
  }

  if (items.some((item) => item.status === 'blocked')) {
    return 'blocked'
  }

  if (items.some((item) => item.status === 'missing')) {
    return 'missing'
  }

  return 'confirmed'
}

function readinessSummary(label: string, status: WorkspaceReadinessStatus) {
  switch (status) {
    case 'confirmed':
      return `${label} has the required inputs for the next step.`
    case 'missing':
      return `${label} has partial context. The missing items should be confirmed before activation.`
    case 'blocked':
      return `${label} is blocked by an earlier workflow dependency.`
    case 'not_applicable':
      return `${label} is not relevant for the current diagnosis.`
  }
}

function buildReadinessGroup(options: {
  id: string
  area: WorkspaceReadinessGroup['area']
  label: string
  items: WorkspaceReadinessItem[]
  summary?: string
  ctaLabel?: string
  ctaHref?: string
}): WorkspaceReadinessGroup {
  const status = readinessGroupStatus(options.items)

  return {
    id: options.id,
    area: options.area,
    label: options.label,
    status,
    summary: options.summary ?? readinessSummary(options.label, status),
    items: options.items,
    ctaLabel: options.ctaLabel,
    ctaHref: options.ctaHref,
  }
}

function intakeFieldItem(options: {
  clientSlug: string
  intake?: AuditIntakeView
  id: string
  label: string
  value?: string
  reasonWhenConfirmed: string
  reasonWhenMissing: string
  reasonWhenBlocked?: string
}): WorkspaceReadinessItem {
  const { clientSlug, intake, id, label, value, reasonWhenConfirmed, reasonWhenMissing, reasonWhenBlocked } =
    options

  if (!intake) {
    return buildReadinessItem({
      id,
      label,
      status: 'blocked',
      reason: reasonWhenBlocked ?? 'Business Context is needed before this input can be confirmed.',
      ctaLabel: 'Open Business Context',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'intake'),
    })
  }

  if (hasReadinessValue(value)) {
    return buildReadinessItem({
      id,
      label,
      status: 'confirmed',
      reason: reasonWhenConfirmed,
    })
  }

  return buildReadinessItem({
    id,
    label,
    status: 'missing',
    reason: reasonWhenMissing,
    ctaLabel: 'Complete Business Context',
    ctaHref: workspaceDiagnosisHref(clientSlug, 'intake'),
  })
}

function buildAuditReadiness(options: {
  clientSlug: string
  preaudit?: PreauditView
  intake?: AuditIntakeView
  auditIsCurrent: boolean
}): WorkspaceReadinessGroup {
  const { clientSlug, preaudit, intake, auditIsCurrent } = options
  const items: WorkspaceReadinessItem[] = [
    buildReadinessItem({
      id: 'preaudit-output',
      label: 'Preaudit output',
      status: preaudit ? 'confirmed' : 'blocked',
      reason: preaudit
        ? 'The public-site diagnostic is available.'
        : 'Run the preaudit before the deeper audit can be prepared.',
      ctaLabel: preaudit ? undefined : 'Open Diagnosis',
      ctaHref: preaudit ? undefined : workspaceDiagnosisHref(clientSlug, 'preaudit'),
    }),
    buildReadinessItem({
      id: 'business-context-record',
      label: 'Business Context record',
      status: intake ? 'confirmed' : preaudit ? 'missing' : 'blocked',
      reason: intake
        ? intake.source === 'saved'
          ? 'Business Context has been saved locally.'
          : 'A Business Context draft exists and can be reviewed.'
        : preaudit
          ? 'Business Context is still missing.'
          : 'Business Context should follow the preaudit.',
      ctaLabel: intake ? undefined : 'Open Business Context',
      ctaHref: intake ? undefined : workspaceDiagnosisHref(clientSlug, 'intake'),
    }),
    intakeFieldItem({
      clientSlug,
      intake,
      id: 'business-goals',
      label: 'Business goals',
      value: intake?.form.primaryGoal,
      reasonWhenConfirmed: 'The first business outcome is stated.',
      reasonWhenMissing: 'The audit needs a primary outcome to optimize for.',
    }),
    intakeFieldItem({
      clientSlug,
      intake,
      id: 'known-pains',
      label: 'Known pains',
      value: [intake?.form.currentPains, intake?.form.mostUrgentPain].filter(Boolean).join('\n'),
      reasonWhenConfirmed: 'Current pains are available for prioritization.',
      reasonWhenMissing: 'The audit needs client-confirmed pains before recommendations are useful.',
    }),
    intakeFieldItem({
      clientSlug,
      intake,
      id: 'systems-in-use',
      label: 'Systems in use',
      value: intake?.form.systems,
      reasonWhenConfirmed: 'Current tools and systems are documented.',
      reasonWhenMissing: 'The audit needs to know which systems recommendations must fit around.',
    }),
    intakeFieldItem({
      clientSlug,
      intake,
      id: 'lead-process',
      label: 'Lead process',
      value: [intake?.form.leadSources, intake?.form.leadHandling].filter(Boolean).join('\n'),
      reasonWhenConfirmed: 'Lead sources and handling are visible.',
      reasonWhenMissing: 'Lead sources and handoff details are needed before sales or growth recommendations.',
    }),
    intakeFieldItem({
      clientSlug,
      intake,
      id: 'constraints',
      label: 'Constraints',
      value: intake?.form.constraints,
      reasonWhenConfirmed: 'Constraints are captured for realistic recommendations.',
      reasonWhenMissing: 'Constraints are needed so the audit does not overstate what can change next.',
    }),
  ]
  const missingCount = items.filter((item) => item.status === 'missing' || item.status === 'blocked').length

  return buildReadinessGroup({
    id: `readiness:${clientSlug}:audit`,
    area: 'audit',
    label: 'Audit readiness',
    items,
    summary: auditIsCurrent
      ? 'The audit output is current; these inputs now support workstream planning.'
      : missingCount === 0
        ? 'The required audit inputs are present. The next step can be the full audit.'
        : `${missingCount} audit input${missingCount === 1 ? '' : 's'} still need attention.`,
    ctaLabel: missingCount === 0 ? 'Open Audit' : 'Complete inputs',
    ctaHref: workspaceDiagnosisHref(clientSlug, missingCount === 0 ? 'audit' : 'intake'),
  })
}

function workstreamInputItems(options: {
  clientSlug: string
  title: string
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceReadinessItem[] {
  const { clientSlug, title, preaudit, intake, audit } = options
  const preauditItem = buildReadinessItem({
    id: 'preaudit-signal',
    label: 'Preaudit signal',
    status: preaudit ? 'confirmed' : 'blocked',
    reason: preaudit
      ? 'Initial public-site signal is available.'
      : 'The workstream needs the first diagnostic signal.',
    ctaLabel: preaudit ? undefined : 'Open preaudit',
    ctaHref: preaudit ? undefined : workspaceDiagnosisHref(clientSlug, 'preaudit'),
  })
  const auditItem = buildReadinessItem({
    id: 'audit-priorities',
    label: 'Audit priorities',
    status: audit ? 'confirmed' : 'missing',
    reason: audit
      ? 'Audit output is available to shape activation.'
      : 'The full audit will make activation priorities more reliable.',
    ctaLabel: audit ? undefined : 'Open audit',
    ctaHref: audit ? undefined : workspaceDiagnosisHref(clientSlug, 'audit'),
  })

  switch (title) {
    case 'Website improvement':
      return [
        preauditItem,
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'primary-goal',
          label: 'Primary goal',
          value: intake?.form.primaryGoal,
          reasonWhenConfirmed: 'Website work can align to a business outcome.',
          reasonWhenMissing: 'Confirm the first conversion or visibility outcome.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'tracking-context',
          label: 'Tracking context',
          value: intake?.trackingMarkers.join(', ') || intake?.form.systems,
          reasonWhenConfirmed: 'Measurement context is available.',
          reasonWhenMissing: 'Confirm tracking markers or systems before activation.',
        }),
        auditItem,
      ]
    case 'Sales follow-up':
      return [
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'lead-sources',
          label: 'Lead sources',
          value: intake?.form.leadSources,
          reasonWhenConfirmed: 'Lead sources are documented.',
          reasonWhenMissing: 'Confirm where inquiries come from.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'lead-handling',
          label: 'Lead handling',
          value: intake?.form.leadHandling,
          reasonWhenConfirmed: 'Current handoff is documented.',
          reasonWhenMissing: 'Confirm who responds and how follow-up works.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'response-time',
          label: 'Response time',
          value: intake?.form.responseTime,
          reasonWhenConfirmed: 'Response expectations are visible.',
          reasonWhenMissing: 'Add approximate response time if known.',
        }),
        auditItem,
      ]
    case 'Market study':
      return [
        preauditItem,
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'primary-market',
          label: 'Primary market',
          value: intake?.form.primaryMarket,
          reasonWhenConfirmed: 'Market scope is available.',
          reasonWhenMissing: 'Confirm the market or geography before research activation.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'business-goal',
          label: 'Business goal',
          value: intake?.form.primaryGoal,
          reasonWhenConfirmed: 'Research can anchor to the desired outcome.',
          reasonWhenMissing: 'Confirm the outcome research should support.',
        }),
      ]
    case 'CRM / back-office review':
      return [
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'systems',
          label: 'Systems',
          value: intake?.form.systems,
          reasonWhenConfirmed: 'Current tools are documented.',
          reasonWhenMissing: 'Confirm the systems currently in use.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'source-of-truth',
          label: 'Source of truth',
          value: intake?.form.sourceOfTruth || intake?.form.systems,
          reasonWhenConfirmed: 'The main operating record is visible.',
          reasonWhenMissing: 'Confirm where the team tracks truth today.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'constraints',
          label: 'Constraints',
          value: intake?.form.constraints,
          reasonWhenConfirmed: 'Operational constraints are captured.',
          reasonWhenMissing: 'Confirm constraints before process recommendations.',
        }),
        auditItem,
      ]
    default:
      return [
        preauditItem,
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'primary-goal',
          label: 'Primary goal',
          value: intake?.form.primaryGoal,
          reasonWhenConfirmed: 'The workstream has a clear outcome.',
          reasonWhenMissing: 'Confirm the outcome this track should support.',
        }),
        intakeFieldItem({
          clientSlug,
          intake,
          id: 'known-pains',
          label: 'Known pains',
          value: intake?.form.currentPains,
          reasonWhenConfirmed: 'Current pains are documented.',
          reasonWhenMissing: 'Confirm the client pain this workstream should address.',
        }),
      ]
  }
}

function buildWorkstreamReadiness(options: {
  clientSlug: string
  title: string
  status: WorkspaceWorkstream['status']
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceReadinessGroup {
  const { clientSlug, title, status, preaudit, intake, audit } = options
  const items = workstreamInputItems({ clientSlug, title, preaudit, intake, audit })
  const group = buildReadinessGroup({
    id: `readiness:${clientSlug}:workstream:${slugifyClientName(title)}`,
    area: 'workstream_activation',
    label: `${title} readiness`,
    items,
    ctaLabel: 'Review Diagnosis',
    ctaHref: workspaceDiagnosisHref(clientSlug),
  })

  if (status === 'blocked') {
    return {
      ...group,
      status: 'blocked',
      summary: 'This workstream is blocked until earlier diagnosis steps are available.',
    }
  }

  if (status === 'active' || status === 'complete') {
    return {
      ...group,
      status: 'confirmed',
      summary: 'This workstream is already active or complete.',
    }
  }

  return group
}

function buildWorkstreamsReadiness(clientSlug: string, workstreams: WorkspaceWorkstream[]) {
  const readyCount = workstreams.filter((workstream) => workstream.readiness.status === 'confirmed').length
  const blockedCount = workstreams.filter((workstream) => workstream.readiness.status === 'blocked').length
  const missingCount = workstreams.filter((workstream) => workstream.readiness.status === 'missing').length
  const items = [
    buildReadinessItem({
      id: 'ready-workstreams',
      label: 'Ready workstreams',
      status: readyCount > 0 ? 'confirmed' : missingCount > 0 ? 'missing' : 'blocked',
      reason:
        readyCount > 0
          ? `${readyCount} workstream${readyCount === 1 ? '' : 's'} have enough context to progress.`
          : 'No workstreams have all required activation context yet.',
      ctaLabel: 'Open workstreams',
      ctaHref: workspaceHref(clientSlug, 'workstreams'),
    }),
    buildReadinessItem({
      id: 'missing-workstream-context',
      label: 'Missing activation context',
      status: missingCount === 0 ? 'confirmed' : 'missing',
      reason:
        missingCount === 0
          ? 'No workstreams have missing readiness inputs.'
          : `${missingCount} workstream${missingCount === 1 ? '' : 's'} still need more context.`,
      ctaLabel: missingCount === 0 ? undefined : 'Review inputs',
      ctaHref: missingCount === 0 ? undefined : workspaceHref(clientSlug, 'workstreams'),
    }),
    buildReadinessItem({
      id: 'blocked-workstreams',
      label: 'Blocked tracks',
      status: blockedCount === 0 ? 'confirmed' : 'blocked',
      reason:
        blockedCount === 0
          ? 'No workstreams are blocked by earlier workflow steps.'
          : `${blockedCount} workstream${blockedCount === 1 ? '' : 's'} are blocked by earlier workflow steps.`,
      ctaLabel: blockedCount === 0 ? undefined : 'Open Diagnosis',
      ctaHref: blockedCount === 0 ? undefined : workspaceDiagnosisHref(clientSlug),
    }),
  ]

  return buildReadinessGroup({
    id: `readiness:${clientSlug}:workstreams`,
    area: 'workstream_activation',
    label: 'Workstream readiness',
    items,
    summary:
      readyCount > 0
        ? `${readyCount} of ${workstreams.length} workstreams have enough context to progress.`
        : 'Workstreams are visible, but activation depends on more confirmed diagnosis context.',
    ctaLabel: 'Open workstreams',
    ctaHref: workspaceHref(clientSlug, 'workstreams'),
  })
}

function agentInputItem(options: {
  clientSlug: string
  intake?: AuditIntakeView
  id: string
  label: string
  value?: string
  reasonWhenConfirmed: string
  reasonWhenMissing: string
}): WorkspaceReadinessItem {
  return intakeFieldItem(options)
}

function agentReadinessItems(options: {
  clientSlug: string
  agent: Omit<WorkspaceAgent, 'id' | 'clientId' | 'agentKey' | 'state' | 'linkedWorkstreamId' | 'tone' | 'readiness'>
  linkedWorkstream?: WorkspaceWorkstream
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceReadinessItem[] {
  const { clientSlug, agent, linkedWorkstream, intake, audit } = options

  if (agent.status === 'not relevant') {
    return [
      buildReadinessItem({
        id: 'agent-relevance',
        label: 'Current relevance',
        status: 'not_applicable',
        reason: 'The current diagnosis does not point to this agent yet.',
      }),
    ]
  }

  const linkedWorkstreamItem = buildReadinessItem({
    id: 'linked-workstream',
    label: 'Linked workstream',
    status: linkedWorkstream
      ? linkedWorkstream.readiness.status === 'blocked'
        ? 'blocked'
        : linkedWorkstream.readiness.status === 'confirmed'
          ? 'confirmed'
          : 'missing'
      : 'missing',
    reason: linkedWorkstream
      ? linkedWorkstream.readiness.status === 'confirmed'
        ? `${linkedWorkstream.title} has enough context for activation.`
        : `${linkedWorkstream.title} still needs readiness inputs.`
      : 'No linked workstream is ready for this agent.',
    ctaLabel: 'Open workstreams',
    ctaHref: workspaceHref(clientSlug, 'workstreams'),
  })
  const auditItem = buildReadinessItem({
    id: 'audit-recommendation',
    label: 'Audit recommendation',
    status: audit
      ? ['recommended', 'ready', 'active'].includes(agent.status)
        ? 'confirmed'
        : 'missing'
      : 'blocked',
    reason: audit
      ? ['recommended', 'ready', 'active'].includes(agent.status)
        ? 'Audit output supports this agent.'
        : 'Audit output exists, but this agent is not a primary recommendation yet.'
      : 'Agent activation should wait for audit output.',
    ctaLabel: audit ? undefined : 'Open audit',
    ctaHref: audit ? undefined : workspaceDiagnosisHref(clientSlug, 'audit'),
  })

  switch (agent.slug) {
    case 'sales':
      return [
        linkedWorkstreamItem,
        auditItem,
        agentInputItem({
          clientSlug,
          intake,
          id: 'lead-sources',
          label: 'Lead sources',
          value: intake?.form.leadSources,
          reasonWhenConfirmed: 'Lead sources are known.',
          reasonWhenMissing: 'Confirm where leads originate.',
        }),
        agentInputItem({
          clientSlug,
          intake,
          id: 'lead-handling',
          label: 'Lead handling',
          value: intake?.form.leadHandling,
          reasonWhenConfirmed: 'Current handling process is known.',
          reasonWhenMissing: 'Confirm who responds and how follow-up works.',
        }),
        agentInputItem({
          clientSlug,
          intake,
          id: 'response-time',
          label: 'Response time',
          value: intake?.form.responseTime,
          reasonWhenConfirmed: 'Response speed is documented.',
          reasonWhenMissing: 'Approximate response time is still missing.',
        }),
      ]
    case 'operations':
      return [
        linkedWorkstreamItem,
        auditItem,
        agentInputItem({
          clientSlug,
          intake,
          id: 'systems',
          label: 'Systems',
          value: intake?.form.systems,
          reasonWhenConfirmed: 'Current systems are known.',
          reasonWhenMissing: 'Confirm the tools or systems in use.',
        }),
        agentInputItem({
          clientSlug,
          intake,
          id: 'constraints',
          label: 'Constraints',
          value: intake?.form.constraints,
          reasonWhenConfirmed: 'Operating constraints are known.',
          reasonWhenMissing: 'Confirm constraints before process design.',
        }),
      ]
    case 'web-growth':
      return [
        linkedWorkstreamItem,
        auditItem,
        agentInputItem({
          clientSlug,
          intake,
          id: 'primary-goal',
          label: 'Primary goal',
          value: intake?.form.primaryGoal,
          reasonWhenConfirmed: 'Growth work has a target outcome.',
          reasonWhenMissing: 'Confirm the primary website or growth outcome.',
        }),
        agentInputItem({
          clientSlug,
          intake,
          id: 'tracking-context',
          label: 'Tracking context',
          value: intake?.trackingMarkers.join(', ') || intake?.form.systems,
          reasonWhenConfirmed: 'Measurement context is available.',
          reasonWhenMissing: 'Confirm tracking markers or measurement systems.',
        }),
      ]
    case 'research':
      return [
        linkedWorkstreamItem,
        auditItem,
        agentInputItem({
          clientSlug,
          intake,
          id: 'primary-market',
          label: 'Primary market',
          value: intake?.form.primaryMarket,
          reasonWhenConfirmed: 'Market scope is documented.',
          reasonWhenMissing: 'Confirm the target market or geography.',
        }),
        agentInputItem({
          clientSlug,
          intake,
          id: 'lead-sources',
          label: 'Lead sources',
          value: intake?.form.leadSources,
          reasonWhenConfirmed: 'Demand channels are visible.',
          reasonWhenMissing: 'Confirm current lead sources.',
        }),
      ]
    default:
      return [linkedWorkstreamItem, auditItem]
  }
}

function buildAgentsReadiness(clientSlug: string, agents: WorkspaceAgent[]) {
  const relevantAgents = agents.filter((agent) => agent.readiness.status !== 'not_applicable')
  const readyCount = relevantAgents.filter((agent) => agent.readiness.status === 'confirmed').length
  const missingCount = relevantAgents.filter((agent) => agent.readiness.status === 'missing').length
  const blockedCount = relevantAgents.filter((agent) => agent.readiness.status === 'blocked').length
  const items = [
    buildReadinessItem({
      id: 'ready-agents',
      label: 'Ready agents',
      status: readyCount > 0 ? 'confirmed' : missingCount > 0 ? 'missing' : 'blocked',
      reason:
        readyCount > 0
          ? `${readyCount} agent${readyCount === 1 ? '' : 's'} have the inputs needed for activation.`
          : 'No agent has all activation inputs yet.',
      ctaLabel: 'Open agents',
      ctaHref: workspaceHref(clientSlug, 'agents'),
    }),
    buildReadinessItem({
      id: 'missing-agent-inputs',
      label: 'Missing agent inputs',
      status: missingCount === 0 ? 'confirmed' : 'missing',
      reason:
        missingCount === 0
          ? 'Relevant agents have no missing input groups.'
          : `${missingCount} relevant agent${missingCount === 1 ? '' : 's'} still need input context.`,
      ctaLabel: missingCount === 0 ? undefined : 'Review agents',
      ctaHref: missingCount === 0 ? undefined : workspaceHref(clientSlug, 'agents'),
    }),
    buildReadinessItem({
      id: 'blocked-agents',
      label: 'Blocked agents',
      status: blockedCount === 0 ? 'confirmed' : 'blocked',
      reason:
        blockedCount === 0
          ? 'No relevant agents are blocked by missing diagnosis steps.'
          : `${blockedCount} relevant agent${blockedCount === 1 ? '' : 's'} are blocked by missing diagnosis steps.`,
      ctaLabel: blockedCount === 0 ? undefined : 'Open Diagnosis',
      ctaHref: blockedCount === 0 ? undefined : workspaceDiagnosisHref(clientSlug),
    }),
  ]

  return buildReadinessGroup({
    id: `readiness:${clientSlug}:agents`,
    area: 'agent_activation',
    label: 'Agent readiness',
    items,
    summary:
      readyCount > 0
        ? `${readyCount} of ${relevantAgents.length} relevant agents have enough activation context.`
        : 'Agents are visible, but activation still depends on audit recommendation and confirmed inputs.',
    ctaLabel: 'Open agents',
    ctaHref: workspaceHref(clientSlug, 'agents'),
  })
}

function deriveWorkspaceFocusAreas(clientSlug: string) {
  if (clientSlug === 'morales-propiedades') {
    return [
      'Website improvement',
      'Sales follow-up',
      'Market study',
      'CRM / back-office review',
    ]
  }

  return [
    'Website improvement',
    'Lead handling',
    'Tracking clarity',
    'Operational handoff',
  ]
}

function statusFromStage(
  currentStage: string,
  title: string,
): WorkspaceWorkstream['status'] {
  if (currentStage === 'Audit completed') {
    if (title === 'Market study') {
      return 'identified'
    }

    return 'ready for design'
  }

  if (currentStage === 'Business Context ready') {
    if (title === 'Market study') {
      return 'identified'
    }

    return 'ready for design'
  }

  if (currentStage === 'Preaudit completed') {
    return title === 'Website improvement' ? 'identified' : 'needs input'
  }

  return 'blocked'
}

function deriveWorkspaceWorkstreams(options: {
  clientSlug: string
  currentStage: string
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceWorkstream[] {
  const { clientSlug, currentStage, preaudit, intake, audit } = options
  const clientId = clientEntityId(clientSlug)
  const focusAreas = deriveWorkspaceFocusAreas(clientSlug)
  const preauditSummary = preaudit?.summary ?? preaudit?.companySummary
  const topPain = audit?.mainPains[0]
  const savedSystems =
    intake?.form.systems.trim() || audit?.availableData.join(', ') || 'No confirmed operating system yet.'

  return focusAreas.map((title) => {
    let workstream: Omit<
      WorkspaceWorkstream,
      'id' | 'clientId' | 'type' | 'state' | 'priority' | 'readiness'
    >

    switch (title) {
      case 'Website improvement': {
        const status = statusFromStage(currentStage, title)
        workstream = {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters:
            preaudit?.priorityAlerts[4] ??
            preauditSummary ??
            'The public website is still the first point of trust, conversion, and demand capture.',
          linkedSource: audit ? 'preaudit + audit' : 'preaudit',
          suggestedNextStep:
            currentStage === 'Preaudit completed'
              ? 'Confirm business goals and lead paths in Business Context before redesigning the funnel.'
              : 'Translate the diagnostic into a concrete conversion and visibility improvement brief.',
          suggestedAgent: 'Web/Growth Agent',
        }
        break
      }
      case 'Sales follow-up': {
        const status = intake ? statusFromStage(currentStage, title) : 'needs input'
        workstream = {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters:
            audit?.mainPains.find((item) => /follow-up|sales pipeline|response/i.test(item)) ??
            'Manual response and weak ownership reduce the value of every inquiry that reaches the team.',
          linkedSource: audit ? 'Business Context + audit' : intake ? 'Business Context' : 'preaudit',
          suggestedNextStep:
            intake
              ? 'Clarify ownership, response time, and funnel handoff before enabling automation.'
              : 'Collect the missing lead-handling context before scoping this workstream.',
          suggestedAgent: 'Sales Agent',
        }
        break
      }
      case 'Market study': {
        const status = statusFromStage(currentStage, title)
        workstream = {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters:
            preaudit?.priorityAlerts[2] ??
            'Weak visibility and demand mapping make it harder to know which segments deserve focused effort.',
          linkedSource: preaudit ? 'preaudit' : 'workspace context',
          suggestedNextStep:
            'Validate search demand, local positioning, and channel opportunity before expanding acquisition work.',
          suggestedAgent: 'Research Agent',
        }
        break
      }
      case 'CRM / back-office review': {
        const status = intake ? statusFromStage(currentStage, title) : 'needs input'
        workstream = {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters:
            topPain ??
            `Current systems point to manual process risk: ${savedSystems}.`,
          linkedSource: audit ? 'Business Context + audit' : intake ? 'Business Context' : 'workspace context',
          suggestedNextStep:
            intake
              ? 'Map spreadsheets, WhatsApp, and follow-up steps into a clearer operating process.'
              : 'Confirm the current systems and source-of-truth setup first.',
          suggestedAgent: 'Operations Agent',
        }
        break
      }
      default: {
        const status = statusFromStage(currentStage, title)
        workstream = {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters: 'This workstream is part of the current transformation program.',
          linkedSource: audit ? 'audit' : preaudit ? 'preaudit' : 'workspace context',
          suggestedNextStep: 'Validate the next step before moving into execution.',
        }
      }
    }

    return {
      id: workstreamEntityId(clientSlug, title),
      clientId,
      type: workstreamTypeFromTitle(title),
      state: workstreamStateFromStatus(workstream.status),
      priority: workstreamPriorityFromTitle(title),
      readiness: buildWorkstreamReadiness({
        clientSlug,
        title,
        status: workstream.status,
        preaudit,
        intake,
        audit,
      }),
      ...workstream,
    }
  })
}

function deriveWorkspaceAgents(options: {
  clientSlug: string
  currentStage: string
  workstreams: WorkspaceWorkstream[]
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceAgent[] {
  const { clientSlug, currentStage, workstreams, intake, audit } = options
  const clientId = clientEntityId(clientSlug)
  const recommended = new Set(audit?.recommendedAgents ?? [])
  const hasIntake = Boolean(intake)

  const cards: Array<
    Omit<WorkspaceAgent, 'id' | 'clientId' | 'agentKey' | 'state' | 'linkedWorkstreamId' | 'tone' | 'readiness'>
  > = [
    {
      slug: 'sales',
      label: 'Sales Agent',
      role: 'Lead handling, response flow, attribution, and qualification design.',
      status: recommended.has('sales')
        ? currentStage === 'Audit completed'
          ? 'ready'
          : 'recommended'
        : hasIntake
          ? 'candidate'
          : 'setup needed',
      linkedWorkstream: 'Sales follow-up',
      currentRelevance:
        recommended.has('sales')
          ? 'Audit output points directly at follow-up and lead source visibility.'
          : 'This becomes relevant once lead handling and response ownership are confirmed.',
      requiredInputs: ['Lead sources', 'Lead handling', 'Approximate response time'],
      potentialOutput: 'Funnel handoff, response standards, and sales process improvements.',
    },
    {
      slug: 'operations',
      label: 'Operations Agent',
      role: 'Back-office process mapping, routing, and operating rhythm design.',
      status: recommended.has('operations')
        ? currentStage === 'Audit completed'
          ? 'ready'
          : 'recommended'
        : hasIntake
          ? 'candidate'
          : 'setup needed',
      linkedWorkstream: 'CRM / back-office review',
      currentRelevance:
        recommended.has('operations')
          ? 'Manual follow-up and spreadsheet dependence are already visible in the workflow.'
          : 'Operations becomes relevant once the current systems and constraints are confirmed.',
      requiredInputs: ['Systems', 'Source of truth', 'Constraints'],
      potentialOutput: 'Operating flow, handoff design, and automation candidates.',
    },
    {
      slug: 'collections',
      label: 'Collections Agent',
      role: 'Receivables, payment recovery, and post-sale workflow optimization.',
      status: 'not relevant',
      linkedWorkstream: 'No active collections track',
      currentRelevance:
        'No collections or payment-recovery pain is visible in the current preaudit or audit output.',
      requiredInputs: ['Invoice process', 'Payment terms', 'Collections workflow'],
      potentialOutput: 'Collections playbook and escalation workflow.',
    },
    {
      slug: 'web-growth',
      label: 'Web/Growth Agent',
      role: 'Website conversion, visibility, tracking, and offer-path improvement.',
      status:
        workstreams.find((item) => item.title === 'Website improvement')?.status === 'ready for design'
          ? 'recommended'
          : audit
            ? 'candidate'
            : 'setup needed',
      linkedWorkstream: 'Website improvement',
      currentRelevance:
        'The public site is already showing SEO, CTA, and instrumentation gaps that limit growth.',
      requiredInputs: ['Confirmed primary goal', 'Tracking priorities', 'Offer or funnel constraints'],
      potentialOutput: 'Conversion brief, instrumentation plan, and visibility upgrades.',
    },
    {
      slug: 'research',
      label: 'Research Agent',
      role: 'Demand mapping, market framing, and positioning analysis.',
      status: audit ? 'candidate' : 'setup needed',
      linkedWorkstream: 'Market study',
      currentRelevance:
        'Useful for validating demand, search intent, and positioning once the core funnel issues are clearer.',
      requiredInputs: ['Target market', 'Lead sources', 'Competitive context'],
      potentialOutput: 'Market study, opportunity framing, and channel hypotheses.',
    },
  ]

  return cards.map((card) => {
    const linkedWorkstream = workstreams.find((workstream) => workstream.title === card.linkedWorkstream)

    return {
      id: clientAgentEntityId(clientSlug, card.slug),
      clientId,
      agentKey: card.slug,
      state: agentStateFromStatus(card.status),
      linkedWorkstreamId: linkedWorkstream?.id,
      readiness: buildReadinessGroup({
        id: `readiness:${clientSlug}:agent:${card.slug}`,
        area: 'agent_activation',
        label: `${card.label} readiness`,
        items: agentReadinessItems({
          clientSlug,
          agent: card,
          linkedWorkstream,
          intake,
          audit,
        }),
        ctaLabel: 'Review inputs',
        ctaHref: workspaceDiagnosisHref(clientSlug),
      }),
      ...card,
      tone: toneFromAgentStatus(card.status),
    }
  })
}

function formFromIntake(record: AuditIntakeFile): IntakeDraft {
  const ui = record._web_ui ?? {}

  return {
    businessName: ui.businessName ?? record.company_profile?.name ?? '',
    industry: ui.industry ?? record.company_profile?.industry ?? '',
    primaryMarket: ui.primaryMarket ?? record.company_profile?.location ?? '',
    businessModel: ui.businessModel ?? record.company_profile?.business_model ?? '',
    primaryGoal: ui.primaryGoal ?? record.business_goals?.[0] ?? '',
    ninetyDaySuccess:
      ui.ninetyDaySuccess ?? record.business_goals?.slice(1).join('\n') ?? '',
    currentPains: ui.currentPains ?? joinList(record.known_pains),
    mostUrgentPain: ui.mostUrgentPain ?? record.known_pains?.[0] ?? '',
    systems: ui.systems ?? joinList(record.available_systems),
    sourceOfTruth: ui.sourceOfTruth ?? '',
    leadSources: ui.leadSources ?? '',
    leadHandling: ui.leadHandling ?? record.sales_notes ?? '',
    responseTime: ui.responseTime ?? '',
    constraints: ui.constraints ?? record.operations_notes ?? '',
    realisticChangeWindow: ui.realisticChangeWindow ?? '',
  }
}

function intakeFromForm(
  form: IntakeDraft,
  draft: AuditIntakeFile | undefined,
  existing: AuditIntakeFile | undefined,
): AuditIntakeFile {
  const base = existing ?? draft ?? {}

  return {
    ...draft,
    ...existing,
    company_profile: {
      ...(draft?.company_profile ?? {}),
      ...(existing?.company_profile ?? {}),
      name: form.businessName.trim(),
      industry: form.industry.trim(),
      business_model: form.businessModel.trim(),
      location: form.primaryMarket.trim(),
    },
    business_goals: parseList(
      compactLines([form.primaryGoal, form.ninetyDaySuccess]).join('\n'),
    ),
    known_pains: parseList(
      compactLines([form.mostUrgentPain, form.currentPains]).join('\n'),
    ),
    available_assets: existing?.available_assets ?? draft?.available_assets ?? [],
    available_systems: parseList(form.systems),
    sales_notes: compactLines([
      form.leadSources ? `Lead sources: ${form.leadSources}` : undefined,
      form.leadHandling ? `Lead handling: ${form.leadHandling}` : undefined,
      form.responseTime ? `Response time: ${form.responseTime}` : undefined,
    ]).join('\n'),
    operations_notes: compactLines([
      form.constraints ? `Constraints: ${form.constraints}` : undefined,
      form.realisticChangeWindow
        ? `Change window: ${form.realisticChangeWindow}`
        : undefined,
    ]).join('\n'),
    notes: existing?.notes ?? draft?.notes ?? '',
    _autofilled_from_preaudit:
      existing?._autofilled_from_preaudit ?? draft?._autofilled_from_preaudit,
    _todo: existing?._todo ?? draft?._todo ?? [],
    _web_ui: {
      ...form,
    },
  }
}

function readFormField(formData: FormData, key: keyof IntakeDraft) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function parseIntakeForm(formData: FormData): IntakeDraft {
  return {
    businessName: readFormField(formData, 'businessName'),
    industry: readFormField(formData, 'industry'),
    primaryMarket: readFormField(formData, 'primaryMarket'),
    businessModel: readFormField(formData, 'businessModel'),
    primaryGoal: readFormField(formData, 'primaryGoal'),
    ninetyDaySuccess: readFormField(formData, 'ninetyDaySuccess'),
    currentPains: readFormField(formData, 'currentPains'),
    mostUrgentPain: readFormField(formData, 'mostUrgentPain'),
    systems: readFormField(formData, 'systems'),
    sourceOfTruth: readFormField(formData, 'sourceOfTruth'),
    leadSources: readFormField(formData, 'leadSources'),
    leadHandling: readFormField(formData, 'leadHandling'),
    responseTime: readFormField(formData, 'responseTime'),
    constraints: readFormField(formData, 'constraints'),
    realisticChangeWindow: readFormField(formData, 'realisticChangeWindow'),
  }
}

async function loadPreauditViewForClient(
  clientSlug: string,
  websiteOverride?: string,
): Promise<PreauditView> {
  const { pointer, reportPath, report, runJson } = await readPreauditRun(clientSlug)
  const website = websiteOverride ?? (await deriveWebsiteFromPreaudit(runJson, clientSlug))
  const draft = await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug))
  const client = await buildWorkspaceClient(clientSlug, { website, draft })
  const summary = parseSectionParagraph(report, 'Executive Summary') || runJson.validated_output!.summary
  const businessImpact = parseSectionBullets(report, 'Business Impact')

  return {
    ...client,
    website,
    displayRunId: pointer.display_run_id,
    reportPath: path.relative(REPO_ROOT, reportPath),
    draftPath: path.relative(REPO_ROOT, intakeDraftPath(clientSlug)),
    companySummary: runJson.validated_output!.company_summary,
    summary,
    scores: [
      { label: 'SEO', score: runJson.validated_output!.seo_score },
      { label: 'Speed', score: runJson.validated_output!.speed_score },
      { label: 'UX', score: runJson.validated_output!.ux_score },
    ],
    businessImpact,
    quickWins: runJson.validated_output!.quick_wins,
    priorityAlerts: runJson.validated_output!.priority_alerts,
  }
}

async function loadAuditIntakeViewForClient(
  clientSlug: string,
  websiteOverride?: string,
): Promise<AuditIntakeView> {
  const draftFilePath = intakeDraftPath(clientSlug)
  const savedFilePath = intakePath(clientSlug)
  const draft = await readJsonIfExists<AuditIntakeFile>(draftFilePath)
  const saved = await readJsonIfExists<AuditIntakeFile>(savedFilePath)

  if (!draft && !saved) {
    throw new Error(`No intake draft or saved intake found for client "${clientSlug}".`)
  }

  const source = saved ? 'saved' : 'draft'
  const base = saved ?? draft!
  const website =
    websiteOverride ??
    base._autofilled_from_preaudit?.website ??
    draft?._autofilled_from_preaudit?.website ??
    DEFAULT_WEBSITE
  const client = await buildWorkspaceClient(clientSlug, { website, draft, saved })

  return {
    ...client,
    website: client.website,
    source,
    draftPath: path.relative(REPO_ROOT, draftFilePath),
    intakePath: path.relative(REPO_ROOT, savedFilePath),
    availableAssets: base.available_assets ?? draft?.available_assets ?? [],
    trackingMarkers: normalizeTrackingMarkerList(
      base._autofilled_from_preaudit?.tracking_markers ??
        draft?._autofilled_from_preaudit?.tracking_markers,
    ),
    todo: draft?._todo ?? [],
    form: formFromIntake(base),
  }
}

async function loadAuditViewForClient(
  clientSlug: string,
  websiteOverride?: string,
): Promise<AuditView> {
  const { pointer, runJson } = await readAuditRun(clientSlug)
  const draft = await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug))
  const saved = await readJsonIfExists<AuditIntakeFile>(intakePath(clientSlug))
  const client = await buildWorkspaceClient(clientSlug, {
    website: websiteOverride || draft?._autofilled_from_preaudit?.website,
    draft,
    saved,
  })

  return {
    ...client,
    website: client.website,
    displayRunId: pointer.display_run_id,
    intakePath: runJson.intake_path ? path.relative(REPO_ROOT, runJson.intake_path) : undefined,
    companySummary: runJson.validated_output!.company_summary,
    industry: runJson.validated_output!.industry,
    mainPains: runJson.validated_output!.main_pains,
    availableData: runJson.validated_output!.available_data,
    recommendedAgents: runJson.validated_output!.recommended_agents,
    priorityOrder: runJson.validated_output!.priority_order,
    notes: runJson.validated_output!.notes,
  }
}

function isMissingWorkflowResource(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.startsWith('No latest') ||
      error.message.startsWith('No intake draft or saved intake'))
  )
}

function buildClientContextSummary(options: {
  client: WorkspaceClient
  intake: AuditIntakeView
  draftPath: string
  savedPath: string
  draftUpdatedAt?: string
  savedUpdatedAt?: string
}): WorkspaceClientContextSummary {
  const { client, intake, draftPath, savedPath, draftUpdatedAt, savedUpdatedAt } = options
  const sourcePath = intake.source === 'saved' ? savedPath : draftPath

  return {
    id: `client_context:${client.clientSlug}`,
    clientId: client.id,
    status: intake.source === 'saved' ? 'saved' : 'draft',
    source: 'legacy_intake_file',
    sourcePath,
    draftPath,
    updatedAt: intake.source === 'saved' ? savedUpdatedAt : draftUpdatedAt,
    availableAssets: intake.availableAssets,
    trackingMarkers: intake.trackingMarkers,
    todo: intake.todo,
    form: intake.form,
  }
}

function buildWorkflowRunSummary(options: {
  client: WorkspaceClient
  runType: 'preaudit' | 'audit'
  pointer?: LatestPointer
  updatedAt?: string
}): WorkspaceRunSummary {
  const { client, runType, pointer, updatedAt } = options
  const storagePath = pointer?.path

  return {
    id: workflowRunEntityId(client.clientSlug, runType),
    clientId: client.id,
    runType,
    status: pointer ? 'completed' : 'missing',
    displayRunId: pointer?.display_run_id,
    runId: pointer?.run_id,
    storagePath,
    runJsonPath: storagePath ? path.join(storagePath, 'run.json') : undefined,
    outputPath: storagePath ? path.join(storagePath, runType === 'preaudit' ? 'report.md' : 'run.json') : undefined,
    updatedAt,
  }
}

function buildWorkspaceOutputSummaries(options: {
  client: WorkspaceClient
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
  auditIsCurrent: boolean
}): WorkspaceOutputSummary[] {
  const { client, preaudit, intake, audit, auditIsCurrent } = options
  const clientSlug = client.clientSlug

  return [
    {
      id: outputEntityId(clientSlug, 'preaudit_report'),
      clientId: client.id,
      outputType: 'preaudit_report',
      sourceEntity: 'workflow_run',
      internalArtifactPath: preaudit?.reportPath,
      runId: preaudit?.displayRunId,
      label: 'Preaudit output',
      value: preaudit?.displayRunId ?? 'Not generated',
      detail: preaudit ? preaudit.reportPath : 'No preaudit report linked yet.',
      href: '/workspace/' + clientSlug + '/diagnosis?panel=preaudit',
      tone: preaudit ? 'success' : 'pending',
    },
    {
      id: outputEntityId(clientSlug, 'business_context'),
      clientId: client.id,
      outputType: 'business_context',
      sourceEntity: 'client_context',
      internalArtifactPath: intake?.source === 'saved' ? intake.intakePath : intake?.draftPath,
      label: 'Business Context',
      value: intake ? (intake.source === 'saved' ? 'Saved' : 'Draft') : 'Missing',
      detail: intake
        ? 'Client operating context for the full audit.'
        : 'No Business Context record has been loaded yet.',
      href: '/workspace/' + clientSlug + '/diagnosis?panel=intake',
      tone: intake ? (intake.source === 'saved' ? 'success' : 'progress') : 'pending',
    },
    {
      id: outputEntityId(clientSlug, 'audit_output'),
      clientId: client.id,
      outputType: 'audit_output',
      sourceEntity: 'workflow_run',
      runId: audit?.displayRunId,
      label: 'Audit output',
      value: audit?.displayRunId ?? 'Not generated',
      detail: audit
        ? auditIsCurrent
          ? 'Current audit output available for workstream design.'
          : 'An audit exists, but newer context means it should be rerun.'
        : 'No audit output has been generated yet.',
      href: '/workspace/' + clientSlug + '/diagnosis?panel=audit',
      tone: audit ? (auditIsCurrent ? 'success' : 'progress') : 'pending',
    },
  ]
}

function buildWorkspaceEvents(options: {
  client: WorkspaceClient
  currentStage: string
  recommendedNextLabel: string
  preauditUpdatedAt?: string
  draftUpdatedAt?: string
  savedUpdatedAt?: string
  auditUpdatedAt?: string
  hasPreaudit: boolean
  hasDraft: boolean
  hasSaved: boolean
  hasCurrentAudit: boolean
}): WorkspaceEventSummary[] {
  const {
    client,
    currentStage,
    recommendedNextLabel,
    preauditUpdatedAt,
    draftUpdatedAt,
    savedUpdatedAt,
    auditUpdatedAt,
    hasPreaudit,
    hasDraft,
    hasSaved,
    hasCurrentAudit,
  } = options
  const events: WorkspaceEventSummary[] = [
    {
      id: `event:${client.clientSlug}:client-state`,
      clientId: client.id,
      type: 'client_state_changed',
      category: 'lifecycle',
      visibility: 'both',
      severity: 'info',
      label: currentStage,
      detail: 'Current workspace lifecycle state derived from file-backed workflow records.',
    },
    {
      id: `event:${client.clientSlug}:next-action`,
      clientId: client.id,
      type: 'next_action_updated',
      category: 'lifecycle',
      visibility: 'both',
      severity: 'info',
      label: 'Next action updated',
      detail: recommendedNextLabel,
    },
  ]

  if (hasPreaudit) {
    events.push({
      id: `event:${client.clientSlug}:preaudit-completed`,
      clientId: client.id,
      type: 'preaudit_completed',
      category: 'workflow',
      visibility: 'both',
      severity: 'info',
      label: 'Preaudit completed',
      detail: 'Preaudit output is available in Diagnosis.',
      createdAt: preauditUpdatedAt,
    })
  }

  if (hasSaved || hasDraft) {
    events.push({
      id: `event:${client.clientSlug}:business-context`,
      clientId: client.id,
      type: hasSaved ? 'business_context_saved' : 'business_context_draft_ready',
      category: 'client_input',
      visibility: 'both',
      severity: 'info',
      label: hasSaved ? 'Business Context saved' : 'Business Context draft ready',
      detail: hasSaved
        ? 'Client operating context is ready for audit.'
        : 'A draft Business Context is available for review.',
      createdAt: hasSaved ? savedUpdatedAt : draftUpdatedAt,
    })
  }

  if (hasCurrentAudit) {
    events.push({
      id: `event:${client.clientSlug}:audit-completed`,
      clientId: client.id,
      type: 'audit_completed',
      category: 'workflow',
      visibility: 'both',
      severity: 'info',
      label: 'Audit completed',
      detail: 'Audit recommendations are current and ready for workstream planning.',
      createdAt: auditUpdatedAt,
    })
  }

  return events
}

function newestIso(...values: Array<string | undefined>) {
  const timestamps = values
    .map((value) => {
      if (!value) {
        return undefined
      }

      const time = Date.parse(value)
      return Number.isNaN(time) ? undefined : { value, time }
    })
    .filter((value): value is { value: string; time: number } => Boolean(value))
    .sort((a, b) => b.time - a.time)

  return timestamps[0]?.value
}

function relatedWorkstreamLabel(workstreams: WorkspaceWorkstream[]) {
  if (workstreams.length === 1) {
    return workstreams[0].title
  }

  return `${workstreams.length} workstreams`
}

function relatedAgentLabel(agents: WorkspaceAgent[]) {
  if (agents.length === 1) {
    return agents[0].label
  }

  return `${agents.length} agents`
}

function firstUsefulText(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())
}

function buildWorkspaceActivity(options: {
  client: WorkspaceClient
  currentStage: string
  recommendedNextSection: WorkspaceSectionId
  recommendedNextLabel: string
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
  workstreams: WorkspaceWorkstream[]
  agents: WorkspaceAgent[]
  outputs: WorkspaceOutputSummary[]
  auditIsCurrent: boolean
  preauditUpdatedAt?: string
  draftUpdatedAt?: string
  savedUpdatedAt?: string
  auditUpdatedAt?: string
}): WorkspaceActivityItem[] {
  const {
    client,
    currentStage,
    recommendedNextSection,
    recommendedNextLabel,
    preaudit,
    intake,
    audit,
    workstreams,
    agents,
    outputs,
    auditIsCurrent,
    preauditUpdatedAt,
    draftUpdatedAt,
    savedUpdatedAt,
    auditUpdatedAt,
  } = options
  const clientSlug = client.clientSlug
  const activity: WorkspaceActivityItem[] = []

  if (preaudit && preauditUpdatedAt) {
    activity.push({
      id: `activity:${clientSlug}:preaudit-completed`,
      type: 'preaudit_completed',
      title: 'Preaudit completed',
      description:
        'Initial public-site signals were reviewed and the first findings are ready in Diagnosis.',
      timestamp: preauditUpdatedAt,
      relatedEntityType: 'diagnosis',
      relatedEntityLabel: 'Preaudit',
      ctaLabel: 'Review preaudit',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'preaudit'),
    })
  }

  if (intake?.source === 'saved' && savedUpdatedAt) {
    activity.push({
      id: `activity:${clientSlug}:business-context-saved`,
      type: 'business_context_saved',
      title: 'Business Context saved',
      description:
        'Client operating context was saved and is ready to support the full audit.',
      timestamp: savedUpdatedAt,
      relatedEntityType: 'business_context',
      relatedEntityLabel: 'Business Context',
      ctaLabel: 'Open context',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'intake'),
    })
  }

  if (audit && auditIsCurrent && auditUpdatedAt) {
    activity.push({
      id: `activity:${clientSlug}:audit-completed`,
      type: 'audit_completed',
      title: 'Audit completed',
      description:
        'The audit output is current and ready to guide workstreams and agent setup.',
      timestamp: auditUpdatedAt,
      relatedEntityType: 'audit',
      relatedEntityLabel: 'Audit output',
      ctaLabel: 'Review audit',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'audit'),
    })
  }

  const workstreamReadyTimestamp = newestIso(auditUpdatedAt, savedUpdatedAt)
  const createdWorkstreams = workstreams.filter((workstream) =>
    ['identified', 'needs input', 'ready for design', 'active', 'complete'].includes(
      workstream.status,
    ),
  )
  if (
    workstreamReadyTimestamp &&
    createdWorkstreams.length > 0 &&
    (currentStage === 'Business Context ready' || currentStage === 'Audit completed')
  ) {
    activity.push({
      id: `activity:${clientSlug}:workstreams-created`,
      type: 'workstream_created',
      title: 'Workstreams created',
      description:
        'Initial workstreams were structured from the current diagnosis and Business Context.',
      timestamp: workstreamReadyTimestamp,
      relatedEntityType: 'workstream',
      relatedEntityLabel: relatedWorkstreamLabel(createdWorkstreams),
      ctaLabel: 'Open workstreams',
      ctaHref: workspaceHref(clientSlug, 'workstreams'),
    })
  }

  const activeWorkstreams = workstreams.filter((workstream) => workstream.status === 'active')
  if (workstreamReadyTimestamp && activeWorkstreams.length > 0) {
    activity.push({
      id: `activity:${clientSlug}:workstreams-activated`,
      type: 'workstream_activated',
      title: 'Workstream activated',
      description:
        activeWorkstreams.length === 1
          ? `${activeWorkstreams[0].title} is now active.`
          : `${activeWorkstreams.length} workstreams are now active.`,
      timestamp: workstreamReadyTimestamp,
      relatedEntityType: 'workstream',
      relatedEntityLabel: relatedWorkstreamLabel(activeWorkstreams),
      ctaLabel: 'Open workstreams',
      ctaHref: workspaceHref(clientSlug, 'workstreams'),
    })
  }

  const recommendedAgents = agents.filter((agent) =>
    ['recommended', 'ready', 'active'].includes(agent.status),
  )
  const agentTimestamp = newestIso(auditUpdatedAt, savedUpdatedAt)
  if (agentTimestamp && recommendedAgents.length > 0) {
    activity.push({
      id: `activity:${clientSlug}:agents-recommended`,
      type: 'agent_recommended',
      title:
        recommendedAgents.length === 1
          ? `${recommendedAgents[0].label} recommended`
          : 'Agent recommendations updated',
      description:
        recommendedAgents.length === 1
          ? `${recommendedAgents[0].label} is relevant for the current workstream path.`
          : 'Relevant agents were identified for the current workstream path.',
      timestamp: agentTimestamp,
      relatedEntityType: 'agent',
      relatedEntityLabel: relatedAgentLabel(recommendedAgents),
      ctaLabel: 'Open agents',
      ctaHref: workspaceHref(clientSlug, 'agents'),
    })
  }

  const progressOutput = outputs.find((output) => output.tone === 'progress')
  const progressOutputTimestamp =
    progressOutput?.outputType === 'business_context'
      ? draftUpdatedAt
      : progressOutput?.outputType === 'audit_output'
        ? auditUpdatedAt
        : preauditUpdatedAt
  if (progressOutput && progressOutputTimestamp) {
    activity.push({
      id: `activity:${clientSlug}:output-${progressOutput.outputType}`,
      type: 'new_output_available',
      title: 'New output available',
      description:
        progressOutput.outputType === 'business_context'
          ? 'A draft Business Context is ready to review.'
          : `${progressOutput.label} is available for review.`,
      timestamp: progressOutputTimestamp,
      relatedEntityType: 'output',
      relatedEntityLabel: progressOutput.label,
      ctaLabel: 'Open output',
      ctaHref: progressOutput.href,
    })
  }

  const nextStepTimestamp = newestIso(auditUpdatedAt, savedUpdatedAt, draftUpdatedAt, preauditUpdatedAt)
  if (nextStepTimestamp && activity.length > 0) {
    activity.push({
      id: `activity:${clientSlug}:next-step-updated`,
      type: 'next_step_updated',
      title: 'Next step updated',
      description: `Recommended next step: ${recommendedNextLabel}.`,
      timestamp: nextStepTimestamp,
      relatedEntityType: 'workspace',
      relatedEntityLabel: currentStage,
      ctaLabel: 'Continue',
      ctaHref:
        recommendedNextSection === 'diagnosis'
          ? workspaceDiagnosisHref(clientSlug)
          : workspaceHref(clientSlug, recommendedNextSection),
    })
  }

  return activity.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

function buildWorkspaceImpact(options: {
  client: WorkspaceClient
  preaudit?: PreauditView
  intake?: AuditIntakeView
  audit?: AuditView
  workstreams: WorkspaceWorkstream[]
  agents: WorkspaceAgent[]
  outputs: WorkspaceOutputSummary[]
  auditPointerExists: boolean
  auditIsCurrent: boolean
}): WorkspaceImpactItem[] {
  const {
    client,
    preaudit,
    intake,
    audit,
    workstreams,
    agents,
    outputs,
    auditPointerExists,
    auditIsCurrent,
  } = options
  const clientSlug = client.clientSlug
  const impact: WorkspaceImpactItem[] = []

  if (preaudit) {
    impact.push({
      id: `impact:${clientSlug}:growth-leaks`,
      category: 'growth_leaks',
      title: 'Growth leaks identified',
      description:
        firstUsefulText(
          preaudit.businessImpact[0],
          preaudit.priorityAlerts[0],
          preaudit.summary,
        ) ?? 'The initial diagnosis surfaced places where demand capture may be weaker than it should be.',
      impactState: 'identified',
      relatedEntityType: 'diagnosis',
      relatedEntityLabel: 'Preaudit findings',
      ctaLabel: 'Review preaudit',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'preaudit'),
    })

    impact.push({
      id: `impact:${clientSlug}:visibility-gains`,
      category: 'visibility_gains',
      title: 'Visibility and conversion opportunities surfaced',
      description:
        firstUsefulText(
          preaudit.priorityAlerts.find((item) =>
            /visibility|search|seo|cta|conversion|tracking/i.test(item),
          ),
          preaudit.quickWins[0],
        ) ?? 'The preaudit identified practical improvements to make the public funnel clearer and easier to act on.',
      impactState: 'identified',
      relatedEntityType: 'diagnosis',
      relatedEntityLabel: 'Public-site signal',
      ctaLabel: 'Open diagnosis',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'preaudit'),
    })
  }

  if (audit) {
    impact.push({
      id: `impact:${clientSlug}:workflow-friction`,
      category: 'workflow_friction',
      title: 'Workflow friction clarified',
      description:
        firstUsefulText(
          audit.mainPains[0],
          'The audit clarified which operating frictions are most likely to limit follow-up, handoff, or execution quality.',
        ) ?? 'The audit clarified which operating frictions need attention before execution scales.',
      impactState: 'identified',
      relatedEntityType: 'audit',
      relatedEntityLabel: 'Audit output',
      ctaLabel: 'Review audit',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'audit'),
    })

    if (audit.priorityOrder.length > 0) {
      impact.push({
        id: `impact:${clientSlug}:priority-path`,
        category: 'outputs_enabling_action',
        title: 'Priorities are ready to turn into action',
        description: `The audit priority path starts with: ${audit.priorityOrder[0]}.`,
        impactState: auditIsCurrent ? 'unlocking' : 'needs_attention',
        relatedEntityType: 'output',
        relatedEntityLabel: 'Audit priorities',
        ctaLabel: 'Open workstreams',
        ctaHref: auditIsCurrent
          ? workspaceHref(clientSlug, 'workstreams')
          : workspaceDiagnosisHref(clientSlug, 'audit'),
      })
    }
  }

  const readyWorkstreams = workstreams.filter((workstream) =>
    ['ready for design', 'active', 'complete'].includes(workstream.status),
  )
  if (readyWorkstreams.length > 0) {
    impact.push({
      id: `impact:${clientSlug}:workstreams-unlocking`,
      category: 'workflow_friction',
      title: 'Focused workstreams are unlocking execution',
      description:
        readyWorkstreams.length === 1
          ? `${readyWorkstreams[0].title} is ready to move from diagnosis into focused improvement work.`
          : 'The current workstreams are ready to move from diagnosis into focused improvement work.',
      impactState: 'unlocking',
      relatedEntityType: 'workstream',
      relatedEntityLabel: relatedWorkstreamLabel(readyWorkstreams),
      ctaLabel: 'Open workstreams',
      ctaHref: workspaceHref(clientSlug, 'workstreams'),
    })
  }

  const recommendedAgents = agents.filter((agent) =>
    ['recommended', 'ready', 'active'].includes(agent.status),
  )
  if (recommendedAgents.length > 0) {
    impact.push({
      id: `impact:${clientSlug}:agent-supported-progress`,
      category: 'agent_supported_progress',
      title: 'Agent-supported progress is taking shape',
      description:
        recommendedAgents.length === 1
          ? `${recommendedAgents[0].label} is relevant to support the current improvement path.`
          : 'Relevant agents have been identified to support the current improvement path.',
      impactState: 'unlocking',
      relatedEntityType: 'agent',
      relatedEntityLabel: relatedAgentLabel(recommendedAgents),
      ctaLabel: 'Open agents',
      ctaHref: workspaceHref(clientSlug, 'agents'),
    })
  }

  const readyOutputs = outputs.filter((output) => output.tone === 'success')
  if (readyOutputs.length > 0) {
    impact.push({
      id: `impact:${clientSlug}:outputs-enabling-action`,
      category: 'outputs_enabling_action',
      title: 'Outputs are enabling clearer decisions',
      description:
        readyOutputs.length === 1
          ? `${readyOutputs[0].label} is available as a decision input.`
          : 'Current outputs are available as decision inputs for the next workspace step.',
      impactState: 'unlocking',
      relatedEntityType: 'output',
      relatedEntityLabel:
        readyOutputs.length === 1 ? readyOutputs[0].label : `${readyOutputs.length} outputs`,
      ctaLabel: 'Open diagnosis',
      ctaHref: workspaceDiagnosisHref(clientSlug),
    })
  }

  if (!preaudit) {
    impact.push({
      id: `impact:${clientSlug}:needs-preaudit`,
      category: 'needs_attention',
      title: 'First diagnostic needed before impact can be framed',
      description:
        'The workspace needs the initial preaudit before value themes can be identified responsibly.',
      impactState: 'needs_attention',
      relatedEntityType: 'diagnosis',
      relatedEntityLabel: 'Preaudit',
      ctaLabel: 'Open diagnosis',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'preaudit'),
    })
  } else if (!intake) {
    impact.push({
      id: `impact:${clientSlug}:needs-business-context`,
      category: 'needs_attention',
      title: 'Business Context is needed to qualify value',
      description:
        'Confirmed goals, pains, systems, and constraints are needed before EBC can prioritize value with confidence.',
      impactState: 'needs_attention',
      relatedEntityType: 'business_context',
      relatedEntityLabel: 'Business Context',
      ctaLabel: 'Complete context',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'intake'),
    })
  } else if (!auditIsCurrent) {
    impact.push({
      id: `impact:${clientSlug}:needs-current-audit`,
      category: 'needs_attention',
      title: auditPointerExists ? 'Audit should be refreshed' : 'Full audit needed to confirm priorities',
      description: auditPointerExists
        ? 'Newer context exists after the latest audit, so the value path should be refreshed before execution decisions.'
        : 'The full audit is needed to turn diagnosis and Business Context into a clearer implementation path.',
      impactState: 'needs_attention',
      relatedEntityType: 'audit',
      relatedEntityLabel: 'Audit',
      ctaLabel: 'Open audit',
      ctaHref: workspaceDiagnosisHref(clientSlug, 'audit'),
    })
  } else if (readyWorkstreams.length === 0) {
    impact.push({
      id: `impact:${clientSlug}:needs-workstream-activation`,
      category: 'needs_attention',
      title: 'Implementation path still needs activation',
      description:
        'The diagnosis is current, but workstreams need to be activated before value can move from identified to unlocked.',
      impactState: 'needs_attention',
      relatedEntityType: 'workstream',
      relatedEntityLabel: 'Workstreams',
      ctaLabel: 'Open workstreams',
      ctaHref: workspaceHref(clientSlug, 'workstreams'),
    })
  }

  const stateOrder: Record<WorkspaceImpactItem['impactState'], number> = {
    needs_attention: 0,
    unlocking: 1,
    identified: 2,
    observed: 3,
  }

  return impact.sort((a, b) => stateOrder[a.impactState] - stateOrder[b.impactState])
}

async function loadWorkspaceBundle(clientSlugInput: string) {
  const clientSlug = slugifyClientName(clientSlugInput)
  const draftFilePath = intakeDraftPath(clientSlug)
  const savedFilePath = intakePath(clientSlug)
  const draft = await readJsonIfExists<AuditIntakeFile>(draftFilePath)
  const saved = await readJsonIfExists<AuditIntakeFile>(savedFilePath)
  const preauditLatestPath = path.join(clientArtifactPath(clientSlug, 'preaudit'), 'latest.json')
  const auditLatestPath = path.join(clientArtifactPath(clientSlug, 'audit'), 'latest.json')
  const preauditPointer = await readLatestPointerIfExists(clientSlug, 'preaudit')
  const auditPointer = await readLatestPointerIfExists(clientSlug, 'audit')
  const preauditUpdatedAt = await readMtimeMsIfExists(preauditLatestPath)
  const draftUpdatedAt = await readMtimeMsIfExists(draftFilePath)
  const savedUpdatedAt = await readMtimeMsIfExists(savedFilePath)
  const auditUpdatedAt = await readMtimeMsIfExists(auditLatestPath)
  const preauditUpdatedAtIso = await readMtimeIsoIfExists(preauditLatestPath)
  const draftUpdatedAtIso = await readMtimeIsoIfExists(draftFilePath)
  const savedUpdatedAtIso = await readMtimeIsoIfExists(savedFilePath)
  const auditUpdatedAtIso = await readMtimeIsoIfExists(auditLatestPath)
  const baseClient = await buildWorkspaceClient(clientSlug, { draft, saved })
  const intakeReady = Boolean(saved || draft)
  const newestUpstreamUpdate = Math.max(
    preauditUpdatedAt ?? 0,
    draftUpdatedAt ?? 0,
    savedUpdatedAt ?? 0,
  )
  const auditIsCurrent = Boolean(
    auditPointer && typeof auditUpdatedAt === 'number' && auditUpdatedAt >= newestUpstreamUpdate,
  )

  const currentStage = auditIsCurrent
    ? 'Audit completed'
    : intakeReady
      ? 'Business Context ready'
      : preauditPointer
        ? 'Preaudit completed'
        : 'Lead captured'
  const currentStageDetail = auditIsCurrent
    ? 'The completed audit is still current relative to the latest preaudit and Business Context.'
    : intakeReady
      ? auditPointer
        ? 'Newer preaudit or Business Context exists after the last audit output. Confirm the details and run the full audit again.'
        : 'The preaudit is done and the missing Business Context is ready for the full audit step.'
      : preauditPointer
        ? 'The preaudit is complete. Review it, then complete Business Context before running the full audit.'
        : 'Client context exists locally, but no preaudit output has been generated yet.'
  const client: WorkspaceClient = {
    ...baseClient,
    primaryLifecycleState: clientLifecycleFromStage(currentStage),
  }

  let recommendedNextSection: WorkspaceSectionId = 'diagnosis'
  let recommendedNextLabel = 'Review diagnosis'
  let recommendedNextDetail =
    'Use the diagnosis hub to review the preaudit, confirm Business Context, and decide the next move.'

  if (intakeReady && !auditIsCurrent) {
    recommendedNextSection = 'diagnosis'
    recommendedNextLabel = 'Run full audit'
    recommendedNextDetail =
      'The consulting flow is ready for the full audit step. Confirm Business Context in Diagnosis and run the audit.'
  } else if (auditIsCurrent) {
    recommendedNextSection = 'workstreams'
    recommendedNextLabel = 'Activate workstreams'
    recommendedNextDetail =
      'The audit output is current. Use it to move from diagnosis into workstreams and agent setup.'
  }

  const preaudit = preauditPointer
    ? await loadPreauditViewForClient(clientSlug, client.website).catch((error) => {
        if (isMissingWorkflowResource(error)) {
          return undefined
        }

        throw error
      })
    : undefined
  const intake = intakeReady
    ? await loadAuditIntakeViewForClient(clientSlug, client.website).catch((error) => {
        if (isMissingWorkflowResource(error)) {
          return undefined
        }

        throw error
      })
    : undefined
  const audit = auditPointer
    ? await loadAuditViewForClient(clientSlug, client.website).catch((error) => {
        if (isMissingWorkflowResource(error)) {
          return undefined
        }

        throw error
      })
    : undefined
  const workflowStatus = [
    {
      label: 'Preaudit',
      status: preauditPointer
        ? buildStageStatus(
            'Completed',
            'Preaudit findings are available in Diagnosis.',
            'success',
          )
        : buildStageStatus('Pending', 'Preaudit has not run yet.', 'pending'),
      detail: 'Public-site signal, visibility, conversion friction, and quick-win framing.',
    },
    {
      label: 'Business Context',
      status: saved
        ? buildStageStatus(
            'Ready',
            'Business Context is saved and ready for the audit step.',
            'success',
          )
        : draft
          ? buildStageStatus(
              'Draft ready',
              'A Business Context draft is available for review.',
              'progress',
            )
          : buildStageStatus('Not started', 'No Business Context draft has been generated yet.', 'pending'),
      detail: 'Business, systems, lead process, and constraint context for the deeper audit.',
    },
    {
      label: 'Audit',
      status: auditIsCurrent
        ? buildStageStatus(
            'Completed',
            'Audit output is available for workstream planning.',
            'success',
          )
        : auditPointer
          ? buildStageStatus(
              'Needs rerun',
              'Newer preaudit or Business Context exists after the current audit output.',
              'progress',
            )
          : intakeReady
            ? buildStageStatus(
                'Ready to run',
                'Business Context is ready and the next step is to run the full audit.',
                'progress',
              )
            : buildStageStatus(
                'Blocked',
                'Finish preaudit review and Business Context before the full audit can run.',
                'pending',
              ),
      detail: 'Decision-ready diagnosis, priorities, and recommended execution modules.',
    },
  ] as const
  const workstreams = deriveWorkspaceWorkstreams({
    clientSlug,
    currentStage,
    preaudit,
    intake,
    audit,
  })
  const agents = deriveWorkspaceAgents({
    clientSlug,
    currentStage,
    workstreams,
    intake,
    audit,
  })
  const readiness: WorkspaceReadinessSummary = {
    audit: buildAuditReadiness({
      clientSlug,
      preaudit,
      intake,
      auditIsCurrent,
    }),
    workstreams: buildWorkstreamsReadiness(clientSlug, workstreams),
    agents: buildAgentsReadiness(clientSlug, agents),
  }
  const clientContext = intake
    ? buildClientContextSummary({
        client,
        intake,
        draftPath: path.relative(REPO_ROOT, draftFilePath),
        savedPath: path.relative(REPO_ROOT, savedFilePath),
        draftUpdatedAt: draftUpdatedAtIso,
        savedUpdatedAt: savedUpdatedAtIso,
      })
    : undefined
  const workflowRuns: WorkspaceRunSummary[] = [
    buildWorkflowRunSummary({
      client,
      runType: 'preaudit',
      pointer: preauditPointer,
      updatedAt: preauditUpdatedAtIso,
    }),
    buildWorkflowRunSummary({
      client,
      runType: 'audit',
      pointer: auditPointer,
      updatedAt: auditUpdatedAtIso,
    }),
  ]
  const outputs = buildWorkspaceOutputSummaries({
    client,
    preaudit,
    intake,
    audit,
    auditIsCurrent,
  })
  const events = buildWorkspaceEvents({
    client,
    currentStage,
    recommendedNextLabel,
    preauditUpdatedAt: preauditUpdatedAtIso,
    draftUpdatedAt: draftUpdatedAtIso,
    savedUpdatedAt: savedUpdatedAtIso,
    auditUpdatedAt: auditUpdatedAtIso,
    hasPreaudit: Boolean(preaudit),
    hasDraft: Boolean(draft),
    hasSaved: Boolean(saved),
    hasCurrentAudit: auditIsCurrent,
  })
  const activity = buildWorkspaceActivity({
    client,
    currentStage,
    recommendedNextSection,
    recommendedNextLabel,
    preaudit,
    intake,
    audit,
    workstreams,
    agents,
    outputs,
    auditIsCurrent,
    preauditUpdatedAt: preauditUpdatedAtIso,
    draftUpdatedAt: draftUpdatedAtIso,
    savedUpdatedAt: savedUpdatedAtIso,
    auditUpdatedAt: auditUpdatedAtIso,
  })
  const impact = buildWorkspaceImpact({
    client,
    preaudit,
    intake,
    audit,
    workstreams,
    agents,
    outputs,
    auditPointerExists: Boolean(auditPointer),
    auditIsCurrent,
  })
  const keyFacts = [
    { label: 'Website', value: client.website },
    { label: 'Lead email', value: client.email ?? 'Not captured yet' },
    { label: 'Workspace key', value: client.clientSlug },
    {
      label: 'Industry',
      value: audit?.industry ?? intake?.form.industry ?? 'Not confirmed yet',
    },
  ]
  const accountReadiness = [
    {
      label: 'Primary next action',
      value: recommendedNextLabel,
      detail: recommendedNextDetail,
    },
    {
      label: 'Execution readiness',
      value: auditIsCurrent ? 'Ready for workstreams' : intakeReady ? 'Needs audit run' : 'Needs Business Context',
      detail: auditIsCurrent
        ? 'The current audit is strong enough to shape workstreams and agent setup.'
        : intakeReady
          ? 'Diagnosis is advanced enough to run or rerun the audit.'
          : 'The account still needs more structured input before deeper execution.',
    },
    {
      label: 'Agent readiness',
      value: String(agents.filter((agent) => ['recommended', 'ready', 'active'].includes(agent.status)).length),
      detail: 'Specialized agents become more concrete as diagnosis output and Business Context improve.',
    },
  ]
  const efficiencySignals = [
    {
      label: 'Leak' as const,
      title: 'Lost visibility and attribution',
      detail:
        preaudit?.businessImpact[2] ??
        'Weak measurement makes it harder to know which channels or changes are producing revenue.',
    },
    {
      label: 'Leak' as const,
      title: 'Manual follow-up drag',
      detail:
        audit?.mainPains[1] ??
        'The current lead process likely depends too heavily on manual action and memory.',
    },
    {
      label: 'Gain' as const,
      title: 'Clearer next-step execution',
      detail:
        audit?.notes ??
        'Once the diagnosis is confirmed, the account can move into scoped workstreams and specialized agents.',
    },
  ]
  const focusAreas = deriveWorkspaceFocusAreas(clientSlug)

  return {
    client,
    currentStage,
    currentStageDetail,
    clientContext,
    workflowRuns,
    outputs,
    events,
    activity,
    impact,
    readiness,
    preauditStatus: workflowStatus[0].status,
    intakeStatus: workflowStatus[1].status,
    auditStatus: workflowStatus[2].status,
    quickSummary: [
      {
        label: 'Current stage',
        value: currentStage,
        detail: currentStageDetail,
      },
      {
        label: 'Website',
        value: client.website,
        detail: 'Public site currently linked to this client workspace.',
      },
      {
        label: 'Client slug',
        value: client.clientSlug,
        detail: 'Local file and output linkage continues to use the client slug.',
      },
      {
        label: 'Lead email',
        value: client.email ?? 'Not captured yet',
        detail: client.email
          ? 'Stored locally with the client context for later formal handoff.'
          : 'Older runs may not have an email attached until a new landing submission occurs.',
      },
      {
        label: 'Next action',
        value: recommendedNextLabel,
        detail: recommendedNextDetail,
      },
    ],
    focusAreas,
    workflowStatus: [...workflowStatus],
    workstreams,
    agents,
    artifacts: outputs,
    keyFacts,
    accountReadiness,
    efficiencySignals,
    recommendedNextSection,
    recommendedNextLabel,
    recommendedNextDetail,
    preaudit,
    intake,
    audit,
  }
}

export async function loadWorkspaceOverview(
  clientSlugInput: string,
): Promise<WorkspaceDashboardView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
  }
}

export async function runPreauditWorkflow(url: string, email: string) {
  const website = normalizeWebsite(url)
  const normalizedEmail = normalizeEmail(email)
  await runRepoNodeScript('scripts/live/run-preaudit-live.ts', ['--url', website])
  const clientSlug = slugifyHostnameLabel(new URL(website).hostname)
  await readPreauditRun(clientSlug)
  await saveClientContext(clientSlug, {
    clientName: formatClientName(clientSlug),
    website,
    email: normalizedEmail,
  })

  return {
    clientSlug,
    website,
  }
}

export async function loadPreauditView(search: WorkflowSearch): Promise<PreauditView> {
  const clientSlug = await resolveClientSlug(search, 'preaudit')
  return loadPreauditViewForClient(clientSlug, search.url ? maybeUrlFromSearch(search.url) : undefined)
}

export async function loadAuditIntakeView(search: WorkflowSearch): Promise<AuditIntakeView> {
  const clientSlug = await resolveClientSlug(search, 'intake')
  return loadAuditIntakeViewForClient(clientSlug, search.url ? maybeUrlFromSearch(search.url) : undefined)
}

export async function saveAuditIntakeFromForm(formData: FormData) {
  const rawClientSlug = formData.get('clientSlug')
  const rawWebsite = formData.get('website')
  const clientSlug =
    typeof rawClientSlug === 'string' && rawClientSlug.trim().length > 0
      ? slugifyClientName(rawClientSlug)
      : await resolveClientSlug(
          {
            url: typeof rawWebsite === 'string' ? rawWebsite : undefined,
          },
          'intake',
        )
  const draftFile = await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug))
  const existingFile = await readJsonIfExists<AuditIntakeFile>(intakePath(clientSlug))
  const form = parseIntakeForm(formData)
  const payload = intakeFromForm(form, draftFile, existingFile)
  const outputPath = intakePath(clientSlug)

  await ensureDirectory(outputPath)
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await saveClientContext(clientSlug, {
    clientName: form.businessName.trim() || undefined,
    website:
      payload._autofilled_from_preaudit?.website ??
      (typeof rawWebsite === 'string' ? normalizeWebsite(rawWebsite) : undefined),
  })

  return {
    clientSlug,
    intakePath: outputPath,
    website:
      payload._autofilled_from_preaudit?.website ??
      (typeof rawWebsite === 'string' ? normalizeWebsite(rawWebsite) : DEFAULT_WEBSITE),
  }
}

export async function runAuditWorkflow(formData: FormData) {
  const saved = await saveAuditIntakeFromForm(formData)
  const pointer = await readLatestPointer(saved.clientSlug, 'preaudit')
  const preauditRunJsonPath = path.join(REPO_ROOT, pointer.path, 'run.json')

  await runRepoNodeScript('scripts/live/run-audit-live.ts', [
    '--intake',
    saved.intakePath,
    '--preaudit-run-json',
    preauditRunJsonPath,
  ])

  await readAuditRun(saved.clientSlug)

  return {
    clientSlug: saved.clientSlug,
    website: saved.website,
  }
}

export async function loadAuditView(search: WorkflowSearch): Promise<AuditView> {
  const clientSlug = await resolveClientSlug(search, 'audit')
  return loadAuditViewForClient(clientSlug, search.url ? maybeUrlFromSearch(search.url) : undefined)
}

export async function loadWorkspaceDiagnosis(
  clientSlugInput: string,
): Promise<WorkspaceDiagnosisView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
    preaudit: bundle.preaudit,
    intake: bundle.intake,
    audit: bundle.audit,
  }
}

export async function loadWorkspaceWorkstreams(
  clientSlugInput: string,
): Promise<WorkspaceWorkstreamsView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
    latestOutputs: bundle.artifacts,
  }
}

export async function loadWorkspaceAgents(
  clientSlugInput: string,
): Promise<WorkspaceAgentsView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
    latestOutputs: bundle.artifacts,
  }
}

export async function loadWorkspaceActivity(
  clientSlugInput: string,
): Promise<WorkspaceActivityView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
  }
}

export async function loadWorkspaceImpact(
  clientSlugInput: string,
): Promise<WorkspaceImpactView> {
  const bundle = await loadWorkspaceBundle(clientSlugInput)

  return {
    ...bundle.client,
    currentStage: bundle.currentStage,
    currentStageDetail: bundle.currentStageDetail,
    client: bundle.client,
    clientContext: bundle.clientContext,
    workflowRuns: bundle.workflowRuns,
    outputs: bundle.outputs,
    events: bundle.events,
    activity: bundle.activity,
    impact: bundle.impact,
    readiness: bundle.readiness,
    preauditStatus: bundle.preauditStatus,
    intakeStatus: bundle.intakeStatus,
    auditStatus: bundle.auditStatus,
    quickSummary: bundle.quickSummary,
    focusAreas: bundle.focusAreas,
    workflowStatus: bundle.workflowStatus,
    workstreams: bundle.workstreams,
    agents: bundle.agents,
    artifacts: bundle.artifacts,
    keyFacts: bundle.keyFacts,
    accountReadiness: bundle.accountReadiness,
    efficiencySignals: bundle.efficiencySignals,
    recommendedNextSection: bundle.recommendedNextSection,
    recommendedNextLabel: bundle.recommendedNextLabel,
    recommendedNextDetail: bundle.recommendedNextDetail,
  }
}
