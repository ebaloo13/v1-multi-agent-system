import { createServerFn } from '@tanstack/react-start'
import { getDefaultWorkItemFunnel } from '../../../../src/core/funnels/store'
import {
  createWorkItem,
  listWorkItems,
  updateWorkItemStatus,
} from '../../../../src/core/work-items/store'
import {
  WorkItemStatusSchema,
  type BusinessModuleKey,
  type WorkItem,
  type WorkItemStatus,
  type WorkItemType,
} from '../../../../src/schemas/operations'

type ClientWorkItemInput = {
  clientSlug: string
  title: string
  description?: string
  requestType: string
}

type ClientWorkItemStatusInput = {
  clientSlug: string
  workItemId: string
  status: WorkItemStatus
}

type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson }

type SerializableWorkItem = Omit<WorkItem, 'metadata'> & {
  metadata: Record<string, SerializableJson>
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function serializeWorkItem(workItem: WorkItem): SerializableWorkItem {
  return JSON.parse(JSON.stringify(workItem)) as SerializableWorkItem
}

function workItemMapping(requestType: string): {
  type: WorkItemType
  moduleKey: BusinessModuleKey
} {
  switch (requestType) {
    case 'Review':
      return { type: 'file_review', moduleKey: 'files' }
    case 'File':
      return { type: 'file_review', moduleKey: 'files' }
    case 'Support':
      return { type: 'support', moduleKey: 'tasks' }
    default:
      return { type: 'task', moduleKey: 'tasks' }
  }
}

export const getClientWorkItems = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    const workItems = await listWorkItems(data.clientSlug)
    return workItems.map(serializeWorkItem)
  })

export const getClientWorkItemFunnel = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => getDefaultWorkItemFunnel(data.clientSlug))

export const createClientWorkItem = createServerFn({ method: 'POST' })
  .inputValidator((data: ClientWorkItemInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const title = normalizeText(data.title)
    const description = normalizeText(data.description)
    const requestType = normalizeText(data.requestType) || 'Request'

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!title) {
      throw new Error('Request title is required.')
    }

    return {
      clientSlug,
      title,
      description,
      requestType,
    }
  })
  .handler(async ({ data }): Promise<SerializableWorkItem> => {
    const { type, moduleKey } = workItemMapping(data.requestType)
    const workItem = await createWorkItem(data.clientSlug, {
      type,
      moduleKey,
      title: data.title,
      description: data.description || undefined,
      status: 'new',
      source: 'manual',
      metadata: {
        requestType: data.requestType,
      },
    })

    return serializeWorkItem(workItem)
  })

export const updateClientWorkItemStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: ClientWorkItemStatusInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)
    const status = WorkItemStatusSchema.parse(normalizeText(data.status))

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    return {
      clientSlug,
      workItemId,
      status,
    }
  })
  .handler(async ({ data }) => {
    const workItem = await updateWorkItemStatus(data.clientSlug, data.workItemId, data.status)
    return serializeWorkItem(workItem)
  })
