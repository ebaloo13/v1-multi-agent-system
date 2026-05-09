import { type FormEvent, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Bell,
  CalendarDays,
  CheckSquare,
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
import { createClientWorkItem } from '../lib/client-work-items.functions'
import { formatClientName } from '../lib/product-shell'
import { messageFromError } from '../lib/workflow'
import type { WorkItem } from '../../../../src/schemas/operations'

type ClientWorkspaceView = 'home' | 'newRequest' | 'reviews' | 'files' | 'chat' | 'settings'

type ClientWorkspaceAppProps = {
  clientSlug: string
  view: ClientWorkspaceView
  workItems?: WorkItem[]
}

type ClientRequestStatus = 'new' | 'inProgress' | 'waiting' | 'needsReview' | 'ready' | 'done'

type ClientRequest = {
  title: string
  type: 'Request' | 'Review' | 'File' | 'Support'
  status: ClientRequestStatus
  handlingLabel?: string
  updatedAt: string
}

const statusColumns: Array<{
  id: ClientRequestStatus
  label: string
  tone: 'new' | 'progress' | 'waiting' | 'review' | 'ready' | 'done'
}> = [
  { id: 'new', label: 'New', tone: 'new' },
  { id: 'inProgress', label: 'In Progress', tone: 'progress' },
  { id: 'waiting', label: 'Waiting', tone: 'waiting' },
  { id: 'needsReview', label: 'Needs Review', tone: 'review' },
  { id: 'ready', label: 'Ready', tone: 'ready' },
  { id: 'done', label: 'Done', tone: 'done' },
]

export default function ClientWorkspaceApp({
  clientSlug,
  view,
  workItems = [],
}: ClientWorkspaceAppProps) {
  const clientName = formatClientName(clientSlug || 'generic-client')
  const requests = workItems.map(workItemToClientRequest)
  const reviewRequests = requests.filter((request) => request.status === 'needsReview')

  return (
    <main className="client-workspace-app">
      <ClientIconSidebar clientSlug={clientSlug} activeView={view} />
      <section className="client-workspace-main">
        <ClientTopbar clientName={clientName} />
        {view === 'home' ? (
          <ClientKanbanView clientName={clientName} clientSlug={clientSlug} requests={requests} />
        ) : null}
        {view === 'newRequest' ? <NewRequestView clientName={clientName} clientSlug={clientSlug} /> : null}
        {view === 'reviews' ? <ReviewsView requests={reviewRequests} /> : null}
        {view === 'files' ? <FilesView /> : null}
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
}: {
  clientName: string
  clientSlug: string
  requests: ClientRequest[]
}) {
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
      <section className="client-kanban-board">
        {statusColumns.map((column) => {
          const columnRequests = requests.filter((request) => request.status === column.id)

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
                  <ClientRequestCard key={`${request.title}-${index}`} request={request} />
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

function ClientRequestCard({ request }: { request: ClientRequest }) {
  return (
    <article className="client-request-card">
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
    </article>
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

function FilesView() {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Files</span>
        <h1>Download Files</h1>
        <p>Approved files ready for your team.</p>
      </div>
      <div className="client-file-grid">
        <div className="client-empty-card">
          <Files size={24} />
          <strong>No files yet.</strong>
          <p>Approved files will appear here when they are ready.</p>
        </div>
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
    title: workItem.title,
    type: workItemTypeLabel(workItem),
    status: workItemStatusToClientStatus(workItem.status),
    handlingLabel: workItemHandlingLabel(workItem),
    updatedAt: formatUpdatedAt(workItem.updatedAt),
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
