import { createFileRoute } from '@tanstack/react-router'
import { NotebookPen } from 'lucide-react'

import { EmptyState } from '@/components/empty-state'

export const Route = createFileRoute('/app/notes/')({
  component: NotesEmpty,
})

function NotesEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<NotebookPen className="h-5 w-5" />}
        title="Select a note"
        description="Pick a note from the list, or create a new one to start writing."
        className="w-full max-w-md border-0"
      />
    </div>
  )
}
