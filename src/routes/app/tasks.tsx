import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/page-header'
import { TaskBoard } from '@/components/tasks/board'
import { boardQuery } from '@/lib/queries/tasks'

export const Route = createFileRoute('/app/tasks')({
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQuery()),
  component: TasksPage,
})

function TasksPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <PageHeader
        title="Tasks"
        description="Drag between columns. Set priorities, due dates and reminders."
      />
      <div className="min-h-0 flex-1">
        <TaskBoard />
      </div>
    </div>
  )
}
