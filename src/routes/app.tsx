import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context }) => {
    if (!context.session.user) {
      throw redirect({ to: '/auth', search: { mode: 'signin' } })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
