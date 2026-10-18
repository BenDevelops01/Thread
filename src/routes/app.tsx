import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'
import { RemindersProvider } from '@/components/reminders-provider'
import { FocusTimerProvider } from '@/components/focus/timer-provider'
import { SoundscapeProvider } from '@/components/soundscapes/soundscape-provider'

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context }) => {
    if (!context.session.user) {
      throw redirect({ to: '/auth', search: { mode: 'signin' } })
    }
  },
  component: AppLayout,
})

/**
 * The app layout persists across every `/app/*` tab, so these providers are
 * the backbone of the "runs in the background" behaviour: the focus timer,
 * the soundscape engine and task reminders all live here and survive tab
 * switches.
 */
function AppLayout() {
  return (
    <FocusTimerProvider>
      <SoundscapeProvider>
        <RemindersProvider />
        <AppShell>
          <Outlet />
        </AppShell>
      </SoundscapeProvider>
    </FocusTimerProvider>
  )
}
