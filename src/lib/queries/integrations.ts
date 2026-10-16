import { queryOptions } from '@tanstack/react-query'

import { listIntegrations } from '@/server/integrations'

export const integrationsQuery = () =>
  queryOptions({
    queryKey: ['integrations'],
    queryFn: () => listIntegrations(),
  })
