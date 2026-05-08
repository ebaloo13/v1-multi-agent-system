import type { WorkspaceOutputSummary } from './workflow'
import { slugifyClientName } from './workflow-slugs.server'

export function clientEntityId(clientSlug: string) {
  return `client:${clientSlug}`
}

export function workflowRunEntityId(clientSlug: string, runType: 'preaudit' | 'audit') {
  return `workflow_run:${clientSlug}:${runType}`
}

export function outputEntityId(clientSlug: string, outputType: WorkspaceOutputSummary['outputType']) {
  return `output:${clientSlug}:${outputType}`
}

export function workstreamEntityId(clientSlug: string, title: string) {
  return `workstream:${clientSlug}:${slugifyClientName(title)}`
}

export function clientAgentEntityId(clientSlug: string, agentKey: string) {
  return `client_agent:${clientSlug}:${agentKey}`
}
