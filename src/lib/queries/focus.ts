import { queryOptions } from '@tanstack/react-query'

import { listFocusSessions } from '@/server/focus'

export const focusSessionsQuery = () =>
  queryOptions({
    queryKey: ['focus-sessions'],
    queryFn: () => listFocusSessions(),
  })
