import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ClientOnly } from '@/components/client-only'
import { focusSessionsQuery } from '@/lib/queries/focus'
import {
  MODES,
  fmt,
  useFocusTimer,
} from '@/components/focus/timer-provider'
import { cn } from '@/lib/utils'

import type { FocusMode } from '@/components/focus/timer-provider'

export function FocusTimer() {
  const { data: sessions = [] } = useQuery(focusSessionsQuery())
  const {
    mode,
    running,
    secondsLeft,
    progress,
    round,
    toggle,
    reset,
    switchMode,
    skip,
  } = useFocusTimer()

  const todayMinutes = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return Math.round(
      sessions
        .filter((s) => s.mode === 'focus' && new Date(s.started_at).getTime() >= start.getTime())
        .reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    )
  }, [sessions])

  const R = 120
  const C = 2 * Math.PI * R

  return (
    <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="surface flex flex-col items-center justify-center p-8">
        <div className="mb-8 flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id as FocusMode)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm transition-colors',
                mode === m.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="relative grid place-items-center">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={mode === 'focus' ? 'var(--thread)' : 'var(--moss)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="mono text-5xl font-semibold tabular-nums">{fmt(secondsLeft)}</span>
            <span className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              {mode === 'focus' ? `Round ${round} of 4` : 'Break'}
            </span>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" onClick={toggle} className="px-8">
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" size="icon" onClick={reset} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={skip} title="Skip">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-thread">
            <Timer className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-2xl font-semibold tracking-tight">
              <ClientOnly fallback="0m">{() => `${todayMinutes}m`}</ClientOnly>
            </span>
            <span className="block text-xs text-muted-foreground">Focused today</span>
          </span>
        </div>

        <div className="surface p-5">
          <h2 className="mb-4 font-semibold tracking-tight">Recent sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet. Finish a focus round to log it.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  {s.mode === 'focus' ? (
                    <Timer className="h-4 w-4 text-thread" />
                  ) : (
                    <Coffee className="h-4 w-4 text-moss" />
                  )}
                  <span className="capitalize text-muted-foreground">{s.mode}</span>
                  <span className="mono ml-auto">{Math.round(s.duration_seconds / 60)}m</span>
                  <span className="text-xs text-muted-foreground">
                    <ClientOnly fallback="—">
                      {() =>
                        new Date(s.started_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      }
                    </ClientOnly>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
