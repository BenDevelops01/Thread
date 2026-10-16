import { queryOptions } from '@tanstack/react-query'

import { getBoard } from '@/server/tasks'

export const boardQuery = () =>
  queryOptions({
    queryKey: ['board'],
    queryFn: () => getBoard(),
  })
