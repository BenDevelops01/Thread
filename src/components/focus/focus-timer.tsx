import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ClientOnly } from '@/components/client-only'
import { focusSessionsQuery } from '@/lib/queries/focus'
import { logFocusSession } from '@/server/focus'
import { cn } from '@/lib/utils'

type Mode = 'focus' | 'short' | 'long'

const MODES: { id: Mode; label: string; seconds: number }[] = [
  { id: 'focus', label: 'Focus', seconds: 25 * 60 },
  { id: 'short', label: 'Short break', seconds: 5 * 60 },
  { id: 'long', label: 'Long break', seconds: 15 * 60 },
]

function fmt(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusTimer() {
  const queryClient = useQueryClient()
  const { data: sessions = [] } = useQuery(focusSessionsQuery())
  const [mode, setMode] = useState<Mode>('focus')
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].seconds)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = MODES.find((m) => m.id === mode)!.seconds
  const progress = 1 - secondsLeft / total

  const logMutation = useMutation({
    mutationFn: (vars: { mode: Mode; seconds: number }) =>
      logFocusSession({
        data: { mode: vars.mode, duration_seconds: vars.seconds, completed: true },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })

  const finish = useRef<() => void>(() => {})
  finish.current = () => {
    setRunning(false)
    if (mode === 'focus') {
      logMutation.mutate({ mode, seconds: total })
      toast.success('Focus session complete', { description: 'Take a breath.' })
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus complete', { body: 'Nice work — time for a break.' })
      }
      setRound((r) => (r + 1) % 4)
    } else {
      toast.success('Break over', { description: 'Ready for another round?' })
    }
    const next = mode === 'focus' ? (round % 4 === 0 ? 'long' : 'short') : 'focus'
    setMode(next)
    setSecondsLeft(MODES.find((m) => m.id === next)!.seconds)
  }

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish.current()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  useEffect(() => {
    document.title = running ? `${fmt(secondsLeft)} · Thread` : 'Thread — one calm place to think and ship'
    return () => {
      document.title = 'Thread — one calm place to think and ship'
    }
  }, [running, secondsLeft])

  const todayMinutes = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return Math.round(
      sessions
        .filter((s) => s.mode === 'focus' && new Date(s.started_at).getTime() >= start.getTime())
        .reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    )
  }, [sessions])

  function switchMode(next: Mode) {
    setRunning(false)
    setMode(next)
    setSecondsLeft(MODES.find((m) => m.id === next)!.seconds)
  }

  const R = 120
  const C = 2 * Math.PI * R

  return (
    <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="surface flex flex-col items-center justify-center p-8">
        <div className="mb-8 flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
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
          <Button size="lg" onClick={() => setRunning((r) => !r)} className="px-8">
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => switchMode(mode)} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => finish.current()} title="Skip">
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
