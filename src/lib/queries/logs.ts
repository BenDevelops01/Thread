import { queryOptions } from '@tanstack/react-query'

import { listEvents } from '@/server/logs'

export const eventsQuery = (source?: string, sinceDays?: number) =>
  queryOptions({
    queryKey: ['events', source ?? 'all', sinceDays ?? 'all'],
    queryFn: () => listEvents({ data: { source, sinceDays, limit: 100 } }),
  })
