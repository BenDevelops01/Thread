import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Treat data as fresh for a while so switching tabs renders instantly
        // from cache instead of hitting the network on every mount.
        staleTime: 60_000,
        // Keep unused data around for a long time so navigating away and back
        // never refetches from scratch.
        gcTime: 30 * 60_000,
        // We manage freshness explicitly via invalidation; the app is meant to
        // feel like a persistent desktop workspace, not a browser tab that
        // refetches on every focus.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
