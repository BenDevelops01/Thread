import { createFileRoute } from '@tanstack/react-router'

import { NoteEditor } from '@/components/notes/note-editor'
import { noteQuery } from '@/lib/queries/notes'

export const Route = createFileRoute('/app/notes/$noteId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(noteQuery(params.noteId)),
  component: NoteRoute,
})

function NoteRoute() {
  const { noteId } = Route.useParams()
  return <NoteEditor noteId={noteId} />
}
