import { createServerFn } from '@tanstack/react-start'
import { ZodError } from 'zod'
import {
  runWorkItemAssistantAgent,
  WORK_ITEM_ASSISTANT_CONVERSATION_HISTORY_LIMIT,
  type WorkItemAssistantConversationHistoryMessage,
  type WorkItemAssistantTargetStage,
} from '../../../../src/agents/work-item-assistant-agent'
import {
  addFunnelStage,
  getDefaultWorkItemFunnel,
  listFunnels,
  selectFunnelForModule,
  updateFunnelStage,
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
  WorkItemAssistantSuggestedActionSchema,
  WorkItemStatusSchema,
  type BusinessModuleKey,
  type Funnel,
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
  suggestedAction?: WorkItemSuggestedAction
  confidence: WorkItemAssistantResult['confidence']
}

type RunClientWorkItemAssistantInput = ClientWorkItemAssistantResultsInput & {
  userMessage?: string
}

type UpdateClientFunnelStageSettingsInput = {
  clientSlug: string
  funnelId: string
  stageId: string
  label?: string
  description?: string
  assistantKey?: string
  canMoveStage?: boolean
  state?: FunnelStageState
}

type CreateClientFunnelStageInput = {
  clientSlug: string
  funnelId: string
  label: string
  description?: string
  status?: WorkItemStatus
  state?: FunnelStageState
  assistantKey?: string
  canMoveStage?: boolean
}

type FunnelStageState = NonNullable<Funnel['stages'][number]['state']>

type WorkItemSuggestedAction = NonNullable<WorkItemAssistantResult['suggestedAction']>

type ApplyClientWorkItemSuggestedActionInput = ClientWorkItemAssistantResultsInput & {
  suggestedAction: WorkItemSuggestedAction
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

function parseFunnelStageState(value: unknown): FunnelStageState | undefined {
  const state = normalizeText(value)

  if (!state) {
    return undefined
  }

  if (state === 'open' || state === 'won' || state === 'lost' || state === 'closed') {
    return state
  }

  throw new Error('Stage type is invalid.')
}

function parseStageLabel(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const label = normalizeText(value)

  if (!label) {
    throw new Error('Stage name is required.')
  }

  if (label.length > 80) {
    throw new Error('Stage name must be 80 characters or fewer.')
  }

  return label
}

function parseStageDescription(value: unknown): string | undefined {
  const description = normalizeText(value)

  if (!description) {
    return undefined
  }

  if (description.length > 500) {
    throw new Error('Stage description must be 500 characters or fewer.')
  }

  return description
}

async function selectWorkItemFunnel(clientSlug: string, workItem: WorkItem) {
  const fallback = getDefaultWorkItemFunnel(clientSlug)

  try {
    const funnels = await listFunnels(clientSlug)
    return selectFunnelForModule(funnels, workItem.moduleKey, fallback)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return fallback
    }

    throw error
  }
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

export const updateClientFunnelStageSettings = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateClientFunnelStageSettingsInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const funnelId = normalizeText(data.funnelId)
    const stageId = normalizeText(data.stageId)
    const label = parseStageLabel(data.label)
    const description = parseStageDescription(data.description)
    const assistantKey = normalizeText(data.assistantKey)
    const canMoveStage = data.canMoveStage
    const state = parseFunnelStageState(data.state)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!funnelId) {
      throw new Error('Funnel is required.')
    }

    if (!stageId) {
      throw new Error('Stage is required.')
    }

    if (canMoveStage !== undefined && typeof canMoveStage !== 'boolean') {
      throw new Error('Move stage setting must be true or false.')
    }

    return {
      clientSlug,
      funnelId,
      stageId,
      label,
      description,
      assistantKey: assistantKey || undefined,
      canMoveStage,
      state,
    }
  })
  .handler(async ({ data }) => updateFunnelStage(data.clientSlug, data.funnelId, data.stageId, {
    label: data.label,
    description: data.description,
    assistantKey: data.assistantKey,
    canMoveStage: data.canMoveStage,
    state: data.state,
  }))

