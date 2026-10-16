export const PRIORITIES = [
  { value: 'none', label: 'No priority', color: 'var(--muted-foreground)' },
  { value: 'low', label: 'Low', color: 'var(--moss)' },
  { value: 'medium', label: 'Medium', color: 'var(--thread)' },
  { value: 'high', label: 'High', color: 'var(--ember)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--destructive)' },
] as const

export type Priority = (typeof PRIORITIES)[number]['value']

export function priorityMeta(value: string) {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[0]
}

export function formatDue(value: string | null): { label: string; overdue: boolean } {
  if (!value) return { label: '', overdue: false }
  const date = new Date(value)
  const now = new Date()
  const dueDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diff = Math.round((dueDay - todayDay) / 86_400_000)

  const overdue = dueDay < todayDay
  if (diff === 0) return { label: 'Today', overdue: false }
  if (diff === 1) return { label: 'Tomorrow', overdue: false }
  if (diff === -1) return { label: 'Yesterday', overdue: true }
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    overdue,
  }
}
