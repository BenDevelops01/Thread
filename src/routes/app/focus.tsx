import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/page-header'
import { FocusTimer } from '@/components/focus/focus-timer'
import { focusSessionsQuery } from '@/lib/queries/focus'

export const Route = createFileRoute('/app/focus')({
  loader: ({ context }) => context.queryClient.ensureQueryData(focusSessionsQuery()),
  component: FocusPage,
})

function FocusPage() {
  return (
    <>
      <PageHeader
        title="Focus"
        description="Pomodoro cycles that log themselves into your activity."
      />
      <FocusTimer />
    </>
  )
}
