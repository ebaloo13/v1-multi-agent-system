import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import type {
  AuditIntakeView,
  AuditView,
  PreauditView,
  WorkflowSearch,
} from './workflow'
import { DEFAULT_WEBSITE, type IntakeDraft, normalizeWebsite } from './product-shell'

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

export async function runPreauditWorkflow(url: string) {
  const website = normalizeWebsite(url)
  await runRepoNodeScript('scripts/live/run-preaudit-live.ts', ['--url', website])
  const clientSlug = slugifyHostnameLabel(new URL(website).hostname)
  await readPreauditRun(clientSlug)

  return {
    clientSlug,
    website,
  }
}

export async function loadPreauditView(search: WorkflowSearch): Promise<PreauditView> {
  const clientSlug = await resolveClientSlug(search, 'preaudit')
  const { pointer, reportPath, report, runJson } = await readPreauditRun(clientSlug)
  const website = await deriveWebsiteFromPreaudit(runJson, clientSlug)
  const summary = parseSectionParagraph(report, 'Executive Summary') || runJson.validated_output!.summary
  const businessImpact = parseSectionBullets(report, 'Business Impact')

  return {
    clientSlug,
    website: maybeUrlFromSearch(search.url || website),
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

export async function loadAuditIntakeView(search: WorkflowSearch): Promise<AuditIntakeView> {
  const clientSlug = await resolveClientSlug(search, 'intake')
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
    base._autofilled_from_preaudit?.website ??
    draft?._autofilled_from_preaudit?.website ??
    maybeUrlFromSearch(search.url)

  return {
    clientSlug,
    website,
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
  const { pointer, runJson } = await readAuditRun(clientSlug)
  const draft = await readJsonIfExists<AuditIntakeFile>(intakeDraftPath(clientSlug))

  return {
    clientSlug,
    website: maybeUrlFromSearch(search.url || draft?._autofilled_from_preaudit?.website),
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
