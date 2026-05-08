import path from 'node:path'

import { readJsonFile, readTextIfExists } from './workflow-file-readers.server'
import { readLatestPointer } from './workflow-latest-pointers.server'
import { REPO_ROOT } from './workflow-paths.server'

export type PreauditValidatedOutput = {
  company_summary: string
  seo_score: number
  speed_score: number
  ux_score: number
  priority_alerts: string[]
  quick_wins: string[]
  summary: string
}

export type PreauditRunJson = {
  display_run_id?: string
  client_slug?: string
  preaudit_data_path?: string
  preaudit_record_index?: number
  validated_output?: PreauditValidatedOutput
}

export type AuditValidatedOutput = {
  company_summary: string
  industry: string
  main_pains: string[]
  available_data: string[]
  recommended_agents: string[]
  priority_order: string[]
  notes: string
}

export type AuditRunJson = {
  display_run_id?: string
  client_slug?: string
  intake_path?: string
  validated_output?: AuditValidatedOutput
}

export async function readPreauditRun(clientSlug: string) {
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

export async function readAuditRun(clientSlug: string) {
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
