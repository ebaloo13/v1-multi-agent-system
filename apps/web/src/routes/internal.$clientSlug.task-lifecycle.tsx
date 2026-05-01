import { createFileRoute } from '@tanstack/react-router'
import { AutomationWorkspacePage } from '../components/AutomationWorkspace'
import { getClientWorkItems } from '../lib/client-work-items.functions'
import type { AutomationTask, AutomationTaskStatus, AutomationTone } from '../lib/automation-workspace'
import type { WorkItem } from '../../../../src/core/work-items/store'

export const Route = createFileRoute('/internal/$clientSlug/task-lifecycle')({
  loader: ({ params }) =>
    getClientWorkItems({
      data: { clientSlug: params.clientSlug },
    }),
  component: InternalTaskLifecyclePage,
})

function InternalTaskLifecyclePage() {
  const { clientSlug } = Route.useParams()
  const workItems = Route.useLoaderData()
  const tasks = workItems.map(workItemToAutomationTask)

  return (
    <AutomationWorkspacePage
      clientSlug={clientSlug}
      view="taskLifecycle"
      routeScope="internal"
      tasks={tasks}
      statusUpdateClientSlug={tasks.length > 0 ? clientSlug : undefined}
    />
  )
}

function workItemToAutomationTask(workItem: WorkItem, index: number): AutomationTask {
  const status = automationStatusFromWorkItem(workItem.status)

  return {
    id: workItem.id,
    displayId: `WI-${String(index + 1).padStart(3, '0')}`,
    title: workItem.title,
    description: workItem.description?.trim() || 'Client-created work item.',
    status,
    tone: automationToneFromStatus(status),
    priority: workItem.priority,
    assignee: 'Unassigned',
    artifactCount: workItem.fileOutputId ? 1 : undefined,
    workstream: moduleLabel(workItem.moduleKey),
    nextStep: nextStepFromStatus(workItem.status),
    blocker: workItem.status === 'waiting' ? 'Waiting on client input or clarification.' : undefined,
    workItemStatus: workItem.status,
  }
}

function automationStatusFromWorkItem(status: WorkItem['status']): AutomationTaskStatus {
  switch (status) {
    case 'new':
      return 'backlog'
    case 'in_progress':
      return 'in_progress'
    case 'waiting':
      return 'blocked'
    case 'needs_review':
      return 'in_review'
    case 'ready':
    case 'done':
      return 'done'
  }
}

function automationToneFromStatus(status: AutomationTaskStatus): AutomationTone {
  switch (status) {
    case 'done':
    case 'completed':
      return 'success'
    case 'in_progress':
    case 'running':
    case 'in_review':
    case 'human_review':
      return 'progress'
    case 'blocked':
      return 'pending'
    default:
      return 'neutral'
  }
}

function nextStepFromStatus(status: WorkItem['status']) {
  switch (status) {
    case 'new':
      return 'Triage and assign owner.'
    case 'in_progress':
      return 'Continue execution.'
    case 'waiting':
      return 'Collect the missing input.'
    case 'needs_review':
      return 'Review output or decision.'
    case 'ready':
      return 'Prepare delivery.'
    case 'done':
      return 'No next step.'
  }
}

function moduleLabel(moduleKey: WorkItem['moduleKey']) {
  switch (moduleKey) {
    case 'inbox':
      return 'Inbox'
    case 'tasks':
      return 'Tasks'
    case 'payments':
      return 'Payments'
    case 'schedule':
      return 'Schedule'
    case 'files':
      return 'Files'
    case 'settings':
      return 'Settings'
    case 'integrations':
      return 'Integrations'
  }
}
