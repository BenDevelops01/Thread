import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext } from './integrations/tanstack-query/root-provider'
import { OrbitLoader } from './components/loader'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    // Preload on hover so data is usually already there when you click —
    // the point is that switching tabs should feel instant.
    defaultPreload: 'intent',
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 30_000,
    // Routes (beforeLoad + loader) stay fresh for a while, so hopping between
    // tabs doesn't re-run them every time. Session/data freshness is handled
    // explicitly by react-query invalidation on auth + mutations.
    defaultStaleTime: 30_000,
    // Only surface the pending spinner if a switch is genuinely slow, and
    // don't pad it with an artificial minimum once it appears.
    defaultPendingMs: 400,
    defaultPendingMinMs: 200,
    defaultPendingComponent: () => (
      <div className="grid min-h-[50vh] w-full place-items-center">
        <OrbitLoader size={140} />
      </div>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
