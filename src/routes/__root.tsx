import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  Outlet as RootOutlet,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from 'sonner'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { AppLoader, NavProgress } from '@/components/loader'
import type { SessionPayload } from '@/server/auth'
import { sessionQuery } from '@/lib/queries/session'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { THEME_INIT_SCRIPT, isAppPath, themeById } from '@/lib/themes'
import { ACTIVITY_COLOR_INIT_SCRIPT } from '@/lib/activity-color'

import type { ErrorComponentProps } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      ...sessionQuery(),
      // Cached navigation stays instant; a stale session (premium redeem,
      // sign-in/out, profile edit) still gets refreshed in the background.
      revalidateIfStale: true,
    })
    return { session } satisfies { session: SessionPayload }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Thread — one calm place to think and ship' },
      {
        name: 'description',
        content:
          'Thread is an all-in-one workspace: notes, tasks, journal, focus and GitHub-style activity — fast, calm and simple.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/apple-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
        media: 'print',
      },
    ],
  }),
  shellComponent: Shell,
  errorComponent: RootError,
})

function RootDocument({
  children,
  savedTheme,
}: {
  children: React.ReactNode
  savedTheme?: string | null
}) {
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { session } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const initialTheme = savedTheme ?? session.profile?.theme
  const themeEnabled = isAppPath(pathname)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Drop the cached session so the next `beforeLoad` refetches it, then
      // invalidate the router so the redirect guards pick up the new state.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: ['session'] })
        void router.invalidate()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [router, queryClient])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: ACTIVITY_COLOR_INIT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.querySelector('link[href*="fonts.googleapis.com"]');if(!l)return;function on(){l.media='all';}try{if(l.sheet){on();return;}}catch(e){}l.addEventListener('load',on);setTimeout(on,1500);})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider savedTheme={initialTheme} themeEnabled={themeEnabled}>
          <TooltipProvider delayDuration={200}>
            {children}
            <ThemedToaster />
          </TooltipProvider>
        </ThemeProvider>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
              TanStackQueryDevtools,
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

function Shell() {
  return (
    <>
      <AppLoader />
      <NavProgress />
      <noscript>
        <style>{'.app-loader{display:none!important;visibility:hidden!important;pointer-events:none!important}'}</style>
      </noscript>
      <RootDocument>
        <RootOutlet />
      </RootDocument>
    </>
  )
}

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-center" theme={themeById(theme).family} />
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something broke in the thread</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => {
            void router.invalidate()
            reset()
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
