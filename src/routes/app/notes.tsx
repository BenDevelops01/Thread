import { Outlet, createFileRoute } from '@tanstack/react-router'

import { NotesPane } from '@/components/notes/notes-pane'
import { notesQuery } from '@/lib/queries/notes'

export const Route = createFileRoute('/app/notes')({
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQuery()),
  component: NotesLayout,
})

function NotesLayout() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <NotesPane />
      <div className="flex min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
