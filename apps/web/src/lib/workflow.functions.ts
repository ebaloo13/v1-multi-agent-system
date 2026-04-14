import { createServerFn } from '@tanstack/react-start'
import type { WorkflowSearch } from './workflow'
import {
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
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    return runPreauditWorkflow(data.url)
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
