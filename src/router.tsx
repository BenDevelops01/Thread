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
    defaultPreload: 'intent',
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 10_000,
    defaultPendingComponent: () => (
      <div className="grid min-h-[50vh] w-full place-items-center">
        <OrbitLoader size={140} />
      </div>
    ),
    defaultPendingMs: 200,
    defaultPendingMinMs: 450,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
