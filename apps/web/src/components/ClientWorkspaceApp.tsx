import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Bell,
  CalendarDays,
  CheckSquare,
  X,
  ChevronDown,
  Files,
  Folder,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserCircle,
} from 'lucide-react'
import {
  applyClientWorkItemSuggestedAction,
  createClientWorkItem,
  getClientWorkItemConversationMessages,
  runClientWorkItemAssistant,
  updateClientFunnelStageSettings,
  updateClientWorkItemStatus,
} from '../lib/client-work-items.functions'
import { formatClientName } from '../lib/product-shell'
import { messageFromError } from '../lib/workflow'
import type {
  Funnel,
  WorkItem,
  WorkItemAssistantResult,
  WorkItemConversationMessage,
} from '../../../../src/schemas/operations'

type ClientWorkspaceView = 'home' | 'newRequest' | 'reviews' | 'files' | 'chat' | 'settings'

type ClientWorkspaceAppProps = {
  clientSlug: string
  view: ClientWorkspaceView
  workItems?: WorkItem[]
  funnel?: Funnel
}

type ClientRequestStatus = 'new' | 'inProgress' | 'waiting' | 'needsReview' | 'ready' | 'done'

type ClientRequest = {
  id: string
  title: string
  description?: string
  type: 'Request' | 'Review' | 'File' | 'Support'
  status: ClientRequestStatus
  workItemStatus: WorkItem['status']
  handlingLabel?: string
  updatedAt: string
}

type ClientBoardColumn = {
  id: ClientRequestStatus
  label: string
  tone: 'new' | 'progress' | 'waiting' | 'review' | 'ready' | 'done'
  workItemStatus: WorkItem['status']
}

type FunnelStage = Funnel['stages'][number]
type StageAutomationPolicy = NonNullable<FunnelStage['automationPolicy']>
type WorkItemSuggestedAction = NonNullable<WorkItemAssistantResult['suggestedAction']>
type AssistantRun = {
  result: WorkItemAssistantResult
  userMessage?: string
}

const statusColumns: ClientBoardColumn[] = [
  { id: 'new', label: 'New', tone: 'new', workItemStatus: 'new' },
  { id: 'inProgress', label: 'In Progress', tone: 'progress', workItemStatus: 'in_progress' },
  { id: 'waiting', label: 'Waiting', tone: 'waiting', workItemStatus: 'waiting' },
  { id: 'needsReview', label: 'Needs Review', tone: 'review', workItemStatus: 'needs_review' },
  { id: 'ready', label: 'Ready', tone: 'ready', workItemStatus: 'ready' },
  { id: 'done', label: 'Done', tone: 'done', workItemStatus: 'done' },
]

const automationCapabilityLabels: Array<{ key: keyof StageAutomationPolicy; label: string }> = [
  { key: 'canMoveStage', label: 'Move stage' },
  { key: 'canCloseAsWon', label: 'Close as won' },
  { key: 'canCloseAsLost', label: 'Close as lost' },
  { key: 'canCreateInternalNote', label: 'Internal notes' },
  { key: 'canApplyTags', label: 'Apply tags' },
  { key: 'canTriggerWorkflow', label: 'Trigger workflow' },
  { key: 'requiresHumanApproval', label: 'Human approval required' },
]

export default function ClientWorkspaceApp({
  clientSlug,
  view,
  workItems = [],
  funnel,
}: ClientWorkspaceAppProps) {
  const clientName = formatClientName(clientSlug || 'generic-client')
  const requests = workItems.map(workItemToClientRequest)
  const reviewRequests = requests.filter((request) => request.status === 'needsReview')
  const fileRequests = workItems.filter(isFileWorkItem).map(workItemToClientRequest)
  const transitionStages = sortFunnelStages(funnel?.stages ?? statusColumns.map(boardColumnToFunnelStage))
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null)
  const updateStatus = useServerFn(updateClientWorkItemStatus)
  const selectedRequest = requests.find((request) => request.id === selectedRequestId)

  function closeDetailDrawer() {
    setSelectedRequestId(null)
    setStatusErrorMessage(null)
  }

  async function handleStageTransition(stage: Funnel['stages'][number]) {
    if (!selectedRequest || stage.status === selectedRequest.workItemStatus) {
      return
    }

    setIsUpdatingStatus(true)
    setStatusErrorMessage(null)

    try {
      await updateStatus({
        data: {
          clientSlug,
          workItemId: selectedRequest.id,
          status: stage.status,
        },
      })

      window.location.reload()
    } catch (error) {
      setStatusErrorMessage(messageFromError(error))
      setIsUpdatingStatus(false)
    }
  }

  return (
    <main className="client-workspace-app">
      <ClientIconSidebar clientSlug={clientSlug} activeView={view} />
      <section className="client-workspace-main">
        <ClientTopbar clientName={clientName} />
        {view === 'home' ? (
          <ClientKanbanView
            clientName={clientName}
            clientSlug={clientSlug}
            requests={requests}
            funnel={funnel}
            onOpenRequest={setSelectedRequestId}
          />
        ) : null}
        {view === 'newRequest' ? <NewRequestView clientName={clientName} clientSlug={clientSlug} /> : null}
        {view === 'reviews' ? <ReviewsView requests={reviewRequests} /> : null}
        {view === 'files' ? <FilesView requests={fileRequests} /> : null}
        {view === 'chat' ? <ChatView clientSlug={clientSlug} /> : null}
        {view === 'settings' ? <SettingsView clientName={clientName} /> : null}
      </section>
      <a
        href={`/workspace/${encodeURIComponent(clientSlug)}/chat`}
        className="client-chat-button"
        aria-label="Open chat"
      >
        <MessageCircle size={20} />
      </a>
      {selectedRequest ? (
        <ClientRequestDetailDrawer
          clientSlug={clientSlug}
          request={selectedRequest}
          transitionStages={transitionStages}
          isUpdatingStatus={isUpdatingStatus}
          errorMessage={statusErrorMessage}
          onClose={closeDetailDrawer}
          onTransition={handleStageTransition}
        />
      ) : null}
    </main>
  )
}

