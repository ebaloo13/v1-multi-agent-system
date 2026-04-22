import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import type {
  AuditIntakeView,
  AuditView,
  WorkspaceAgent,
  WorkspaceAgentsView,
  WorkspaceArtifactSummary,
  WorkspaceDashboardView,
  WorkspaceDiagnosisView,
  WorkspaceSectionId,
  WorkspaceWorkstream,
  WorkspaceWorkstreamsView,
  PreauditView,
  WorkspaceClient,
  WorkflowSearch,
} from './workflow'
import {
  DEFAULT_WEBSITE,
  formatClientName,
  type IntakeDraft,
  normalizeWebsite,
} from './product-shell'

type LatestPointer = {
  display_run_id: string
  run_id: string
  path: string
}

type PreauditValidatedOutput = {
  company_summary: string
  seo_score: number
  speed_score: number
  ux_score: number
  priority_alerts: string[]
  quick_wins: string[]
  summary: string
}

type PreauditRunJson = {
  display_run_id?: string
  client_slug?: string
  preaudit_data_path?: string
  preaudit_record_index?: number
  validated_output?: PreauditValidatedOutput
}

type AuditValidatedOutput = {
  company_summary: string
  industry: string
  main_pains: string[]
  available_data: string[]
  recommended_agents: string[]
  priority_order: string[]
  notes: string
}

type AuditRunJson = {
  display_run_id?: string
  client_slug?: string
  intake_path?: string
  validated_output?: AuditValidatedOutput
}

type ClientContextFile = {
  client_slug: string
  client_name?: string
  website?: string
  email?: string
  created_at: string
  updated_at: string
}

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

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

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

function clientsDataDir() {
  return path.join(REPO_ROOT, 'data', 'clients')
}

function clientArtifactsDir() {
  return path.join(REPO_ROOT, 'artifacts', 'clients')
}

function clientArtifactPath(clientSlug: string, agent: 'preaudit' | 'audit') {
  return path.join(clientArtifactsDir(), clientSlug, agent)
}

function intakeDraftPath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-audit-intake.draft.json`)
}

function intakePath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-audit-intake.json`)
}

