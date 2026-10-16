import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity, ExternalLink, Loader2, Plug, ScrollText, Sparkles } from 'lucide-react'

import { IntegrationLogo } from '@/components/integration-logos'
import { syncActivity } from '@/server/integrations'
import { Button } from '@/components/ui/button'
import { eventsQuery } from '@/lib/queries/logs'
import { usePremium } from '@/components/premium-gate'
import { cn } from '@/lib/utils'
import type { EventRow } from '@/lib/supabase/types'

const FREE_WINDOW_DAYS = 7
const LAST_SYNC_KEY = 'thread-last-sync'
const SYNC_MIN_INTERVAL_MS = 60_000

function sourceIcon(source: string) {
  switch (source) {
    case 'github':
    case 'vercel':
    case 'supabase':
    case 'linear':
    case 'notion':
      return <IntegrationLogo provider={source} className="h-4 w-4" />
    case 'account':
      return <Activity className="h-4 w-4" />
    default:
      return <ScrollText className="h-4 w-4" />
  }
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function LogsView() {
  const { isPremium } = usePremium()
  const [source, setSource] = useState<string | undefined>(undefined)
  const sinceDays = isPremium ? undefined : FREE_WINDOW_DAYS

  const { data, isLoading } = useQuery(eventsQuery(source, sinceDays))
  const queryClient = useQueryClient()
  const autoSynced = useRef(false)

  // Pull fresh GitHub/Vercel/Supabase events when the view opens, at most once a minute.
  useEffect(() => {
    if (autoSynced.current) return
    autoSynced.current = true
    let last = 0
    try {
      last = Number(window.localStorage.getItem(LAST_SYNC_KEY) || 0)
    } catch {
      // ignore
    }
    if (Date.now() - last < SYNC_MIN_INTERVAL_MS) return
    syncActivity()
      .then((res) => {
        if (res.inserted > 0) void queryClient.invalidateQueries({ queryKey: ['events'] })
        try {
          window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
        } catch {
          // ignore
        }
      })
      .catch(() => {})
  }, [queryClient])

  const grouped = useMemo(() => {
    const groups: { label: string; events: EventRow[] }[] = []
    for (const event of data?.events ?? []) {
      const label = dayLabel(event.occurred_at)
      const last = groups.at(-1)
      if (last && last.label === label) last.events.push(event)
      else groups.push({ label, events: [event] })
    }
    return groups
  }, [data])

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="px-6 py-6">
        <div className="surface flex flex-col items-center px-6 py-16 text-center">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-thread">
            <ScrollText className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold tracking-tight">Nothing logged yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Connect GitHub or Vercel and your commits, PRs and deploys stream in here.
          </p>
          <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-border/60 bg-background/60 px-4 py-2.5 font-mono text-xs text-muted-foreground">
            {`$ thread logs --follow\n→ waiting for events from github, vercel…`}
          </pre>
          <Button asChild className="mt-6">
            <Link to="/app/plugins">
              <Plug className="h-4 w-4" />
              Set up integrations
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-4 py-3 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-thread" />
          thread logs --follow
        </span>
        <span>
          {data.events.length} events · {data.sources.join(' ')}
        </span>
      </div>

      {data.sources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={source === undefined} onClick={() => setSource(undefined)}>
            All
          </FilterChip>
          {data.sources.map((s) => (
            <FilterChip key={s} active={source === s} onClick={() => setSource(s)}>
              {s}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {group.label}
            </h2>
            <ul className="surface divide-y divide-border/60">
              {group.events.map((event) => (
                <li key={event.id} className="flex items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-thread">
                    {sourceIcon(event.source)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-border/70 bg-accent/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {event.source}
                      </span>
                      <p className="text-sm font-medium leading-snug">{event.title}</p>
                    </div>
                    {event.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <time className="font-mono text-xs text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </time>
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-thread"
                        aria-label="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!isPremium && (
        <div className="surface flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-thread">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-48 flex-1">
            <p className="text-sm font-medium">You're seeing the last {FREE_WINDOW_DAYS} days</p>
            <p className="text-xs text-muted-foreground">
              Premium keeps your entire history, forever.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/settings" hash="redeem">
              <Sparkles className="h-4 w-4" />
              Unlock history
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
        active
          ? 'border-thread bg-thread/15 text-thread'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
