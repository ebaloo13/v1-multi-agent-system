import { createServerFn } from '@tanstack/react-start'
import { appendClientEvent } from '../../../../src/core/events/store'
import {
  createWorkItem,
  listWorkItems,
  type BusinessModuleKey,
  type WorkItem,
  type WorkItemType,
} from '../../../../src/core/work-items/store'

type ClientWorkItemInput = {
  clientSlug: string
  title: string
  description?: string
  requestType: string
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
    return listWorkItems(data.clientSlug)
  })

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
  .handler(async ({ data }): Promise<WorkItem> => {
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

    await appendClientEvent(data.clientSlug, {
      type: 'work_item.created',
      entityType: 'work_item',
      entityId: workItem.id,
      message: `New request created: ${workItem.title}`,
      visibility: 'internal',
      metadata: {
        workItemType: workItem.type,
        workItemStatus: workItem.status,
      },
    })

    return workItem
  })