function clientContextPath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-workspace.json`)
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

async function readJsonIfExists<T>(filePath: string): Promise<T | undefined> {
  try {
    return await readJsonFile<T>(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

async function readTextIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ''
    }

    throw error
  }
}

async function ensureDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function readMtimeMsIfExists(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    return stats.mtimeMs
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
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

async function findLatestClientSlugForAgent(agent: 'preaudit' | 'audit') {
  const root = clientArtifactsDir()
  const clients = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  let latest: { slug: string; mtimeMs: number } | undefined

  for (const client of clients) {
    if (!client.isDirectory()) {
      continue
    }

    const latestPath = path.join(root, client.name, agent, 'latest.json')
    const stats = await fs.stat(latestPath).catch(() => undefined)
    if (!stats) {
      continue
    }

    if (!latest || stats.mtimeMs > latest.mtimeMs) {
      latest = { slug: client.name, mtimeMs: stats.mtimeMs }
    }
  }

  return latest?.slug
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

async function readLatestPointer(clientSlug: string, agent: 'preaudit' | 'audit') {
  const latestPath = path.join(clientArtifactPath(clientSlug, agent), 'latest.json')
  const pointer = await readJsonIfExists<LatestPointer>(latestPath)

  if (!pointer) {
    throw new Error(`No latest ${agent} artifact found for client "${clientSlug}".`)
  }

  return pointer
}

async function readLatestPointerIfExists(clientSlug: string, agent: 'preaudit' | 'audit') {
  try {
    return await readLatestPointer(clientSlug, agent)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No latest')) {
      return undefined
    }

    throw error
  }
}

async function readPreauditRun(clientSlug: string) {
  const pointer = await readLatestPointer(clientSlug, 'preaudit')
  const runPath = path.join(REPO_ROOT, pointer.path, 'run.json')
  const runJson = await readJsonFile<PreauditRunJson>(runPath)
  const reportPath = path.join(REPO_ROOT, pointer.path, 'report.md')
  const report = await readTextIfExists(reportPath)

  if (!runJson.validated_output) {
    throw new Error(`Latest preaudit run for "${clientSlug}" is missing validated_output.`)
  }

  return {
    pointer,
    runPath,
    reportPath,
    report,
    runJson,
  }
}

async function readAuditRun(clientSlug: string) {
  const pointer = await readLatestPointer(clientSlug, 'audit')
  const runPath = path.join(REPO_ROOT, pointer.path, 'run.json')
  const runJson = await readJsonFile<AuditRunJson>(runPath)

  if (!runJson.validated_output) {
    throw new Error(`Latest audit run for "${clientSlug}" is missing validated_output.`)
  }

  return {
    pointer,
    runPath,
    runJson,
  }
}

async function readClientContext(clientSlug: string) {
  return readJsonIfExists<ClientContextFile>(clientContextPath(clientSlug))
}

async function saveClientContext(
  clientSlug: string,
  patch: {
    clientName?: string
    website?: string
    email?: string
  },
) {
  const existing = await readClientContext(clientSlug)
  const now = new Date().toISOString()
  const filePath = clientContextPath(clientSlug)
  const next: ClientContextFile = {
    client_slug: clientSlug,
    client_name: patch.clientName?.trim() || existing?.client_name || formatClientName(clientSlug),
    website: patch.website?.trim() || existing?.website || DEFAULT_WEBSITE,
    email: patch.email?.trim() || existing?.email,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  await ensureDirectory(filePath)
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

  return next
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

  return {
    clientSlug,
    clientName,
    website,
    email: context?.email,
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
  const focusAreas = deriveWorkspaceFocusAreas(clientSlug)
  const preauditSummary = preaudit?.summary ?? preaudit?.companySummary
  const topPain = audit?.mainPains[0]
  const savedSystems =
    intake?.form.systems.trim() || audit?.availableData.join(', ') || 'No confirmed operating system yet.'

  return focusAreas.map((title) => {
    switch (title) {
      case 'Website improvement': {
        const status = statusFromStage(currentStage, title)
        return {
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
      }
      case 'Sales follow-up': {
        const status = intake ? statusFromStage(currentStage, title) : 'needs input'
        return {
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
      }
      case 'Market study': {
        const status = statusFromStage(currentStage, title)
        return {
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
      }
      case 'CRM / back-office review': {
        const status = intake ? statusFromStage(currentStage, title) : 'needs input'
        return {
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
      }
      default: {
        const status = statusFromStage(currentStage, title)
        return {
          title,
          status,
          tone: toneFromWorkstreamStatus(status),
          whyItMatters: 'This workstream is part of the current transformation program.',
          linkedSource: audit ? 'audit' : preaudit ? 'preaudit' : 'workspace context',
          suggestedNextStep: 'Validate the next step before moving into execution.',
        }
      }
    }
  })
}

function deriveWorkspaceAgents(options: {
  currentStage: string
  workstreams: WorkspaceWorkstream[]
  intake?: AuditIntakeView
  audit?: AuditView
}): WorkspaceAgent[] {
  const { currentStage, workstreams, intake, audit } = options
  const recommended = new Set(audit?.recommendedAgents ?? [])
  const hasIntake = Boolean(intake)

  const cards: Array<Omit<WorkspaceAgent, 'tone'>> = [
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

  return cards.map((card) => ({
    ...card,
    tone: toneFromAgentStatus(card.status),
  }))
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
  const client = await buildWorkspaceClient(clientSlug, { draft, saved })
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
        ? 'Newer preaudit or Business Context exists after the last audit artifact. Confirm the details and run the full audit again.'
        : 'The preaudit is done and the missing Business Context is ready for the full audit step.'
      : preauditPointer
        ? 'The preaudit is complete. Review it, then complete Business Context before running the full audit.'
        : 'Client context exists locally, but no preaudit artifact has been generated yet.'

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
      'The audit artifact is current. Use it to move from diagnosis into workstreams and agent setup.'
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
              'Newer preaudit or Business Context exists after the current audit artifact.',
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
    currentStage,
    workstreams,
    intake,
    audit,
  })
  const artifacts: WorkspaceArtifactSummary[] = [
    {
      label: 'Preaudit artifact',
      value: preaudit?.displayRunId ?? 'Not generated',
      detail: preaudit ? preaudit.reportPath : 'No preaudit report linked yet.',
      href: '/workspace/' + clientSlug + '/diagnosis?panel=preaudit',
      tone: preaudit ? 'success' : 'pending',
    },
    {
      label: 'Business Context',
      value: intake ? (intake.source === 'saved' ? 'Saved' : 'Draft') : 'Missing',
      detail: intake
        ? 'Client operating context for the full audit.'
        : 'No Business Context record has been loaded yet.',
      href: '/workspace/' + clientSlug + '/diagnosis?panel=intake',
      tone: intake ? (intake.source === 'saved' ? 'success' : 'progress') : 'pending',
    },
    {
      label: 'Audit artifact',
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
        detail: 'Local file and artifact linkage continues to use the client slug.',
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
    artifacts,
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
