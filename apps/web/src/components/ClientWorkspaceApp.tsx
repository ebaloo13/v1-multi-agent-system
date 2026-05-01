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
import { formatClientName } from '../lib/product-shell'

type ClientWorkspaceView = 'home' | 'newRequest' | 'reviews' | 'files' | 'settings'

type ClientWorkspaceAppProps = {
  clientSlug: string
  view: ClientWorkspaceView
}

type ClientRequestStatus = 'new' | 'inProgress' | 'needsReview' | 'ready' | 'humanSupport'

type ClientRequest = {
  title: string
  type: 'Request' | 'Review' | 'File' | 'Support'
  status: ClientRequestStatus
  updatedAt: string
}

type ClientFile = {
  name: string
  type: string
  updatedAt: string
}

const statusColumns: Array<{
  id: ClientRequestStatus
  label: string
  tone: 'new' | 'progress' | 'review' | 'ready' | 'support'
}> = [
  { id: 'new', label: 'New', tone: 'new' },
  { id: 'inProgress', label: 'In Progress', tone: 'progress' },
  { id: 'needsReview', label: 'Needs Review', tone: 'review' },
  { id: 'ready', label: 'Ready', tone: 'ready' },
  { id: 'humanSupport', label: 'Human Support', tone: 'support' },
]

const clientRequests: ClientRequest[] = [
  {
    title: 'Update sales intake form',
    type: 'Request',
    status: 'new',
    updatedAt: 'Today',
  },
  {
    title: 'Review monthly follow-up summary',
    type: 'Review',
    status: 'needsReview',
    updatedAt: 'Today',
  },
  {
    title: 'Prepare client welcome email',
    type: 'Request',
    status: 'inProgress',
    updatedAt: 'Yesterday',
  },
  {
    title: 'Upload brand guidelines',
    type: 'File',
    status: 'humanSupport',
    updatedAt: 'Apr 29',
  },
  {
    title: 'Approve booking page copy',
    type: 'Review',
    status: 'needsReview',
    updatedAt: 'Apr 28',
  },
  {
    title: 'New customer reply template',
    type: 'File',
    status: 'ready',
    updatedAt: 'Apr 27',
  },
  {
    title: 'Confirm support contact',
    type: 'Support',
    status: 'humanSupport',
    updatedAt: 'Apr 26',
  },
  {
    title: 'Create quarterly review packet',
    type: 'Request',
    status: 'inProgress',
    updatedAt: 'Apr 25',
  },
]

const clientFiles: ClientFile[] = [
  { name: 'Sales intake checklist', type: 'PDF', updatedAt: 'Today' },
  { name: 'Follow-up summary', type: 'Document', updatedAt: 'Yesterday' },
  { name: 'Customer reply template', type: 'Document', updatedAt: 'Apr 27' },
  { name: 'Operations handoff notes', type: 'Sheet', updatedAt: 'Apr 24' },
]

export default function ClientWorkspaceApp({ clientSlug, view }: ClientWorkspaceAppProps) {
  const clientName = formatClientName(clientSlug || 'generic-client')
  const reviewRequests = clientRequests.filter((request) => request.status === 'needsReview')

  return (
    <main className="client-workspace-app">
      <ClientIconSidebar clientSlug={clientSlug} activeView={view} />
      <section className="client-workspace-main">
        <ClientTopbar clientName={clientName} />
        {view === 'home' ? (
          <ClientKanbanView clientName={clientName} clientSlug={clientSlug} requests={clientRequests} />
        ) : null}
        {view === 'newRequest' ? <NewRequestView clientName={clientName} /> : null}
        {view === 'reviews' ? <ReviewsView requests={reviewRequests} /> : null}
        {view === 'files' ? <FilesView files={clientFiles} /> : null}
        {view === 'settings' ? <SettingsView clientName={clientName} /> : null}
      </section>
      <button type="button" className="client-chat-button" aria-label="Open chat">
        <MessageCircle size={20} />
      </button>
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
    { id: 'chat', label: 'Chat', href: `${basePath}#chat`, icon: MessageCircle },
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

function NewRequestView({ clientName }: { clientName: string }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>{clientName}</span>
        <h1>New Request</h1>
        <p>Tell us what you need. We will track it here.</p>
      </div>
      <div className="client-request-form-card">
        <label>
          Request title
          <input placeholder="What do you need help with?" />
        </label>
        <label>
          Request type
          <select defaultValue="Request">
            <option>Request</option>
            <option>Review</option>
            <option>File</option>
            <option>Support</option>
          </select>
        </label>
        <label>
          Details
          <textarea placeholder="Add the key details, links, or notes." rows={5} />
        </label>
        <button type="button" className="client-primary-button">
          Submit Request
        </button>
      </div>
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
        {requests.map((request) => (
          <article key={request.title} className="client-review-card">
            <ClientRequestCard request={request} />
            <div className="client-review-actions">
              <button type="button">Approve</button>
              <button type="button">Request changes</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FilesView({ files }: { files: ClientFile[] }) {
  return (
    <section className="client-simple-page">
      <div className="client-simple-header">
        <span>Files</span>
        <h1>Download Files</h1>
        <p>Approved files ready for your team.</p>
      </div>
      <div className="client-file-grid">
        {files.map((file) => (
          <article key={file.name} className="client-file-card">
            <Files size={19} />
            <div>
              <strong>{file.name}</strong>
              <span>{file.type} - {file.updatedAt}</span>
            </div>
            <button type="button">Download</button>
          </article>
        ))}
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
    case 'needsReview':
      return 'Needs Review'
    case 'ready':
      return 'Ready'
    case 'humanSupport':
      return 'Human Support'
  }
}
