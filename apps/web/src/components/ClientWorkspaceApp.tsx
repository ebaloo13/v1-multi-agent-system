import { type FormEvent, useState } from 'react'
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
  createClientWorkItem,
  createClientWorkItemAssistantResult,
  updateClientWorkItemStatus,
} from '../lib/client-work-items.functions'
import { formatClientName } from '../lib/product-shell'
import { messageFromError } from '../lib/workflow'
import type { Funnel, WorkItem, WorkItemAssistantResult } from '../../../../src/schemas/operations'

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
  const columns = funnel ? sortFunnelStages(funnel.stages).map(funnelStageToBoardColumn) : statusColumns
  const funnelLabel = funnel?.label ?? 'Work Items'

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
        {columns.map((column) => {
          const columnRequests = requests.filter((request) => request.workItemStatus === column.workItemStatus)

          return (
            <article key={column.id} className={`client-kanban-column tone-${column.tone}`}>
              <header>
                <div>
                  <span className={`client-status-dot tone-${column.tone}`} />
                  <strong>{column.label}</strong>
                  <em>{columnRequests.length}</em>
                </div>
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
    </>
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
  const createAssistantResult = useServerFn(createClientWorkItemAssistantResult)
  const [assistantResults, setAssistantResults] = useState<WorkItemAssistantResult[]>([])
  const [isCreatingAssistantResult, setIsCreatingAssistantResult] = useState(false)
  const [assistantErrorMessage, setAssistantErrorMessage] = useState<string | null>(null)

  async function handleAssistantPreviewAction() {
    if (!currentStage?.assistantKey || isCreatingAssistantResult) {
      return
    }

    setIsCreatingAssistantResult(true)
    setAssistantErrorMessage(null)

    try {
      const result = await createAssistantResult({
        data: {
          clientSlug,
          workItemId: request.id,
          assistantKey: currentStage.assistantKey,
          stageId: currentStage.id,
          summary: assistantResultSummary(request),
          suggestedNextAction: assistantSuggestedNextAction(request),
          confidence: 'medium',
        },
      })

      setAssistantResults((currentResults) => [result, ...currentResults])
    } catch (error) {
      setAssistantErrorMessage(messageFromError(error))
    } finally {
      setIsCreatingAssistantResult(false)
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
              <button
                type="button"
                className="client-shortcut-link"
                disabled={isCreatingAssistantResult}
                onClick={handleAssistantPreviewAction}
              >
                {isCreatingAssistantResult ? 'Running assistant...' : 'Run assistant'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
                <strong style={{ color: '#17202a', fontSize: '0.8rem' }}>Assistant runs</strong>
                {assistantResults.length === 0 ? (
                  <p style={{ margin: 0, color: '#8a94a3', fontSize: '0.82rem', lineHeight: 1.45 }}>
                    No assistant runs yet.
                  </p>
                ) : (
                  assistantResults.map((result) => (
                    <article
                      key={result.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                        borderLeft: '2px solid rgba(20, 29, 38, 0.12)',
                        paddingLeft: '0.65rem',
                      }}
                    >
                      <span style={{ color: '#17202a', fontSize: '0.78rem', fontWeight: 800 }}>
                        {result.assistantKey}
                      </span>
                      <p style={{ margin: 0, color: '#4b5563', fontSize: '0.84rem', lineHeight: 1.45 }}>
                        {result.summary}
                      </p>
                      <p style={{ margin: 0, color: '#17202a', fontSize: '0.84rem', fontWeight: 750, lineHeight: 1.45 }}>
                        {result.suggestedNextAction}
                      </p>
                      <span style={{ color: '#8a94a3', fontSize: '0.76rem', fontWeight: 750 }}>
                        Confidence: {result.confidence}
                        {result.createdAt ? ` · ${formatAssistantRunCreatedAt(result.createdAt)}` : ''}
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

function assistantResultSummary(request: ClientRequest): string {
  return `${request.type} "${request.title}" is currently ${statusLabel(request.status).toLowerCase()}.`
}

function assistantSuggestedNextAction(request: ClientRequest): string {
  switch (request.workItemStatus) {
    case 'new':
      return 'Review the request details, add internal notes, and decide whether it should move into active work.'
    case 'in_progress':
      return 'Check progress against the request and move it forward when the next deliverable is clear.'
    case 'waiting':
      return 'Confirm what input is missing and prepare a follow-up before moving the item forward.'
    case 'needs_review':
      return 'Review the item with a human approver before marking it ready.'
    case 'ready':
      return 'Confirm the handoff is complete, then move the item to done when accepted.'
    case 'done':
      return 'Record any useful completion notes and leave the item closed.'
  }
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
