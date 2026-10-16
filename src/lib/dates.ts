const LOCALE = 'en-US'

/** Parse a `YYYY-MM-DD` day key as UTC midnight so getters are timezone-stable. */
export function parseYmd(day: string): Date {
  return new Date(`${day}T00:00:00Z`)
}

/** `YYYY-MM-DD` for a date, in UTC. */
export function ymdUTC(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** "Oct 15" from a `YYYY-MM-DD` key. */
export function shortMonth(day: string): string {
  return parseYmd(day).toLocaleDateString(LOCALE, { month: 'short', timeZone: 'UTC' })
}

/** "Thu, Oct 15" from a `YYYY-MM-DD` key. */
export function weekdayShortDate(day: string): string {
  return parseYmd(day).toLocaleDateString(LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "Thursday, Oct 15" from an ISO timestamp. */
export function weekdayLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "Oct 15" from an ISO timestamp. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Today / Yesterday / "Thu, Oct 15" from a `YYYY-MM-DD` key (UTC-stable). */
export function relativeDay(day: string): string {
  const today = ymdUTC()
  const yesterday = ymdUTC(new Date(Date.now() - 86_400_000))
  if (day === today) return 'Today'
  if (day === yesterday) return 'Yesterday'
  return weekdayShortDate(day)
}
