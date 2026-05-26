import { createServerFn } from '@tanstack/react-start'
import { ZodError } from 'zod'
import { runWorkItemAssistantAgent } from '../../../../src/agents/work-item-assistant-agent'
import {
  getDefaultWorkItemFunnel,
  listFunnels,
  selectFunnelForModule,
} from '../../../../src/core/funnels/store'
import {
  createWorkItemAssistantResult,
  createWorkItemConversationMessage,
  createWorkItem,
  listWorkItemAssistantResults,
  listWorkItemConversationMessages,
  listWorkItems,
  updateWorkItemStatus,
} from '../../../../src/core/work-items/store'
import {
  WorkItemStatusSchema,
  type BusinessModuleKey,
  type WorkItem,
  type WorkItemAssistantResult,
  type WorkItemConversationMessage,
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

type ClientWorkItemAssistantResultsInput = {
  clientSlug: string
  workItemId: string
}

type ClientWorkItemAssistantResultInput = ClientWorkItemAssistantResultsInput & {
  assistantKey: string
  stageId?: string
  summary: string
  suggestedNextAction: string
  confidence: WorkItemAssistantResult['confidence']
}

type RunClientWorkItemAssistantInput = ClientWorkItemAssistantResultsInput & {
  userMessage?: string
}

type ClientWorkItemConversationMessagesInput = ClientWorkItemAssistantResultsInput

type ClientWorkItemConversationMessageInput = ClientWorkItemConversationMessagesInput & {
  role: WorkItemConversationMessage['role']
  body: string
  assistantKey?: string
  source: WorkItemConversationMessage['source']
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

function parseConfidence(value: unknown): WorkItemAssistantResult['confidence'] {
  const confidence = normalizeText(value)

  if (confidence === 'low' || confidence === 'medium' || confidence === 'high') {
    return confidence
  }

  throw new Error('Confidence must be low, medium, or high.')
}

function parseConversationRole(value: unknown): WorkItemConversationMessage['role'] {
  const role = normalizeText(value)

  if (role === 'client' || role === 'user' || role === 'assistant' || role === 'system') {
    return role
  }

  throw new Error('Message role is invalid.')
}

function parseConversationSource(value: unknown): WorkItemConversationMessage['source'] {
  const source = normalizeText(value)

  if (source === 'client_workspace' || source === 'agent' || source === 'internal') {
    return source
  }

  throw new Error('Message source is invalid.')
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
  .handler(async ({ data }) => {
    const fallback = getDefaultWorkItemFunnel(data.clientSlug)

    try {
      const funnels = await listFunnels(data.clientSlug)
      return selectFunnelForModule(funnels, 'tasks', fallback)
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return fallback
      }

      throw error
    }
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

export const getClientWorkItemAssistantResults = createServerFn({ method: 'GET' })
  .inputValidator((data: ClientWorkItemAssistantResultsInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    return {
      clientSlug,
      workItemId,
    }
  })
  .handler(async ({ data }) => listWorkItemAssistantResults(data.clientSlug, data.workItemId))

export const createClientWorkItemAssistantResult = createServerFn({ method: 'POST' })
  .inputValidator((data: ClientWorkItemAssistantResultInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)
    const assistantKey = normalizeText(data.assistantKey)
    const stageId = normalizeText(data.stageId)
    const summary = normalizeText(data.summary)
    const suggestedNextAction = normalizeText(data.suggestedNextAction)
    const confidence = parseConfidence(data.confidence)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    if (!assistantKey) {
      throw new Error('Assistant is required.')
    }

    if (!summary) {
      throw new Error('Summary is required.')
    }

    if (!suggestedNextAction) {
      throw new Error('Suggested next action is required.')
    }

    return {
      clientSlug,
      workItemId,
      assistantKey,
      stageId: stageId || undefined,
      summary,
      suggestedNextAction,
      confidence,
    }
  })
  .handler(async ({ data }) => createWorkItemAssistantResult(data))

export const getClientWorkItemConversationMessages = createServerFn({ method: 'GET' })
  .inputValidator((data: ClientWorkItemConversationMessagesInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    return {
      clientSlug,
      workItemId,
    }
  })
  .handler(async ({ data }) => listWorkItemConversationMessages(data.clientSlug, data.workItemId))

export const createClientWorkItemConversationMessage = createServerFn({ method: 'POST' })
  .inputValidator((data: ClientWorkItemConversationMessageInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)
    const role = parseConversationRole(data.role)
    const body = normalizeText(data.body)
    const assistantKey = normalizeText(data.assistantKey)
    const source = parseConversationSource(data.source)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    if (!body) {
      throw new Error('Message body is required.')
    }

    return {
      clientSlug,
      workItemId,
      role,
      body,
      assistantKey: assistantKey || undefined,
      source,
    }
  })
  .handler(async ({ data }) => createWorkItemConversationMessage(data))

export const runClientWorkItemAssistant = createServerFn({ method: 'POST' })
  .inputValidator((data: RunClientWorkItemAssistantInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)
    const userMessage = normalizeText(data.userMessage)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    return {
      clientSlug,
      workItemId,
      userMessage: userMessage || undefined,
    }
  })
  .handler(async ({ data }) => {
    const workItems = await listWorkItems(data.clientSlug)
    const workItem = workItems.find((item) => item.id === data.workItemId)

    if (!workItem) {
      throw new Error('Work item was not found.')
    }

    const fallback = getDefaultWorkItemFunnel(data.clientSlug)
    let funnel = fallback

    try {
      const funnels = await listFunnels(data.clientSlug)
      funnel = selectFunnelForModule(funnels, workItem.moduleKey, fallback)
    } catch (error) {
      if (!(error instanceof SyntaxError || error instanceof ZodError)) {
        throw error
      }
    }

    const currentStage = funnel.stages.find((stage) => stage.status === workItem.status)

    if (!currentStage) {
      throw new Error('Current funnel stage was not found for this work item.')
    }

    if (!currentStage.assistantKey) {
      throw new Error('No assistant is assigned to the current funnel stage.')
    }

    if (data.userMessage) {
      await createWorkItemConversationMessage({
        clientSlug: data.clientSlug,
        workItemId: workItem.id,
        role: 'user',
        body: data.userMessage,
        source: 'client_workspace',
      })
    }

    const assistantOutput = await runWorkItemAssistantAgent({
      clientSlug: data.clientSlug,
      workItem: {
        title: workItem.title,
        description: workItem.description,
        type: workItem.type,
        status: workItem.status,
      },
      stageLabel: currentStage.label,
      assistantKey: currentStage.assistantKey,
      automationPolicy: currentStage.automationPolicy,
      userMessage: data.userMessage,
    })

    const assistantResult = await createWorkItemAssistantResult({
      clientSlug: data.clientSlug,
      workItemId: workItem.id,
      assistantKey: currentStage.assistantKey,
      stageId: currentStage.id,
      summary: assistantOutput.summary,
      suggestedNextAction: assistantOutput.suggestedNextAction,
      confidence: assistantOutput.confidence,
    })

    await createWorkItemConversationMessage({
      clientSlug: data.clientSlug,
      workItemId: workItem.id,
      role: 'assistant',
      body: `${assistantOutput.summary}\n\nSuggested next action: ${assistantOutput.suggestedNextAction}`,
      assistantKey: currentStage.assistantKey,
      source: 'agent',
    })

    return assistantResult
  })
