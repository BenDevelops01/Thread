import { createFileRoute } from '@tanstack/react-router'

import { JournalView } from '@/components/journal/journal-view'
import { journalQuery } from '@/lib/queries/journal'

export const Route = createFileRoute('/app/journal')({
  loader: ({ context }) => context.queryClient.ensureQueryData(journalQuery()),
  component: JournalPage,
})

function JournalPage() {
  return <JournalView />
}
