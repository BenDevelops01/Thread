import { queryOptions } from '@tanstack/react-query'

import { listJournal } from '@/server/journal'

export const journalQuery = () =>
  queryOptions({
    queryKey: ['journal'],
    queryFn: () => listJournal(),
  })