function ClientIconSidebar({
  clientSlug,
  activeView,
}: {
  clientSlug: string
  activeView: ClientWorkspaceView
}) {
  const basePath = `/workspace/${encodeURIComponent(clientSlug)}`
  const items = [
    { id: 'home', label: 'Home', href: basePath, icon: Home },
    { id: 'newRequest', label: 'Requests', href: `${basePath}/new-request`, icon: CheckSquare },
    { id: 'reviews', label: 'Reviews', href: `${basePath}/reviews`, icon: List },
    { id: 'files', label: 'Files', href: `${basePath}/files`, icon: Folder },
    { id: 'chat', label: 'Chat', href: `${basePath}/chat`, icon: MessageCircle },
    { id: 'settings', label: 'Settings', href: `${basePath}/settings`, icon: Settings },
  ] as const

  return (
    <aside className="client-icon-sidebar" aria-label="Client workspace navigation">
      <a href={basePath} className="client-sidebar-logo" aria-label="Home">
        C
      </a>
      <nav>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeView

          return (
            <a
              key={item.id}
              href={item.href}
              className={isActive ? 'client-sidebar-icon is-active' : 'client-sidebar-icon'}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}

function ClientTopbar({ clientName }: { clientName: string }) {
  return (
    <header className="client-topbar">
      <div>
        <span>Workspace</span>
        <strong>{clientName}</strong>
      </div>
      <div className="client-topbar-actions">
        <button type="button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <button type="button" aria-label="Profile">
          <UserCircle size={21} />
        </button>
      </div>
    </header>
  )
}

function ClientKanbanView({
  clientName,
  clientSlug,
  requests,
  funnel,
  onOpenRequest,
}: {
  clientName: string
  clientSlug: string
  requests: ClientRequest[]
  funnel?: Funnel
  onOpenRequest?: (requestId: string) => void
}) {
  const stages = sortFunnelStages(funnel?.stages ?? statusColumns.map(boardColumnToFunnelStage))
  const columns = stages.map((stage) => ({
    stage,
    column: funnelStageToBoardColumn(stage),
  }))
  const funnelLabel = funnel?.label ?? 'Work Items'
  const funnelId = funnel?.id
  const [selectedSettingsStage, setSelectedSettingsStage] = useState<FunnelStage | null>(null)

  return (
    <>
      <ClientToolbar clientName={clientName} clientSlug={clientSlug} />
      {requests.length === 0 ? (
        <div className="client-empty-card">
          <CheckSquare size={24} />
          <strong>No requests yet.</strong>
          <p>New requests and work items will appear here once they are created.</p>
          <a href={`/workspace/${encodeURIComponent(clientSlug)}/new-request`} className="client-primary-button">
            <Plus size={16} />
            New Request
          </a>
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.1rem 0',
        }}
      >
        <span className="client-type-badge">Funnel</span>
        <strong style={{ color: '#17202a', fontSize: '0.9rem' }}>{funnelLabel}</strong>
      </div>
      <section className="client-kanban-board">
        {columns.map(({ column, stage }) => {
          const columnRequests = requests.filter((request) => request.workItemStatus === column.workItemStatus)

          return (
            <article key={column.id} className={`client-kanban-column tone-${column.tone}`}>
              <header>
                <div>
                  <span className={`client-status-dot tone-${column.tone}`} />
                  <strong>{column.label}</strong>
                  <em>{columnRequests.length}</em>
                </div>
                <button
                  type="button"
                  className="client-icon-button"
                  aria-label={`Open ${stage.label} stage settings`}
                  title={`${stage.label} settings`}
                  onClick={() => setSelectedSettingsStage(stage)}
                >
                  <Settings size={15} />
                </button>
              </header>
              <div className="client-request-stack">
                {columnRequests.map((request, index) => (
                  <ClientRequestCard
                    key={`${request.id}-${index}`}
                    request={request}
                    onOpen={onOpenRequest ? () => onOpenRequest(request.id) : undefined}
                  />
                ))}
              </div>
            </article>
          )
        })}
      </section>
      {selectedSettingsStage ? (
        <StageSettingsPanel
          clientSlug={clientSlug}
          funnelId={funnelId}
          stage={selectedSettingsStage}
          onClose={() => setSelectedSettingsStage(null)}
        />
      ) : null}
    </>
  )
}

function StageSettingsPanel({
  clientSlug,
  funnelId,
  stage,
  onClose,
}: {
  clientSlug: string
  funnelId?: string
  stage: FunnelStage
  onClose: () => void
}) {
  const updateStageSettings = useServerFn(updateClientFunnelStageSettings)
  const [assistantKey, setAssistantKey] = useState(stage.assistantKey ?? '')
  const [canMoveStage, setCanMoveStage] = useState(stage.automationPolicy?.canMoveStage === true)
  const [isSavingStageSettings, setIsSavingStageSettings] = useState(false)
  const [stageSettingsErrorMessage, setStageSettingsErrorMessage] = useState<string | null>(null)
  const displayedAutomationPolicy: FunnelStage['automationPolicy'] = {
    ...(stage.automationPolicy ?? {}),
    canMoveStage,
  }
  const capabilities = enabledAutomationCapabilities(displayedAutomationPolicy)
  const trimmedAssistantKey = assistantKey.trim()
  const isAiAssisted = Boolean(trimmedAssistantKey)
  const isHumanStage = !trimmedAssistantKey || stage.automationPolicy?.requiresHumanApproval === true

  useEffect(() => {
    setAssistantKey(stage.assistantKey ?? '')
    setCanMoveStage(stage.automationPolicy?.canMoveStage === true)
    setStageSettingsErrorMessage(null)
  }, [stage.id, stage.assistantKey, stage.automationPolicy?.canMoveStage])

  async function handleSaveStageSettings() {
    if (!funnelId || isSavingStageSettings) {
      return
    }

    setIsSavingStageSettings(true)
    setStageSettingsErrorMessage(null)

    try {
      await updateStageSettings({
        data: {
          clientSlug,
          funnelId,
          stageId: stage.id,
          assistantKey: assistantKey.trim() || undefined,
          canMoveStage,
        },
      })

      window.location.reload()
    } catch (error) {
      setStageSettingsErrorMessage(messageFromError(error))
      setIsSavingStageSettings(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-settings-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(17, 24, 39, 0.28)',
      }}
    >
      <button
        type="button"
        aria-label="Close stage settings"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          background: 'transparent',
          cursor: 'default',
        }}
      />
      <aside
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          width: 'min(380px, 100%)',
          height: '100%',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          borderLeft: '1px solid rgba(20, 29, 38, 0.12)',
          background: '#ffffff',
          padding: '1.1rem',
          boxShadow: '-24px 0 50px rgba(20, 29, 38, 0.16)',
        }}
      >
        <header className="client-card-head">
          <div>
            <span className="client-type-badge">Stage settings</span>
            <h2 id="stage-settings-title" style={{ margin: '0.75rem 0 0', fontSize: '1.25rem' }}>
              {stage.label}
            </h2>
          </div>
          <button type="button" className="client-icon-button" aria-label="Close stage settings" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Stage editing will be available here. For now, update assistant assignment and move-stage automation.
        </p>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ color: '#17202a', fontSize: '0.8rem', fontWeight: 800 }}>Assistant key</span>
            <input
              type="text"
              value={assistantKey}
              onChange={(event) => setAssistantKey(event.currentTarget.value)}
              placeholder="No assistant assigned"
              style={{
                width: '100%',
                border: '1px solid rgba(20, 29, 38, 0.14)',
                borderRadius: '8px',
                padding: '0.6rem 0.65rem',
                color: '#17202a',
                font: 'inherit',
                fontSize: '0.86rem',
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#17202a',
              fontSize: '0.84rem',
              fontWeight: 800,
            }}
          >
            <input
              type="checkbox"
              checked={canMoveStage}
              onChange={(event) => setCanMoveStage(event.currentTarget.checked)}
            />
            Move stage automation
          </label>
          <button
            type="button"
            className="client-shortcut-link"
            disabled={!funnelId || isSavingStageSettings}
            onClick={handleSaveStageSettings}
            style={{ alignSelf: 'flex-start' }}
          >
            {isSavingStageSettings ? 'Saving...' : 'Save settings'}
          </button>
          {!funnelId ? (
            <p className="client-form-error">A funnel is required before stage settings can be saved.</p>
          ) : null}
          {stageSettingsErrorMessage ? <p className="client-form-error">{stageSettingsErrorMessage}</p> : null}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <StageSettingRow label="Label" value={stage.label} />
          <StageSettingRow label="Status" value={`${workItemStatusLabel(stage.status)} (${stage.status})`} />
          <StageSettingRow label="State" value={stage.state ?? 'open'} />
          <StageSettingRow label="Assistant" value={trimmedAssistantKey || 'No assistant assigned'} />
          <StageSettingRow label="AI-assisted stage" value={isAiAssisted ? 'Yes' : 'No'} />
          <StageSettingRow label="Human stage" value={isHumanStage ? 'Yes' : 'No'} />
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <strong style={{ color: '#17202a', fontSize: '0.86rem' }}>Automation capabilities</strong>
          {capabilities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {capabilities.map((capability) => (
                <span key={capability} className="client-type-badge">
                  {capability}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#8a94a3', fontSize: '0.82rem', lineHeight: 1.45 }}>
              No automation capabilities enabled.
            </p>
          )}
        </section>
      </aside>
    </div>
  )
}

function StageSettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ color: '#8a94a3', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: '#17202a', fontSize: '0.9rem', fontWeight: 750, lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  )
}

function ClientToolbar({ clientName, clientSlug }: { clientName: string; clientSlug: string }) {
  return (
    <div className="client-workspace-toolbar">
      <div className="client-toolbar-left">
        <button type="button" className="client-workspace-selector">
          {clientName}
          <ChevronDown size={15} />
        </button>
        <button type="button" className="client-icon-button is-active" aria-label="Board view">
          <LayoutGrid size={17} />
        </button>
        <button type="button" className="client-icon-button" aria-label="List view">
          <List size={17} />
        </button>
        <a href={`/workspace/${encodeURIComponent(clientSlug)}/reviews`} className="client-shortcut-link">
          Reviews
        </a>
        <a href={`/workspace/${encodeURIComponent(clientSlug)}/files`} className="client-shortcut-link">
          Files
        </a>
        <label className="client-search">
          <Search size={16} />
          <input type="search" placeholder="Search requests" />
        </label>
      </div>
      <div className="client-toolbar-right">
        <div className="client-filter-group" aria-label="Status filters">
          <button type="button" className="is-active">Open</button>
          <button type="button">All</button>
          <button type="button">Closed</button>
        </div>
        <button type="button" className="client-icon-button" aria-label="Filters">
          <SlidersHorizontal size={17} />
        </button>
        <a href={`/workspace/${encodeURIComponent(clientSlug)}/new-request`} className="client-primary-button">
          <Plus size={16} />
          New Request
        </a>
      </div>
    </div>
  )
}

