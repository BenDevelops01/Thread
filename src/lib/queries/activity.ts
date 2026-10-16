import { queryOptions } from '@tanstack/react-query'

import { getActivity } from '@/server/activity'

export const activityQuery = (days?: number) =>
  queryOptions({
    queryKey: ['activity', days ?? 'default'],
    queryFn: () => getActivity({ data: { days } }),
  })
