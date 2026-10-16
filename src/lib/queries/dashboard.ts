import { queryOptions } from '@tanstack/react-query'

import { getDashboard } from '@/server/dashboard'

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(),
  })