function ClientRequestCard({
  request,
  onOpen,
}: {
  request: ClientRequest
  onOpen?: () => void
}) {
  const content = (
    <>
      <div className="client-card-head">
        <h3>{request.title}</h3>
      </div>
      <div className="client-card-meta">
        <span className={`client-status-pill status-${request.status}`}>{statusLabel(request.status)}</span>
        {request.handlingLabel ? (
          <span className="client-handling-badge">{request.handlingLabel}</span>
        ) : null}
        <span className="client-type-badge">{request.type}</span>
      </div>
      <footer>
        <span>
          <CalendarDays size={13} />
          Updated {request.updatedAt}
        </span>
      </footer>
    </>
  )

  if (onOpen) {
    return (
      <button
        type="button"
        className="client-request-card"
        onClick={onOpen}
        style={{
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-label={`Open ${request.title}`}
      >
        {content}
      </button>
    )
  }

  return (
    <article className="client-request-card">
      {content}
    </article>
  )
}

function ClientRequestDetailDrawer({
  clientSlug,
  request,
  transitionStages,
  isUpdatingStatus,
  errorMessage,
  onClose,
  onTransition,
}: {
  clientSlug: string
  request: ClientRequest
  transitionStages: Funnel['stages']
  isUpdatingStatus: boolean
  errorMessage: string | null
  onClose: () => void
  onTransition: (stage: FunnelStage) => void
}) {
  const currentStage = transitionStages.find((stage) => stage.status === request.workItemStatus)
  const enabledCapabilities = enabledAutomationCapabilities(currentStage?.automationPolicy)
  const runAssistant = useServerFn(runClientWorkItemAssistant)
  const applySuggestedAction = useServerFn(applyClientWorkItemSuggestedAction)
  const getConversationMessages = useServerFn(getClientWorkItemConversationMessages)
  const [assistantRuns, setAssistantRuns] = useState<AssistantRun[]>([])
  const [conversationMessages, setConversationMessages] = useState<WorkItemConversationMessage[]>([])
  const [assistantMessage, setAssistantMessage] = useState('')
  const [isCreatingAssistantResult, setIsCreatingAssistantResult] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [applyingSuggestedActionId, setApplyingSuggestedActionId] = useState<string | null>(null)
  const [assistantErrorMessage, setAssistantErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadConversationMessages() {
      setIsLoadingConversation(true)
      setAssistantErrorMessage(null)

      try {
        const messages = await getConversationMessages({
          data: {
            clientSlug,
            workItemId: request.id,
          },
        })

        if (isActive) {
          setConversationMessages((currentMessages) => mergeConversationMessages(currentMessages, messages))
        }
      } catch (error) {
        if (isActive) {
          setAssistantErrorMessage(messageFromError(error))
        }
      } finally {
        if (isActive) {
          setIsLoadingConversation(false)
        }
      }
    }

    void loadConversationMessages()

    return () => {
      isActive = false
    }
  }, [clientSlug, request.id])

  async function handleAssistantPreviewAction() {
    if (!currentStage?.assistantKey || isCreatingAssistantResult) {
      return
    }

    setIsCreatingAssistantResult(true)
    setAssistantErrorMessage(null)

    try {
      const userMessage = assistantMessage.trim()
      const result = await runAssistant({
        data: {
          clientSlug,
          workItemId: request.id,
          userMessage: userMessage || undefined,
        },
      })

      setAssistantRuns((currentRuns) => [
        {
          result,
          userMessage: userMessage || undefined,
        },
        ...currentRuns,
      ])
      setAssistantMessage('')

      const messages = await getConversationMessages({
        data: {
          clientSlug,
          workItemId: request.id,
        },
      })
      setConversationMessages((currentMessages) => mergeConversationMessages(currentMessages, messages))
    } catch (error) {
      setAssistantErrorMessage(messageFromError(error))
    } finally {
      setIsCreatingAssistantResult(false)
    }
  }

  async function handleApplySuggestedAction(result: WorkItemAssistantResult) {
    if (!result.suggestedAction || applyingSuggestedActionId) {
      return
    }

    setApplyingSuggestedActionId(result.id)
    setAssistantErrorMessage(null)

    try {
      await applySuggestedAction({
        data: {
          clientSlug,
          workItemId: request.id,
          suggestedAction: result.suggestedAction,
        },
      })

      window.location.reload()
    } catch (error) {
      setAssistantErrorMessage(messageFromError(error))
      setApplyingSuggestedActionId(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-request-detail-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(17, 24, 39, 0.34)',
      }}
    >
      <button
        type="button"
        aria-label="Close request details"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          background: 'transparent',
          cursor: 'default',
        }}
      />
      <aside
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          width: 'min(430px, 100%)',
          height: '100%',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          borderLeft: '1px solid rgba(20, 29, 38, 0.12)',
          background: '#ffffff',
          padding: '1.1rem',
          boxShadow: '-24px 0 50px rgba(20, 29, 38, 0.16)',
        }}
      >
        <header className="client-card-head">
          <div>
            <span className="client-type-badge">{request.type}</span>
            <h2 id="client-request-detail-title" style={{ margin: '0.75rem 0 0', fontSize: '1.3rem' }}>
              {request.title}
            </h2>
          </div>
          <button type="button" className="client-icon-button" aria-label="Close details" onClick={onClose}>
            <X size={17} />
          </button>
        </header>
        <div className="client-card-meta">
          <span className={`client-status-pill status-${request.status}`}>
            {currentStage?.label ?? statusLabel(request.status)}
          </span>
          {request.handlingLabel ? <span className="client-handling-badge">{request.handlingLabel}</span> : null}
        </div>
        {request.description ? (
          <p style={{ margin: 0, color: '#4b5563', fontSize: '0.92rem', lineHeight: 1.55 }}>{request.description}</p>
        ) : null}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#8a94a3', fontSize: '0.8rem', fontWeight: 750 }}>
          <CalendarDays size={14} />
          Updated {request.updatedAt}
        </span>
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            borderTop: '1px solid rgba(20, 29, 38, 0.08)',
            paddingTop: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <strong style={{ color: '#17202a', fontSize: '0.86rem' }}>Stage assistant</strong>
            <span style={{ color: '#4b5563', fontSize: '0.86rem', fontWeight: 700 }}>
              {currentStage?.assistantKey ?? 'No assistant assigned yet'}
            </span>
          </div>
          {enabledCapabilities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {enabledCapabilities.map((capability) => (
                <span key={capability} className="client-type-badge">
                  {capability}
                </span>
              ))}
            </div>
          ) : null}
          {currentStage?.assistantKey ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                <span style={{ color: '#17202a', fontSize: '0.8rem', fontWeight: 800 }}>
                  Ask stage assistant
                </span>
                <textarea
                  value={assistantMessage}
                  onChange={(event) => setAssistantMessage(event.currentTarget.value)}
                  placeholder="Review this item and suggest the next action."
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    border: '1px solid rgba(20, 29, 38, 0.14)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: '#17202a',
                    font: 'inherit',
                    fontSize: '0.86rem',
                    lineHeight: 1.4,
                  }}
                />
              </label>
              <button
                type="button"
                className="client-shortcut-link"
                disabled={isCreatingAssistantResult}
                onClick={handleAssistantPreviewAction}
              >
                {isCreatingAssistantResult ? 'Sending...' : 'Send to assistant'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                <strong style={{ color: '#17202a', fontSize: '0.8rem' }}>Conversation</strong>
                {isLoadingConversation ? (
                  <p style={{ margin: 0, color: '#8a94a3', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    Loading conversation...
                  </p>
                ) : null}
                {!isLoadingConversation && conversationMessages.length === 0 ? (
                  <p style={{ margin: 0, color: '#8a94a3', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    No conversation yet.
                  </p>
                ) : null}
                {conversationMessages.map((message) => {
                  const isAssistantMessage = message.role === 'assistant'

                  return (
                    <article
                      key={message.id}
                      style={{
                        alignSelf: isAssistantMessage ? 'flex-start' : 'flex-end',
                        maxWidth: '92%',
                        border: '1px solid rgba(20, 29, 38, 0.1)',
                        borderRadius: '8px',
                        background: isAssistantMessage ? '#f8fafc' : '#17202a',
                        padding: '0.65rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          color: isAssistantMessage ? '#17202a' : '#ffffff',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {conversationMessageLabel(message)}
                      </span>
                      <p
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          color: isAssistantMessage ? '#4b5563' : '#ffffff',
                          fontSize: '0.84rem',
                          lineHeight: 1.45,
                        }}
                      >
                        {message.body}
                      </p>
                      <span
                        style={{
                          display: 'block',
                          marginTop: '0.35rem',
                          color: isAssistantMessage ? '#8a94a3' : 'rgba(255, 255, 255, 0.72)',
                          fontSize: '0.72rem',
                          fontWeight: 750,
                        }}
                      >
                        {formatAssistantRunCreatedAt(message.createdAt)}
                      </span>
                    </article>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                <strong style={{ color: '#17202a', fontSize: '0.8rem' }}>Assistant runs</strong>
                {assistantRuns.length === 0 ? (
                  <p style={{ margin: 0, color: '#8a94a3', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    No assistant runs yet.
                  </p>
                ) : (
                  assistantRuns.map((run) => (
                    <article
                      key={run.result.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                        borderLeft: '2px solid rgba(20, 29, 38, 0.12)',
                        paddingLeft: '0.65rem',
                      }}
                    >
                      <span style={{ color: '#17202a', fontSize: '0.78rem', fontWeight: 800 }}>
                        {run.result.assistantKey}
                      </span>
                      {run.userMessage ? (
                        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.82rem', lineHeight: 1.45 }}>
                          You: {run.userMessage}
                        </p>
                      ) : null}
                      <p style={{ margin: 0, color: '#4b5563', fontSize: '0.84rem', lineHeight: 1.45 }}>
                        {run.result.summary}
                      </p>
                      <p style={{ margin: 0, color: '#17202a', fontSize: '0.84rem', fontWeight: 750, lineHeight: 1.45 }}>
                        {run.result.suggestedNextAction}
                      </p>
                      {run.result.suggestedAction ? (
                        <SuggestedActionCard
                          action={run.result.suggestedAction}
                          isApplying={applyingSuggestedActionId === run.result.id}
                          onApply={() => handleApplySuggestedAction(run.result)}
                        />
                      ) : null}
                      <span style={{ color: '#8a94a3', fontSize: '0.76rem', fontWeight: 750 }}>
                        Confidence: {run.result.confidence}
                        {run.result.createdAt ? ` · ${formatAssistantRunCreatedAt(run.result.createdAt)}` : ''}
                      </span>
                    </article>
                  ))
                )}
              </div>
              {assistantErrorMessage ? (
                <p className="client-form-error">{assistantErrorMessage}</p>
              ) : null}
            </div>
          ) : null}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <strong style={{ color: '#17202a', fontSize: '0.86rem' }}>Move through funnel</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {transitionStages.map((stage) => {
              const isCurrentStage = stage.status === request.workItemStatus

              return (
                <button
                  key={stage.id}
                  type="button"
                  className={isCurrentStage ? 'client-shortcut-link is-active' : 'client-shortcut-link'}
                  disabled={isCurrentStage || isUpdatingStatus}
                  onClick={() => onTransition(stage)}
                  aria-current={isCurrentStage ? 'step' : undefined}
                >
                  {transitionButtonLabel(stage, isCurrentStage)}
                </button>
              )
            })}
          </div>
          {errorMessage ? <p className="client-form-error">{errorMessage}</p> : null}
        </section>
      </aside>
    </div>
  )
}

function SuggestedActionCard({
  action,
  isApplying,
  onApply,
}: {
  action: WorkItemSuggestedAction
  isApplying: boolean
  onApply: () => void
}) {
  const canApplyMoveStage = action.type === 'move_stage' && Boolean(action.targetStatus)
  const previewOnlyMessage = action.type === 'move_stage'
    ? 'Preview only. Move stage actions need a target status.'
    : 'Preview only. This action type is not supported yet.'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        border: '1px solid rgba(20, 29, 38, 0.12)',
        borderRadius: '8px',
        background: '#f8fafc',
        padding: '0.65rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <strong style={{ color: '#17202a', fontSize: '0.82rem', lineHeight: 1.35 }}>{action.label}</strong>
        <span className="client-type-badge">{suggestedActionTypeLabel(action.type)}</span>
      </div>
      {action.targetStatus ? (
        <span style={{ color: '#4b5563', fontSize: '0.78rem', fontWeight: 750 }}>
          Target: {workItemStatusLabel(action.targetStatus)}
        </span>
      ) : null}
      {canApplyMoveStage ? (
        <button
          type="button"
          className="client-shortcut-link"
          disabled={isApplying}
          onClick={onApply}
          style={{ alignSelf: 'flex-start' }}
        >
          {isApplying ? 'Applying...' : 'Apply action'}
        </button>
      ) : (
        <span style={{ color: '#8a94a3', fontSize: '0.78rem', fontWeight: 750 }}>
          {previewOnlyMessage}
        </span>
      )}
    </div>
  )
}

function NewRequestView({ clientName, clientSlug }: { clientName: string; clientSlug: string }) {
  const navigate = useNavigate()
  const createRequest = useServerFn(createClientWorkItem)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await createRequest({
        data: {
          clientSlug,
          title: String(formData.get('title') ?? ''),
          requestType: String(formData.get('requestType') ?? 'Request'),
          description: String(formData.get('description') ?? ''),
        },
      })

      navigate({
        to: '/workspace/$clientSlug',
        params: {
          clientSlug,
        },
      })
    } catch (error) {
      setErrorMessage(messageFromError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>{clientName}</span>
        <h1>New Request</h1>
        <p>Tell us what you need. We will track it here.</p>
      </div>
      <form className="client-request-form-card" onSubmit={handleSubmit}>
        <label>
          Request title
          <input name="title" placeholder="What do you need help with?" required />
        </label>
        <label>
          Request type
          <select name="requestType" defaultValue="Request">
            <option>Request</option>
            <option>Review</option>
            <option>File</option>
            <option>Support</option>
          </select>
        </label>
        <label>
          Details
          <textarea name="description" placeholder="Add the key details, links, or notes." rows={5} />
        </label>
        {errorMessage ? <p className="client-form-error">{errorMessage}</p> : null}
        <button type="submit" className="client-primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </section>
  )
}

function ReviewsView({ requests }: { requests: ClientRequest[] }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Reviews</span>
        <h1>Review Outputs</h1>
        <p>Approve work or request changes.</p>
      </div>
      <div className="client-review-list">
        {requests.length === 0 ? (
          <div className="client-empty-card">
            <List size={24} />
            <strong>No review items yet.</strong>
            <p>Items that need your approval will appear here.</p>
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.title} className="client-review-card">
              <ClientRequestCard request={request} />
              <div className="client-review-actions">
                <button type="button">Approve</button>
                <button type="button">Request changes</button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function FilesView({ requests }: { requests: ClientRequest[] }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Files</span>
        <h1>Files</h1>
        <p>File-related work items are tracked here.</p>
      </div>
      <div className="client-file-grid">
        {requests.length === 0 ? (
          <div className="client-empty-card">
            <Files size={24} />
            <strong>No file items yet.</strong>
            <p>File-related work items will appear here once they are created.</p>
          </div>
        ) : (
          requests.map((request, index) => (
            <article key={`${request.title}-${index}`} className="client-file-card">
              <Files size={19} />
              <div>
                <strong>{request.title}</strong>
                <span>Updated {request.updatedAt}</span>
              </div>
              <span className={`client-status-pill status-${request.status}`}>{statusLabel(request.status)}</span>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function ChatView({ clientSlug }: { clientSlug: string }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Chat</span>
        <h1>Chat</h1>
        <p>Message your automation team.</p>
      </div>
      <div className="client-empty-card">
        <MessageCircle size={24} />
        <strong>Chat support will be available soon.</strong>
        <p>For now, use New Request to send anything you need us to work on.</p>
        <a href={`/workspace/${encodeURIComponent(clientSlug)}/new-request`} className="client-primary-button">
          <Plus size={16} />
          New Request
        </a>
      </div>
    </section>
  )
}

function SettingsView({ clientName }: { clientName: string }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Settings</span>
        <h1>Company Preferences</h1>
        <p>Simple workspace settings for {clientName}.</p>
      </div>
      <div className="client-settings-grid">
        <article>
          <strong>Notifications</strong>
          <p>Email updates for new reviews and completed requests.</p>
        </article>
        <article>
          <strong>Default contact</strong>
          <p>Use the main company contact for support requests.</p>
        </article>
        <article>
          <strong>File sharing</strong>
          <p>Approved files are visible in the Files area.</p>
        </article>
      </div>
    </section>
  )
}

function statusLabel(status: ClientRequestStatus) {
  switch (status) {
    case 'new':
      return 'New'
    case 'inProgress':
      return 'In Progress'
    case 'waiting':
      return 'Waiting'
    case 'needsReview':
      return 'Needs Review'
    case 'ready':
      return 'Ready'
    case 'done':
      return 'Done'
  }
}

function workItemStatusLabel(status: WorkItem['status']) {
  return statusLabel(workItemStatusToClientStatus(status))
}

function suggestedActionTypeLabel(type: WorkItemSuggestedAction['type']) {
  switch (type) {
    case 'move_stage':
      return 'Move stage'
    case 'create_internal_note':
      return 'Internal note'
    case 'request_client_info':
      return 'Client info'
    case 'apply_tag':
      return 'Apply tag'
  }
}

function workItemToClientRequest(workItem: WorkItem): ClientRequest {
  return {
    id: workItem.id,
    title: workItem.title,
    description: workItem.description,
    type: workItemTypeLabel(workItem),
    status: workItemStatusToClientStatus(workItem.status),
    workItemStatus: workItem.status,
    handlingLabel: workItemHandlingLabel(workItem),
    updatedAt: formatUpdatedAt(workItem.updatedAt),
  }
}

function boardColumnToFunnelStage(column: ClientBoardColumn): Funnel['stages'][number] {
  return {
    id: column.id,
    label: column.label,
    order: statusColumns.findIndex((statusColumn) => statusColumn.id === column.id),
    status: column.workItemStatus,
  }
}

function sortFunnelStages(stages: Funnel['stages']): Funnel['stages'] {
  return [...stages].sort((firstStage, secondStage) => firstStage.order - secondStage.order)
}

function transitionButtonLabel(stage: FunnelStage, isCurrentStage: boolean) {
  if (isCurrentStage) {
    return `Current: ${stage.label}`
  }

  if (stage.status === 'done') {
    return 'Mark Done'
  }

  return `Move to ${stage.label}`
}

function formatAssistantRunCreatedAt(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function conversationMessageLabel(message: WorkItemConversationMessage): string {
  if (message.role === 'assistant') {
    return message.assistantKey ? `Assistant: ${message.assistantKey}` : 'Assistant'
  }

  if (message.role === 'client') {
    return 'Client'
  }

  if (message.role === 'system') {
    return 'System'
  }

  return 'You'
}

function mergeConversationMessages(
  currentMessages: WorkItemConversationMessage[],
  persistedMessages: WorkItemConversationMessage[],
): WorkItemConversationMessage[] {
  const messagesById = new Map<string, WorkItemConversationMessage>()

  for (const message of currentMessages) {
    messagesById.set(message.id, message)
  }

  for (const message of persistedMessages) {
    messagesById.set(message.id, message)
  }

  return [...messagesById.values()].sort((first, second) => (
    new Date(first.createdAt).valueOf() - new Date(second.createdAt).valueOf()
  ))
}

function funnelStageToBoardColumn(stage: FunnelStage): ClientBoardColumn {
  const status = workItemStatusToClientStatus(stage.status)

  return {
    id: status,
    label: stage.label,
    tone: toneForClientStatus(status),
    workItemStatus: stage.status,
  }
}

function enabledAutomationCapabilities(policy: FunnelStage['automationPolicy']): string[] {
  if (!policy) {
    return []
  }

  return automationCapabilityLabels
    .filter((capability) => policy[capability.key] === true)
    .map((capability) => capability.label)
}

function toneForClientStatus(status: ClientRequestStatus): ClientBoardColumn['tone'] {
  switch (status) {
    case 'inProgress':
      return 'progress'
    case 'waiting':
      return 'waiting'
    case 'needsReview':
      return 'review'
    case 'ready':
      return 'ready'
    case 'done':
      return 'done'
    case 'new':
      return 'new'
  }
}

function workItemStatusToClientStatus(status: WorkItem['status']): ClientRequestStatus {
  switch (status) {
    case 'in_progress':
      return 'inProgress'
    case 'waiting':
      return 'waiting'
    case 'needs_review':
      return 'needsReview'
    case 'ready':
      return 'ready'
    case 'done':
      return 'done'
    case 'new':
      return 'new'
  }
}

function workItemHandlingLabel(workItem: WorkItem) {
  const handlingMode = workItem.metadata.handlingMode

  if (handlingMode === 'human_support') {
    return 'Human Support'
  }

  if (handlingMode === 'client') {
    return 'Client Review'
  }

  if (handlingMode === 'internal') {
    return 'Internal'
  }

  if (handlingMode === 'ai') {
    return 'AI'
  }

  if (workItem.status === 'waiting') {
    return 'Human Support'
  }

  if (workItem.status === 'needs_review') {
    return 'Client Review'
  }

  return undefined
}

function workItemTypeLabel(workItem: WorkItem): ClientRequest['type'] {
  const requestType = workItem.metadata.requestType

  if (requestType === 'Review' || requestType === 'File' || requestType === 'Support') {
    return requestType
  }

  return 'Request'
}

function isFileWorkItem(workItem: WorkItem) {
  return workItem.moduleKey === 'files' || workItem.type === 'file_review'
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return 'Recently'
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).valueOf()
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000)

  if (dayDifference === 0) {
    return 'Today'
  }

  if (dayDifference === 1) {
    return 'Yesterday'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