export const createClientFunnelStage = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateClientFunnelStageInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const funnelId = normalizeText(data.funnelId)
    const label = parseStageLabel(data.label)
    const description = parseStageDescription(data.description)
    const status = data.status === undefined ? undefined : WorkItemStatusSchema.parse(normalizeText(data.status))
    const state = parseFunnelStageState(data.state)
    const assistantKey = normalizeText(data.assistantKey)
    const canMoveStage = data.canMoveStage

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!funnelId) {
      throw new Error('Funnel is required.')
    }

    if (!label) {
      throw new Error('Stage name is required.')
    }

    if (canMoveStage !== undefined && typeof canMoveStage !== 'boolean') {
      throw new Error('Move stage setting must be true or false.')
    }

    return {
      clientSlug,
      funnelId,
      label,
      description,
      status,
      state,
      assistantKey: assistantKey || undefined,
      canMoveStage,
    }
  })
  .handler(async ({ data }) => addFunnelStage(data.clientSlug, data.funnelId, {
    label: data.label,
    description: data.description,
    status: data.status,
    state: data.state,
    assistantKey: data.assistantKey,
    canMoveStage: data.canMoveStage,
  }))

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
    const suggestedAction = data.suggestedAction
      ? WorkItemAssistantSuggestedActionSchema.parse(data.suggestedAction)
      : undefined
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
      suggestedAction,
      confidence,
    }
  })
  .handler(async ({ data }) => createWorkItemAssistantResult(data))

export const applyClientWorkItemSuggestedAction = createServerFn({ method: 'POST' })
  .inputValidator((data: ApplyClientWorkItemSuggestedActionInput) => {
    const clientSlug = normalizeText(data.clientSlug)
    const workItemId = normalizeText(data.workItemId)
    const suggestedAction = WorkItemAssistantSuggestedActionSchema.parse(data.suggestedAction)

    if (!clientSlug) {
      throw new Error('Client is required.')
    }

    if (!workItemId) {
      throw new Error('Work item is required.')
    }

    return {
      clientSlug,
      workItemId,
      suggestedAction,
    }
  })
  .handler(async ({ data }) => {
    if (data.suggestedAction.type !== 'move_stage') {
      throw new Error(`Suggested action type "${data.suggestedAction.type}" is not supported yet.`)
    }

    if (!data.suggestedAction.targetStatus) {
      throw new Error('Move stage suggested actions require a target status.')
    }

    const workItems = await listWorkItems(data.clientSlug)
    const currentWorkItem = workItems.find((workItem) => workItem.id === data.workItemId)

    if (!currentWorkItem) {
      throw new Error('Work item was not found.')
    }

    const funnel = await selectWorkItemFunnel(data.clientSlug, currentWorkItem)
    const currentStage = funnel.stages.find((stage) => stage.status === currentWorkItem.status)

    if (!currentStage) {
      throw new Error('Current funnel stage was not found for this work item.')
    }

    if (currentStage.automationPolicy?.canMoveStage !== true) {
      throw new Error('Move stage suggested actions are not allowed from the current stage.')
    }

    const workItem = await updateWorkItemStatus(data.clientSlug, data.workItemId, data.suggestedAction.targetStatus)
    return serializeWorkItem(workItem)
  })

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

    const funnel = await selectWorkItemFunnel(data.clientSlug, workItem)

    const currentStage = funnel.stages.find((stage) => stage.status === workItem.status)

    if (!currentStage) {
      throw new Error('Current funnel stage was not found for this work item.')
    }

    if (!currentStage.assistantKey) {
      throw new Error('No assistant is assigned to the current funnel stage.')
    }

    const conversationHistory = await listWorkItemConversationMessages(data.clientSlug, workItem.id)
    let nextConversationHistory = conversationHistory

    if (data.userMessage) {
      const userMessage = await createWorkItemConversationMessage({
        clientSlug: data.clientSlug,
        workItemId: workItem.id,
        role: 'user',
        body: data.userMessage,
        source: 'client_workspace',
      })
      nextConversationHistory = [...conversationHistory, userMessage]
    }

    const compactConversationHistory: WorkItemAssistantConversationHistoryMessage[] = nextConversationHistory
      .slice(-WORK_ITEM_ASSISTANT_CONVERSATION_HISTORY_LIMIT)
      .map((message) => ({
        role: message.role,
        body: message.body,
        createdAt: message.createdAt,
      }))
    const availableTargetStages: WorkItemAssistantTargetStage[] = funnel.stages.map((stage) => ({
      label: stage.label,
      status: stage.status,
    }))

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
      availableTargetStages,
      userMessage: data.userMessage,
      conversationHistory: compactConversationHistory,
    })

    const assistantResult = await createWorkItemAssistantResult({
      clientSlug: data.clientSlug,
      workItemId: workItem.id,
      assistantKey: currentStage.assistantKey,
      stageId: currentStage.id,
      summary: assistantOutput.summary,
      suggestedNextAction: assistantOutput.suggestedNextAction,
      suggestedAction: assistantOutput.suggestedAction,
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
