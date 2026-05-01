import { createServerFn } from '@tanstack/react-start'
import { listClientEvents } from '../../../../src/core/events/store'

export const getClientEvents = createServerFn({ method: 'GET' })
  .inputValidator((data: { clientSlug: string }) => data)
  .handler(async ({ data }) => {
    return listClientEvents(data.clientSlug)
  })
