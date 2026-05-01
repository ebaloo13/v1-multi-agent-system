import { createFileRoute } from '@tanstack/react-router'
import { getClientEvents } from '../lib/client-events.functions'
import { getWorkspaceActivity } from '../lib/workflow.functions'
import type { WorkspaceActivityItem } from '../lib/workflow'
import { WorkspaceActivityView, type WorkspaceActivityData } from './workspace.$clientSlug.activity'
import type { ClientEvent } from '../../../../src/core/events/store'

export const Route = createFileRoute('/internal/$clientSlug/activity')({
  loader: async ({ params }) => {
    const [activityData, events] = await Promise.all([
      getWorkspaceActivity({
        data: { clientSlug: params.clientSlug },
      }),
      getClientEvents({
        data: { clientSlug: params.clientSlug },
      }),
    ])

    return {
      activityData,
      events,
    }
  },
  component: InternalActivityPage,
})

function InternalActivityPage() {
  const { activityData, events } = Route.useLoaderData()
  const sortedEvents = [...events].sort((left, right) => {
    return new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf()
  })
  const data =
    sortedEvents.length > 0
      ? {
          ...activityData,
          activity: sortedEvents.map(eventToActivityItem),
        }
      : activityData

  return <WorkspaceActivityView data={data as WorkspaceActivityData} routeScope="internal" />
}

function eventToActivityItem(event: ClientEvent): WorkspaceActivityItem {
  const entityLabel =
    event.entityType && event.entityId
      ? `${event.entityType}: ${event.entityId}`
      : event.entityType || undefined

  return {
    id: event.id,
    type: 'next_step_updated',
    title: event.message,
    description: [
      `Type: ${event.type}`,
      `Visibility: ${event.visibility}`,
      entityLabel ? `Entity: ${entityLabel}` : null,
    ]
      .filter(Boolean)
      .join(' | '),
    timestamp: event.createdAt,
    relatedEntityType: 'workspace',
    relatedEntityLabel: event.visibility,
  }
}
