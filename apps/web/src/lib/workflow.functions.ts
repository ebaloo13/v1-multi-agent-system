import { createServerFn } from '@tanstack/react-start'
import type { WorkflowSearch } from './workflow'
import {
  loadWorkspaceAgents,
  loadWorkspaceActivity,
  loadWorkspaceDiagnosis,
  loadWorkspaceOverview,
  loadWorkspaceWorkstreams,
  loadAuditIntakeView,
  loadAuditView,
  loadPreauditView,
  runAuditWorkflow,
  runPreauditWorkflow,
} from './workflow.server'

export const getPreauditView = createServerFn({ method: 'GET' })
  .inputValidator((data: WorkflowSearch) => data)
  .handler(async ({ data }) => {
    return loadPreauditView(data)
  })

export const getWorkspaceOverview = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return loadWorkspaceOverview(data.clientSlug)
  })

export const getWorkspaceDiagnosis = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return loadWorkspaceDiagnosis(data.clientSlug)
  })

export const getWorkspaceWorkstreams = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return loadWorkspaceWorkstreams(data.clientSlug)
  })

export const getWorkspaceAgents = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return loadWorkspaceAgents(data.clientSlug)
  })

export const getWorkspaceActivity = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return loadWorkspaceActivity(data.clientSlug)
  })

export const getAuditIntakeView = createServerFn({ method: 'GET' })
  .inputValidator((data: WorkflowSearch) => data)
  .handler(async ({ data }) => {
    return loadAuditIntakeView(data)
  })

export const getAuditView = createServerFn({ method: 'GET' })
  .inputValidator((data: WorkflowSearch) => data)
  .handler(async ({ data }) => {
    return loadAuditView(data)
  })

export const startPreaudit = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string; email: string }) => data)
  .handler(async ({ data }) => {
    return runPreauditWorkflow(data.url, data.email)
  })

export const saveAndRunAudit = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected form data.')
    }

    return data
  })
  .handler(async ({ data }) => {
    return runAuditWorkflow(data)
  })
