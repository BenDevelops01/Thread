import { useQuery } from '@tanstack/react-query'

import { useReminders } from '@/hooks/use-reminders'
import { boardQuery } from '@/lib/queries/tasks'

/**
 * Runs task reminders for the whole workspace instead of only while the Tasks
 * board happens to be mounted. The board query is cached, so this costs one
 * shared fetch rather than one per page.
 */
export function RemindersProvider() {
  const { data } = useQuery(boardQuery())
  useReminders(data?.tasks ?? [])
  return null
}
