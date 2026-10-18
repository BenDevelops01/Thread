import { queryOptions } from '@tanstack/react-query'

import { fetchSession } from '@/server/auth'

/**
 * The current session + profile, cached in react-query.
 *
 * The root route's `beforeLoad` reads this. Caching it here means navigating
 * between app tabs no longer fires a server round-trip on every click — the
 * first load resolves from the server, everything after is instant.
 */
export const sessionQuery = () =>
  queryOptions({
    queryKey: ['session'] as const,
    queryFn: () => fetchSession(),
    staleTime: 10 * 60_000,
  })
